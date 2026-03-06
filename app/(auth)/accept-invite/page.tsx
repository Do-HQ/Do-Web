import { Suspense } from "react";

import LoaderComponent from "@/components/shared/loader";

import AcceptInviteClient from "./accept-invite-client";

export default function AcceptInvitePage() {
  return (
    <Suspense fallback={<LoaderComponent />}>
      <AcceptInviteClient />
    </Suspense>
  );
}
