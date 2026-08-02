import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import "@excalidraw/excalidraw/index.css";
import ReactQueryContextProvider from "@/lib/context/queryClient";
import { ThemeProvider } from "next-themes";
import { TooltipProvider } from "@/components/ui/tooltip";
import { PrivacyConsentBanner } from "@/components/shared/privacy-consent-banner";
import { PwaRegister } from "@/components/shared/pwa-register";

const DEFAULT_PREVIEW_IMAGE =
  "https://res.cloudinary.com/dgiropjpp/image/upload/v1774470169/Logo_maker_project-2_1_2_wh3vxm.png";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  metadataBase: new URL("https://squircle.live"),

  title: {
    default: "Squircle – AI Project Management & Team Collaboration Workspace",
    template: "%s | Squircle",
  },

  description:
    "Squircle is an AI-powered project management and team collaboration platform that helps teams plan projects, manage tasks, track progress, collaborate in real time, and organize work in one workspace.",

  keywords: [
    "AI workspace",
    "AI project management",
    "task management",
    "project planning",
    "project tracker",
    "kanban",
    "team collaboration",
    "project workspace",
    "project dashboard",
    "team productivity",
    "startup workspace",
    "remote work",
    "knowledge management",
    "notes",
    "project documentation",
    "AI assistant",
    "work management",
  ],

  authors: [{ name: "Squircle Team", url: "https://squircle.live" }],
  category: "productivity",
  openGraph: {
    title: "Squircle – Where Teams Turn Ideas into Action",
    description:
      "Capture ideas, build plans, collaborate in real-time, and switch workspaces effortlessly. The productivity platform built for modern teams.",
    url: "https://squircle.live",
    siteName: "Squircle",
    images: [
      {
        url: DEFAULT_PREVIEW_IMAGE,
        width: 1200,
        height: 630,
        alt: "Squircle – Modern workspace & productivity platform",
        type: "image/png",
      },
    ],
    locale: "en_US",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Squircle – Where Teams Turn Ideas into Action",
    description:
      "Capture ideas, build plans, collaborate in real-time, and switch workspaces effortlessly.",
    images: [DEFAULT_PREVIEW_IMAGE],
    site: "@squircle",
    creator: "@squircle",
  },
  icons: {
    icon: "/images/favicon.ico",
    shortcut: "/images/favicon-32x32.png",
    apple: "/images/apple-touch-icon.png",
  },

  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-video-preview": -1,
      "max-image-preview": "large",
      "max-snippet": -1,
    },
  },
  appleWebApp: {
    capable: true,
    title: "Squircle",
    statusBarStyle: "default",
  },
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#ffffff" },
    { media: "(prefers-color-scheme: dark)", color: "#0a0a0a" },
  ],
  alternates: {
    canonical: "https://squircle.live",
  },
  applicationName: "Squircle",
  generator: "Next.js",
  referrer: "origin-when-cross-origin",
  formatDetection: {
    telephone: false,
    email: false,
    address: false,
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <link
          rel="apple-touch-icon"
          sizes="180x180"
          href="/images/apple-touch-icon.png"
        />
        <link
          rel="icon"
          type="image/png"
          sizes="32x32"
          href="/images/favicon-32x32.png"
        />
        <link
          rel="icon"
          type="image/png"
          sizes="16x16"
          href="/images/favicon-16x16.png"
        />

        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify({
              "@context": "https://schema.org",
              "@type": "SoftwareApplication",
              name: "Squircle",
              applicationCategory: "BusinessApplication",
              operatingSystem: "Web",
              url: "https://squircle.live",
              description:
                "AI-powered project management and team collaboration platform.",
              offers: {
                "@type": "Offer",
                price: "0",
                priceCurrency: "USD",
              },
            }),
          }}
        />
      </head>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        <ReactQueryContextProvider>
          <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
            <TooltipProvider>
              {children}
              <PrivacyConsentBanner />
              <PwaRegister />
            </TooltipProvider>
          </ThemeProvider>
        </ReactQueryContextProvider>
      </body>
    </html>
  );
}
