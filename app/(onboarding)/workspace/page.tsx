import JoinWorkspace from "@/components/workspace";
import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Join a Workspace",
  description:
    "Browse public workspaces and request access to collaborate with teams and contributors.",
};

const JoinWorkspacePage = () => {
  return <JoinWorkspace />;
};

export default JoinWorkspacePage;
