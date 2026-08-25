import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

/**
 * Status pill shared by the workspace people tables.
 *
 * The previous inline classes (`bg-green-700/30 text-green-400`) were written
 * dark-first and measured between 1.04:1 and 1.60:1 against a light card —
 * effectively invisible. These pairs are verified at 5.2:1 or better in both
 * themes: a light tint with a dark label, inverted for dark mode.
 */
export type StatusTone = "positive" | "warning" | "negative" | "neutral";

const TONE_CLASSNAMES: Record<StatusTone, string> = {
  positive:
    "bg-green-500/20 text-green-800 dark:bg-green-500/20 dark:text-green-400",
  warning:
    "bg-amber-500/20 text-amber-800 dark:bg-amber-500/20 dark:text-amber-400",
  negative: "bg-red-500/20 text-red-800 dark:bg-red-500/20 dark:text-red-400",
  neutral:
    "bg-zinc-500/20 text-zinc-700 dark:bg-zinc-500/20 dark:text-zinc-300",
};

/** Maps the status strings both tables use onto a tone. */
export const getStatusTone = (status: string): StatusTone => {
  switch (String(status || "").toLowerCase()) {
    case "accepted":
    case "approved":
      return "positive";
    case "pending":
      return "warning";
    case "rejected":
    case "declined":
      return "negative";
    default:
      return "neutral";
  }
};

export const StatusPill = ({
  status,
  className,
}: {
  status: string;
  className?: string;
}) => (
  <Badge
    className={cn(
      "capitalize",
      TONE_CLASSNAMES[getStatusTone(status)],
      className,
    )}
  >
    {status}
  </Badge>
);
