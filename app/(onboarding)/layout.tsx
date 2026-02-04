"use client";

import LogoutModal from "@/components/modals/logout";
import { Button } from "@/components/ui/button";
import { Toaster } from "@/components/ui/sonner";
import { P } from "@/components/ui/typography";
import RequireAuth from "@/middleware";
import useAuthStore from "@/stores/auth";
import React, { useState } from "react";

const OnboardingLayout = ({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) => {
  // Store
  const { user } = useAuthStore();

  // States
  const [showLogoutModal, setShowLogoutModal] = useState(false);

  return (
    <RequireAuth>
      <main className="min-h-screen w-screen flex flex-col gap-4 p-8 relative">
        <header className="flex items-center justify-between sticky top-0 z-3">
          <div className="flex flex-col gap-1 ml-auto">
            <P className="text-muted-foreground">Logged in as:</P>
            <P className="font-semibold">{user?.email || "No user email"}</P>
          </div>
        </header>
        <section className="flex flex-col items-start justify-center flex-1">
          {children}
        </section>
        <div className="flex items-center justify-end">
          <Button variant="ghost" onClick={() => setShowLogoutModal(true)}>
            Logout
          </Button>
        </div>
      </main>

      <LogoutModal onOpenChange={setShowLogoutModal} open={showLogoutModal} />
      <Toaster position="top-right" />
    </RequireAuth>
  );
};

export default OnboardingLayout;
