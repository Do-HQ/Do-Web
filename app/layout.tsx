import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import ReactQueryContextProvider from "@/lib/context/queryClient";
import { ThemeProvider } from "next-themes";

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
    default: "Squircle – Where Teams Turn Ideas into Action",
    template: "%s | Squircle",
  },

  description:
    "Squircle is the modern workspace platform that helps teams capture ideas, create actionable plans, collaborate in real time, and get work done — seamlessly switch between personal and team spaces.",

  keywords: [
    "workspace",
    "productivity",
    "team collaboration",
    "project management",
    "remote work",
    "ideas to plans",
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
        url: "https://res.cloudinary.com/dgiropjpp/image/upload/v1769595973/Logo_maker_project-1_kh0vdk.png",
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
    images: [
      "https://res.cloudinary.com/dgiropjpp/image/upload/v1769595973/Logo_maker_project-1_kh0vdk.png",
    ],
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
  // verification: {
  //   google: "your-google-verification-code",
  // },
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
        <link rel="manifest" href="/images/site.webmanifest"></link>
      </head>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        <ReactQueryContextProvider>
          <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
            {children}
          </ThemeProvider>
        </ReactQueryContextProvider>
      </body>
    </html>
  );
}
