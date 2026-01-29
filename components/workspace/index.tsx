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
import { ROUTES } from "@/utils/constants";
import { Plus, Search } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";

const JoinWorkspace = () => {
  // States
  const [page, setPage] = useState(1);
  const [showJoinModal, setShowJoinModal] = useState(false);

  // Router
  const router = useRouter();

  // Handlers
  const handleCreateWorkspace = () => {
    router.push(ROUTES.CREATE_WORKSPACE);
  };

  return (
    <section className="max-w-200 mx-auto flex flex-col gap-6">
      <div className="flex items-center gap-10">
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
        <InputGroupInput placeholder="Search..." />
        <InputGroupAddon>
          <Search />
        </InputGroupAddon>
        <InputGroupAddon align="inline-end">12 results</InputGroupAddon>
      </InputGroup>

      <div className="w-full">
        <div
          className="
flex flex-col gap-2
      "
        >
          {[...Array(5)].map((_, i) => (
            <WorkspaceCard
              key={i}
              onRequestJoin={() => setShowJoinModal(true)}
            />
          ))}
        </div>
      </div>

      <PaginationComp currentPage={page} pages={10} onPageChange={setPage} />
      <JoinWorkspaceModal
        open={showJoinModal}
        onOpenChange={(open) => setShowJoinModal(open)}
      />
    </section>
  );
};

export default JoinWorkspace;
