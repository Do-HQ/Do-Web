"use client";

import JoinWorkspaceModal from "@/components/modals/join-workspace";
import PaginationComp from "@/components/shared/pagination";
import { Button } from "@/components/ui/button";
import {
  InputGroup,
  InputGroupAddon,
  InputGroupInput,
} from "@/components/ui/input-group";
import { H2, P } from "@/components/ui/typography";
import WorkspaceCard from "@/components/workspace/workspace-card";
import useWorkspace from "@/hooks/use-workspace";
import { ROUTES } from "@/utils/constants";
import { Plus, Search } from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";
import { useDebounce } from "@/hooks/use-debounce";
import EmptyComp from "../shared/empty";
import { WorkspaceType } from "@/types/workspace";
import useAuthStore from "@/stores/auth";
import WorkspaceCardSkeleton from "./workspace-card-skeleton";

const JoinWorkspace = () => {
  // States
  const [page, setPage] = useState(1);
  const [showJoinModal, setShowJoinModal] = useState(false);
  const [selectedWorkspaceId, setSelectedWorkspaceId] = useState<string | null>(
    null,
  );

  // Store
  const { user } = useAuthStore();

  // Router
  const router = useRouter();
  const searchParams = useSearchParams();
  const search = searchParams.get("search");

  // Utils
  const debouncedSearch = useDebounce(search, 500);

  // Hooks
  const { usePublicWorkspace } = useWorkspace();
  const { isPending, data } = usePublicWorkspace({
    search: debouncedSearch!,
    page,
    limit: 5,
  });

  // Handlers
  const handleSearchChange = (value: string) => {
    const params = new URLSearchParams(searchParams.toString());
    params.set("search", value);
    router.push(`?${params.toString()}`);
  };

  // Utils
  const workspaces = data?.data?.workspaces;
  const pagination = data?.data?.pagination;

  // Handlers
  const handleCreateWorkspace = () => {
    router.push(ROUTES.CREATE_WORKSPACE);
  };

  return (
    <section className="max-w-200 mx-auto flex flex-col gap-6">
      <div className="flex max-sm:flex-wrap items-center my-2 gap-4 lg:gap-10">
        <div className="w-full">
          <H2>Join a Workspace</H2>
          <P className="text-muted-foreground">
            Join a public workspace and start collaborating with colleagues
          </P>
        </div>

        <Button size="sm" onClick={handleCreateWorkspace}>
          <Plus />
          Create Workspace
        </Button>
      </div>

      <InputGroup className="">
        <InputGroupInput
          placeholder="Search..."
          value={search!}
          onChange={(e) => handleSearchChange(e?.target?.value)}
        />
        <InputGroupAddon>
          <Search />
        </InputGroupAddon>
        <InputGroupAddon align="inline-end">
          {workspaces?.length} results
        </InputGroupAddon>
      </InputGroup>

      <div className="w-full">
        <div className="flex flex-col gap-2">
          {isPending ? (
            <>
              {[...Array(2)].map((_, i) => (
                <WorkspaceCardSkeleton key={i} />
              ))}
              <div className="mt-7 h-10" />
            </>
          ) : (workspaces as WorkspaceType[])?.length < 1 ? (
            <EmptyComp
              header="Your workspace journey starts here"
              description="No workspaces found. Create or join a workspace to start managing your projects and collaborating with your team."
              button={{
                cta: "Create a workspace",
                action: () => {
                  router.push(ROUTES.CREATE_WORKSPACE);
                },
              }}
              image="https://res.cloudinary.com/dgiropjpp/image/upload/v1770288832/Real_Estate_and_Architecture___home_house_shelter_security_comfort_safety_2x_wniwm8.png"
            />
          ) : (
            workspaces?.map((workspace, i) => {
              const userWorkspaces = user?.workspaces?.map(
                (d) => d?.workspaceId?._id,
              );
              const disabled = userWorkspaces?.includes(workspace?._id);

              return (
                <WorkspaceCard
                  key={i}
                  onRequestJoin={(id) => {
                    setShowJoinModal(true);
                    setSelectedWorkspaceId(id!);
                  }}
                  data={workspace}
                  disabled={disabled}
                />
              );
            })
          )}
        </div>
      </div>

      {(workspaces as WorkspaceType[])?.length > 0 && (
        <PaginationComp
          currentPage={page}
          pages={pagination?.totalPages ?? 1}
          onPageChange={setPage}
          hasNextPage={!!pagination?.hasNextPage}
          hasPrevPage={!!pagination?.hasPrevPage}
        />
      )}
      <JoinWorkspaceModal
        open={showJoinModal}
        onOpenChange={(open) => setShowJoinModal(open)}
        selectedWorkspaceId={selectedWorkspaceId}
      />
    </section>
  );
};

export default JoinWorkspace;
