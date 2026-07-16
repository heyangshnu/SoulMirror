/** Clean agent-host markdown / note titles for user-facing UI. */
export function formatDisplaySummary(raw?: string | null, maxLen = 72): string {
  if (!raw?.trim()) return '';

  let text = raw.replace(/^---[\s\S]*?---\s*/m, '').trim();

  const section = text.match(
    /##\s*(Summary|摘要|概述|一句话|当前状态)\s*\n([\s\S]*?)(?=\n##\s|$)/i,
  )?.[2];
  if (section?.trim()) text = section.trim();

  text = text
    .replace(/^#+\s*/gm, '')
    .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')
    .replace(/[*_`>~]/g, '')
    .replace(/\s+/g, ' ')
    .trim();

  // Skip internal receipt / path noise
  if (
    text.length < 48 &&
    /(执行回执|receipt|chart_asset|L0_模型|mcp__|_prompt|B\d{2}\b)/i.test(text)
  ) {
    return '';
  }

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
