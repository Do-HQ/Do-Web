import LoaderComponent from "@/components/shared/loader";
import JoinWorkspace from "@/components/workspace";
import { Metadata } from "next";
import { Suspense } from "react";

export const metadata: Metadata = {
  title: "Join a Workspace",
  description:
    "Browse public workspaces and request access to collaborate with teams and contributors.",
};

const JoinWorkspacePage = () => {
  return (
    <Suspense fallback={<LoaderComponent />}>
      <JoinWorkspace />
    </Suspense>
  );
};

export default JoinWorkspacePage;
