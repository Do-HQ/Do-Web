export const createMessageId = () => {
  if (typeof crypto !== "undefined" && crypto.randomUUID) {
    return crypto.randomUUID();
  }

  return `msg_${Math.random().toString(36).slice(2, 11)}`;
};

export const truncateText = (value: string, max = 120) => {
  const compact = String(value || "").replace(/\s+/g, " ").trim();
  if (compact.length <= max) {
    return compact;
  }

  return `${compact.slice(0, Math.max(0, max - 1))}…`;
};

export const buildQuoteBlock = (value: string) => {
  const lines = String(value || "")
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean)
    .slice(0, 8)
    .map((line) => `> ${line}`);

  if (!lines.length) {
    return "";
  }

  return `${lines.join("\n")}\n\n`;
};

const REPORT_MENTION_PATTERN = /#\[([^\]]+)\]\(([a-f\d]{24})\)/gi;
const LEGACY_REPORT_TOKEN_PATTERN = /#report-([a-f\d]{24})/gi;

export const extractReferencedReportIds = (value: string) => {
  const ids = new Set<string>();
  const input = String(value || "");
  let match: RegExpExecArray | null = REPORT_MENTION_PATTERN.exec(input);

  while (match) {
    const reportId = String(match[2] || "").trim();
    if (reportId) {
      ids.add(reportId);
    }
    match = REPORT_MENTION_PATTERN.exec(input);
  }

  let legacyMatch: RegExpExecArray | null = LEGACY_REPORT_TOKEN_PATTERN.exec(input);
  while (legacyMatch) {
    const reportId = String(legacyMatch[1] || "").trim();
    if (reportId) {
      ids.add(reportId);
    }
    legacyMatch = LEGACY_REPORT_TOKEN_PATTERN.exec(input);
  }

  REPORT_MENTION_PATTERN.lastIndex = 0;
  LEGACY_REPORT_TOKEN_PATTERN.lastIndex = 0;
  return Array.from(ids);
};

export const toPlainComposerText = (value: string) => {
  const normalized = String(value || "").replace(
    REPORT_MENTION_PATTERN,
    (_token, display: string) => `#${String(display || "").trim()}`,
  );
  REPORT_MENTION_PATTERN.lastIndex = 0;
  return normalized;
};
