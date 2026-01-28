"use client";

import Logo from "@/components/shared/logo";
import { Toaster } from "@/components/ui/sonner";
import Link from "next/link";

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <>
      <main className="min-h-screen flex flex-col items-center justify-center px-4">
        <div className="w-full max-w-sm flex flex-col flex-1 justify-center space-y-2 ">
          <div className="flex justify-center mb-4">
            <Logo isFull />
          </div>

          {children}
        </div>

        <p className="text-xs text-muted-foreground text-center mb-6">
          By continuing, you agree to the{" "}
          <Link href="#" className="underline hover:text-foreground">
            Terms of Service
          </Link>{" "}
          and{" "}
          <Link href="#" className="underline hover:text-foreground">
            Privacy Policy
          </Link>
          .
        </p>
        <Toaster position="top-right" />
      </main>
    </>
  );
}
