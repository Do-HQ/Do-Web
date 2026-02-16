import { Skeleton } from "../ui/skeleton";

const WorkspaceCardSkeleton = () => {
  return (
    <div className="border rounded-lg p-4 gap-4 flex items-center justify-between">
      <div className="flex items-center gap-4">
        <div className="hidden sm:flex -space-x-2">
          <Skeleton className="h-10 w-10 rounded-full" />
        </div>

        <div className="flex flex-col gap-2">
          <Skeleton className="h-4 w-40" />
          <Skeleton className="h-3 w-28" />
        </div>
      </div>

      <Skeleton className="h-8 w-28 rounded-md" />
    </div>
  );
};

export default WorkspaceCardSkeleton