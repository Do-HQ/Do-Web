import { Loader } from "lucide-react";
import { cn } from "@/lib/utils";

type LoaderComponentProps = {
  className?: string;
  size?: number;
};

const LoaderComponent = ({ className, size = 16 }: LoaderComponentProps) => {
  return (
    <div className={cn("flex w-full items-center justify-center py-4", className)}>
      <Loader className="animate-spin" size={size} />
    </div>
  );
};

export default LoaderComponent;
