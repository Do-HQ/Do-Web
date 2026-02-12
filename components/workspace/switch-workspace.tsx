"use client";

import PaginationComp from "@/components/shared/pagination";
import { Button } from "@/components/ui/button";
import {
  InputGroup,
  InputGroupAddon,
  InputGroupInput,
} from "@/components/ui/input-group";
import { H2, P } from "@/components/ui/typography";
import useWorkspace from "@/hooks/use-workspace";
import { ROUTES } from "@/utils/constants";
import { Search, Telescope } from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";
import LoaderComponent from "@/components/shared/loader";
import { useDebounce } from "@/hooks/use-debounce";
import EmptyComp from "@/components/shared/empty";
import { WorkspaceType } from "@/types/workspace";
import useWorkspaceStore from "@/stores/workspace";
import { useQueryClient } from "@tanstack/react-query";
import WorkspaceSwitchCard from "./workspace-switch-card";
import useAuthStore from "@/stores/auth";
import WorkspaceCardSkeleton from "./workspace-card-skeleton";

const SwitchWorkspace = () => {
  // States
  const [page, setPage] = useState(1);

  //   Store
  const { setWorkspaceId } = useWorkspaceStore();
  const { user } = useAuthStore();

  // Router
  const router = useRouter();
  const searchParams = useSearchParams();
  const search = searchParams.get("search");

  // Utils
  const debouncedSearch = useDebounce(search, 500);

  // Query
  const queryClient = useQueryClient();

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
    <section className="max-w-150 mx-auto flex flex-col gap-6">
      <div className="flex max-sm:flex-wrap items-center my-2 gap-6 lg:gap-10">
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
              const disabled = user?.currentWorkspaceId?._id === workspace?._id;
              return (
                <WorkspaceSwitchCard
                  key={i}
                  onRequestJoin={(id) => {
                    handleSwitchWorkspace(id!);
                  }}
                  data={workspace}
                  loading={
                    variables?.workspaceId === workspace?._id &&
                    isSwitchingWorkspace
                  }
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
    </section>
  );
};

export default SwitchWorkspace;
