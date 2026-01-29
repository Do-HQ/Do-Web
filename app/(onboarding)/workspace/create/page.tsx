import CreateWorkspace from "@/components/workspace/create-workspace";
import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Create a Workspace | Squircle",
  description:
    "Create a new workspace to collaborate with your team, manage projects, and control who can join.",
};

const CreateWorkspacePage = () => {
  return <CreateWorkspace />;
};

export default CreateWorkspacePage;
