"use client";

import { useEffect, useState, type ReactNode } from "react";
import { createPortal } from "react-dom";

type AppHeaderSlotProps = {
  targetId: string;
  children: ReactNode;
};

export function AppHeaderSlot({ targetId, children }: AppHeaderSlotProps) {
  const [target, setTarget] = useState<HTMLElement | null>(null);

  useEffect(() => {
    setTarget(document.getElementById(targetId));
  }, [targetId]);

  if (!target) {
    return null;
  }

  return createPortal(children, target);
}
