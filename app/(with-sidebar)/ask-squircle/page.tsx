import { redirect } from "next/navigation";

import { ROUTES } from "@/utils/constants";

const AskSquirclePage = () => {
  redirect(ROUTES.DASHBOARD);
};

export default AskSquirclePage;
