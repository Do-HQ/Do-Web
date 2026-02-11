import { useState, useCallback } from "react";
import useError from "./use-error";
import { AxiosError } from "axios";

export const useCopyToClipboard = (resetDelay = 2000) => {
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  //   Hooks
  const { handleError } = useError();

  const copy = useCallback(
    async (value: string) => {
      try {
        if (!navigator?.clipboard) {
          throw new Error("Clipboard not supported");
        }

        await navigator.clipboard.writeText(value);
        setCopied(true);
        setError(null);

        if (resetDelay) {
          setTimeout(() => setCopied(false), resetDelay);
        }
      } catch (err) {
        setCopied(false);
        setError(err as Error);
        handleError(err as AxiosError);
      }
    },
    [resetDelay],
  );

  return {
    copy,
    copied,
    error,
  };
};
