import { Button } from "@/components/ui/button";
import { P } from "@/components/ui/typography";
import React from "react";

const OnboardingLayout = ({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) => {
  return (
    <main className="min-h-screen w-screen flex flex-col gap-4 p-8 relative">
      <header className="flex items-center justify-between sticky top-0 z-3">
        <div className="flex flex-col gap-1 ml-auto">
          <P className="text-muted-foreground">Logged in as:</P>
          <P className="font-semibold">useremail@gmail.com</P>
        </div>
      </header>
      <section className="flex flex-col items-start justify-center flex-1">
        {children}
      </section>
      <div className="flex items-center justify-end">
        <Button variant="ghost">Logout</Button>
      </div>
    </main>
  );
};

export default OnboardingLayout;
