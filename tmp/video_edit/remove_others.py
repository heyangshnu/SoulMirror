#!/usr/bin/env python3
"""Remove all people except two children from video, inpainting background."""

import argparse
import sys
from pathlib import Path

import cv2
import numpy as np
from ultralytics import YOLO


def find_children_to_keep(detections, frame_w: int, frame_h: int):
    """Pick the two children: closest pair in center-lower region."""
    persons = []
    for det in detections:
        if det.boxes is None or len(det.boxes) == 0:
            continue
        for i in range(len(det.boxes)):
            cls = int(det.boxes.cls[i])
            if cls != 0:  # person class
                continue
            conf = float(det.boxes.conf[i])
            if conf < 0.35:
                continue
            x1, y1, x2, y2 = det.boxes.xyxy[i].cpu().numpy()
            cx, cy = (x1 + x2) / 2, (y1 + y2) / 2
            h, w = y2 - y1, x2 - x1
            area = h * w
            # Prefer center-lower area (children walking toward camera)
            center_score = 1.0 - abs(cx - frame_w * 0.5) / (frame_w * 0.5)
            lower_score = cy / frame_h
            score = center_score * 0.6 + lower_score * 0.4
            persons.append(
                {
                    "idx": i,
                    "cx": cx,
                    "cy": cy,
                    "h": h,
                    "w": w,
                    "area": area,
                    "score": score,
                    "box": (x1, y1, x2, y2),
                }
            )

    if len(persons) < 2:
        return set()

    # Find pair with minimum distance that are both reasonably centered
    best_pair = None
    best_dist = float("inf")
    for i in range(len(persons)):
        for j in range(i + 1, len(persons)):
            p1, p2 = persons[i], persons[j]
            dist = abs(p1["cx"] - p2["cx"]) + abs(p1["cy"] - p2["cy"]) * 0.3
            # Children are close together horizontally
            h_dist = abs(p1["cx"] - p2["cx"])
            if h_dist > frame_w * 0.35:
                continue
            avg_score = (p1["score"] + p2["score"]) / 2
            combined = dist - avg_score * 200
            if combined < best_dist:
                best_dist = combined
                best_pair = (p1["idx"], p2["idx"])

    if best_pair is None:
        # Fallback: two smallest-area persons in center half
        center_persons = [p for p in persons if abs(p["cx"] - frame_w * 0.5) < frame_w * 0.35]
        center_persons.sort(key=lambda p: p["area"])
        if len(center_persons) >= 2:
            return {center_persons[0]["idx"], center_persons[1]["idx"]}
        persons.sort(key=lambda p: p["area"])
        return {persons[0]["idx"], persons[1]["idx"]} if len(persons) >= 2 else set()

    return set(best_pair)


def build_remove_mask(result, keep_indices: set, frame_shape, dilate_px: int = 12):
    """Build mask of people to remove (everyone except keep_indices)."""
    h, w = frame_shape[:2]
    mask = np.zeros((h, w), dtype=np.uint8)

    if result.masks is None:
        # Fallback to bounding boxes
        for i in range(len(result.boxes)):
            if i in keep_indices:
                continue
            cls = int(result.boxes.cls[i])
            if cls != 0:
                continue
            x1, y1, x2, y2 = result.boxes.xyxy[i].cpu().numpy().astype(int)
            mask[y1:y2, x1:x2] = 255
    else:
        for i in range(len(result.boxes)):
            if i in keep_indices:
                continue
            cls = int(result.boxes.cls[i])
            if cls != 0:
                continue
            seg = result.masks.data[i].cpu().numpy()
            seg_resized = cv2.resize(seg, (w, h), interpolation=cv2.INTER_NEAREST)
            mask[seg_resized > 0.5] = 255

    if dilate_px > 0:
        kernel = cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (dilate_px, dilate_px))
        mask = cv2.dilate(mask, kernel, iterations=1)
    return mask


def inpaint_frame(frame, mask, radius: int = 5):
    """Inpaint masked regions preserving background."""
    if mask.max() == 0:
        return frame
    return cv2.inpaint(frame, mask, radius, cv2.INPAINT_TELEA)


def process_video(input_path: str, output_path: str, preview_frame: int | None = None):
    model = YOLO("yolo11n-seg.pt")

    cap = cv2.VideoCapture(input_path)
    if not cap.isOpened():
        print(f"Cannot open {input_path}", file=sys.stderr)
        sys.exit(1)

    fps = cap.get(cv2.CAP_PROP_FPS)
    w = int(cap.get(cv2.CAP_PROP_FRAME_WIDTH))
    h = int(cap.get(cv2.CAP_PROP_FRAME_HEIGHT))
    total = int(cap.get(cv2.CAP_PROP_FRAME_COUNT))

    if preview_frame is not None:
        cap.set(cv2.CAP_PROP_POS_FRAMES, preview_frame)
        ret, frame = cap.read()
        if not ret:
            print("Preview frame read failed")
            sys.exit(1)
        results = model(frame, verbose=False)
        keep = find_children_to_keep(results, w, h)
        mask = build_remove_mask(results[0], keep, frame.shape)
        out = inpaint_frame(frame, mask)
        preview_dir = Path(output_path).parent
        cv2.imwrite(str(preview_dir / "preview_original.jpg"), frame)
        cv2.imwrite(str(preview_dir / "preview_mask.jpg"), mask)
        cv2.imwrite(str(preview_dir / "preview_result.jpg"), out)
        print(f"Preview saved. Keep indices: {keep}, persons detected: {len(results[0].boxes)}")
        cap.release()
        return

    fourcc = cv2.VideoWriter_fourcc(*"mp4v")
    writer = cv2.VideoWriter(output_path, fourcc, fps, (w, h))

    frame_idx = 0
    prev_keep = None
    while True:
        ret, frame = cap.read()
        if not ret:
            break

        results = model(frame, verbose=False)
        keep = find_children_to_keep(results, w, h)
        if len(keep) < 2 and prev_keep is not None:
            keep = prev_keep
        elif len(keep) >= 2:
            prev_keep = keep

        mask = build_remove_mask(results[0], keep, frame.shape)
        out = inpaint_frame(frame, mask)
        writer.write(out)

        frame_idx += 1
        if frame_idx % 30 == 0:
            print(f"Processed {frame_idx}/{total} frames...", flush=True)

    cap.release()
    writer.release()
    print(f"Done. Output: {output_path}")


if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument("input")
    parser.add_argument("output")
    parser.add_argument("--preview", type=int, default=None, help="Preview single frame index")
    args = parser.parse_args()
    process_video(args.input, args.output, args.preview)
