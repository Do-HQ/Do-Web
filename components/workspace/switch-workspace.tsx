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
import { ArrowRightLeft, Plus, Search, Telescope } from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";
import LoaderComponent from "@/components/shared/loader";
import { useDebounce } from "@/hooks/use-debounce";
import EmptyComp from "@/components/shared/empty";
import { WorkspaceType } from "@/types/workspace";
import useWorkspaceStore from "@/stores/workspace";
import { useQueryClient } from "@tanstack/react-query";

const SwitchWorkspace = () => {
  // States
  const [page, setPage] = useState(1);

  const queryClient = useQueryClient();

  //   Store
  const { setWorkspaceId } = useWorkspaceStore();

  // Router
  const router = useRouter();
  const searchParams = useSearchParams();
  const search = searchParams.get("search");

  // Utils
  const debouncedSearch = useDebounce(search, 1000);

  // Hooks
  const { useUsersWorkSpace, useSwitchWorkspace } = useWorkspace();
  const { isPending, data } = useUsersWorkSpace({
    search: debouncedSearch!,
    page,
    limit: 5,
  });
  const {
    isPending: isSwitchingWorkspace,
    mutate: switchWorkspace,
    variables,
  } = useSwitchWorkspace({
    onSuccess(data) {
      setWorkspaceId(data?.data?.workspace?._id);
      queryClient.invalidateQueries({
        queryKey: ["user"],
      });
      router.push(ROUTES.DASHBOARD);
    },
  });

  const handleSwitchWorkspace = (workspaceId: string) => {
    switchWorkspace({ workspaceId });
  };

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
  const handleExploreWorkspace = () => {
    router.push(ROUTES.WORKSPACE);
  };

  return (
    <section className="max-w-200 mx-auto flex flex-col gap-6">
      <div className="flex items-center gap-10">
        <div className="w-full">
          <H2>Switch Workspaces</H2>
          <P className="text-muted-foreground">
            Select one of your workspaces to continue working with your team and
            projects.
          </P>
        </div>

        <Button size="sm" onClick={handleExploreWorkspace}>
          <Telescope />
          Explore workspaces
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
            <LoaderComponent />
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
              image="https://res.cloudinary.com/dgiropjpp/image/upload/v1770206460/Adventure_and_Exploration___adventure_exploration_discovery_obstacles_challenge_2x_vsdue8.png"
            />
          ) : (
            workspaces?.map((workspace, i) => (
              <WorkspaceCard
                key={i}
                onRequestJoin={(id) => {
                  handleSwitchWorkspace(id!);
                }}
                data={workspace}
                loading={
                  variables?.workspaceId === workspace?._id &&
                  isSwitchingWorkspace
                }
                buttonCta="Switch"
                icon={<ArrowRightLeft />}
              />
            ))
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
    </section>
  );
};

export default SwitchWorkspace;
