"use client";

import { Toaster } from "@/components/ui/sonner";

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <>
      <main>
        {children}
        <Toaster position="top-right" />
      </main>
    </>
  );
}
