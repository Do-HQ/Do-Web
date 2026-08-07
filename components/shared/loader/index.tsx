"use client";

import { cn } from "@/lib/utils";
import { ThinkingOrb } from "thinking-orbs";

type LoaderComponentProps = {
  className?: string;
  size?: number;
};

const LoaderComponent = ({ className, size = 16 }: LoaderComponentProps) => {
  return (
    <div
      className={cn(
        "flex w-full items-center justify-center py-4 md:py-20",
        className,
      )}
    >
      <ThinkingOrb state="connecting" size={20} speed={1.75} />
    </div>
  );
};

export default LoaderComponent;
