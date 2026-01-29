import { ROUTES } from "@/utils/constants";
import { redirect } from "next/navigation";

export default function Home() {
  return <div>{redirect(ROUTES.DASHBOARD)}</div>;
}
