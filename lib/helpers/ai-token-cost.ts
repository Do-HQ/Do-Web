const FEATURE_RANGES = {
  SCRIBE_CHAT: { min: 50, base: 90, max: 150 },
  SCRIBE_CHAT_STREAM: { min: 50, base: 90, max: 150 },
  SCRIBE_ONESHOT: { min: 50, base: 90, max: 150 },
  AI_DRAFT: { min: 200, base: 320, max: 500 },
  REPORT_GENERATION: { min: 500, base: 900, max: 2000 },
  SUMMARY: { min: 100, base: 180, max: 300 },
  RISK_DETECTION: { min: 300, base: 500, max: 800 },
  TASK_GENERATION: { min: 200, base: 320, max: 500 },
} as const;

type AiTokenFeature = keyof typeof FEATURE_RANGES;

const DEFAULT_RANGE = { min: 120, base: 220, max: 400 };

const toInt = (value: unknown, fallback = 0) => {
  const parsed = Number.parseInt(String(value ?? ""), 10);
  if (!Number.isFinite(parsed)) {
    return fallback;
  }

  return parsed;
};

const clamp = (value: number, min: number, max: number) =>
  Math.min(max, Math.max(min, value));

export const estimateAiTokenCost = ({
  feature,
  prompt = "",
  contextMessages = 0,
  payloadSize = 0,
}: {
  feature: AiTokenFeature | string;
  prompt?: string;
  contextMessages?: number;
  payloadSize?: number;
}) => {
  const normalizedFeature = String(feature || "").trim().toUpperCase();
  const range =
    FEATURE_RANGES[normalizedFeature as AiTokenFeature] || DEFAULT_RANGE;

  const promptCost = Math.ceil(String(prompt || "").trim().length / 22);
  const contextCost = Math.max(0, toInt(contextMessages, 0)) * 8;
  const payloadCost = Math.ceil(Math.max(0, toInt(payloadSize, 0)) / 90);
  const estimate = range.base + promptCost + contextCost + payloadCost;

  return clamp(estimate, range.min, range.max);
};

export const AI_DEFAULT_ESTIMATED_COSTS = {
  scribeMessage: FEATURE_RANGES.SCRIBE_CHAT.base,
  aiDraft: FEATURE_RANGES.AI_DRAFT.base,
  reportGeneration: FEATURE_RANGES.REPORT_GENERATION.base,
} as const;

