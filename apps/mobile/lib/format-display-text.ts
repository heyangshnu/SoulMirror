/** Clean agent-host markdown / note titles for user-facing UI. */

const NOISE_RE =
  /(执行回执|receipt|chart_asset|L0_模型|mcp__|_prompt|pending_confirmation|B\d{2}\b|status:|updated_at:)/i;

const SECTION_NAMES =
  'Summary|摘要|概述|一句话|当前状态|Observations|Insights|Next Steps|History|洞察|下一步|历史';

function stripMarkdownNoise(raw: string): string {
  return raw
    .replace(/^---[\s\S]*?---\s*/m, '')
    .replace(/```[\s\S]*?```/g, ' ')
    .replace(/`[^`]+`/g, ' ')
    .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')
    .replace(/\*\*/g, '')
    .replace(/\*/g, '')
    .replace(new RegExp(`##\\s*(${SECTION_NAMES})\\b:?`, 'gi'), ' ')
    .replace(/#{1,6}\s*/g, ' ')
    .replace(new RegExp(`\\b(${SECTION_NAMES})\\b:?`, 'gi'), ' ')
    .replace(/[\w.\u4e00-\u9fff_-]+\/[\w.\u4e00-\u9fff/_-]+\.(md|json|txt)\b/gi, ' ')
    .replace(/\b\d{2}_[\u4e00-\u9fffA-Za-z]+(?:\/[\w.\u4e00-\u9fff_-]+)*/g, ' ')
    .replace(/[_~|>]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

export function formatDisplaySummary(raw?: string | null, maxLen = 72): string {
  if (!raw?.trim()) return '';

  let text = raw.replace(/^---[\s\S]*?---\s*/m, '').trim();

  // Prefer Summary section even when heading is inline
  const section = text.match(
    new RegExp(
      `##\\s*(Summary|摘要|概述|一句话|当前状态)\\s*\\*?\\*?\\s*([\\s\\S]*?)(?=\\n##\\s|##\\s|$)`,
      'i',
    ),
  )?.[2];
  if (section?.trim()) text = section.trim();

  text = stripMarkdownNoise(text);
  text = text.replace(/^(本命总解|八字气候|紫微格局|一生命势)[：:\s]*/u, '').trim();

  if (!text) return '';
  if (NOISE_RE.test(text) && text.length < 100) return '';

  if (text.length > maxLen) return `${text.slice(0, maxLen).trimEnd()}…`;
  return text;
}

export function formatNoteTitle(raw?: string | null): string {
  if (!raw?.trim()) return '';
  return formatDisplaySummary(
    raw
      .replace(/__/g, '/')
      .replace(/^0[1-5]_[\u4e00-\u9fff]+\//, '')
      .replace(/\.md$/i, '')
      .replace(/_/g, ' '),
    48,
  );
}

/** Prepare long report markdown for readable mobile rendering. */
export function prepareReportMarkdown(raw?: string | null, pageTitle?: string): string {
  if (!raw?.trim()) return '';

  let text = raw.replace(/\r\n?/g, '\n').replace(/^---[\s\S]*?---\s*/m, '').trim();

  // Unwrap bold markers early so headings/titles parse cleanly
  text = text.replace(/\*\*/g, '').replace(/\*/g, '');

  // Break inline markdown headings onto their own lines
  text = text.replace(/([^\n])\s*(#{1,3})\s+/g, '$1\n\n$2 ').replace(/\n{3,}/g, '\n\n').trim();

  // Drop English meta section labels (even when glued to body text)
  text = text.replace(
    new RegExp(`^#+\\s*(Summary|Observations|Insights|Next Steps|History)\\s*`, 'gim'),
    '',
  );

  if (pageTitle?.trim()) {
    const escaped = pageTitle.trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    text = text
      .replace(new RegExp(`^#{0,3}\\s*${escaped}\\s*`, 'mu'), '')
      .replace(new RegExp(`^${escaped}\\s*`, 'mu'), '')
      .trim();
  }

  text = text.replace(/\n{3,}/g, '\n\n').trim();

  // If still effectively one wall of text, split by Chinese punctuation
  const paragraphs = text
    .split(/\n{2,}/)
    .map((p) => p.trim())
    .filter(Boolean);
  const structurallyBroken =
    paragraphs.length > 1 || paragraphs.some((p) => /^#{1,3}\s/.test(p) || /^[-*•]\s/.test(p));

  if (!structurallyBroken && text.replace(/\s+/g, '').length > 100) {
    const sentences = text.replace(/\n+/g, '').split(/(?<=[。！？；])\s*/).filter(Boolean);
    const chunks: string[] = [];
    let buf = '';
    for (const s of sentences) {
      if ((buf + s).length > 90 && buf) {
        chunks.push(buf.trim());
        buf = s;
      } else {
        buf += s;
      }
    }
    if (buf.trim()) chunks.push(buf.trim());
    text = chunks.join('\n\n');
  }

  return text.trim();
}
