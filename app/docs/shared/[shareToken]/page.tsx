import type { Metadata } from "next";

import SharedDocView from "@/components/docs/shared-doc-view";
import { WorkspaceDocRecord } from "@/types/doc";

export const dynamic = "force-dynamic";
export const revalidate = 0;

const DEFAULT_OG_IMAGE =
  "https://res.cloudinary.com/dgiropjpp/image/upload/v1774470169/Logo_maker_project-2_1_2_wh3vxm.png";

type SharedDocApiResponse = {
  message?: string;
  doc?: WorkspaceDocRecord;
};

type SharedDocPageProps = {
  params: Promise<{ shareToken: string }> | { shareToken: string };
};

function extractText(value: unknown): string {
  if (typeof value === "string") {
    return value;
  }

  if (Array.isArray(value)) {
    return value.map((item) => extractText(item)).join(" ").trim();
  }

  if (value && typeof value === "object") {
    const candidate = value as Record<string, unknown>;
    return [
      extractText(candidate.title),
      extractText(candidate.text),
      extractText(candidate.content),
      extractText(candidate.value),
      extractText(candidate.caption),
    ]
      .filter(Boolean)
      .join(" ")
      .trim();
  }

  return "";
}

async function fetchSharedDoc(shareToken: string): Promise<WorkspaceDocRecord | null> {
  const apiBaseUrl = String(
    process.env.NEXT_PUBLIC_API_BASE_URL || process.env.API_BASE_URL || "",
  ).trim();

  if (!apiBaseUrl || !shareToken) {
    return null;
  }

  try {
    const endpoint = `${apiBaseUrl}/public/docs/share/${encodeURIComponent(shareToken)}`;
    const response = await fetch(endpoint, {
      cache: "no-store",
    });

    if (!response.ok) {
      return null;
    }

    const payload = (await response.json()) as SharedDocApiResponse;
    return payload?.doc || null;
  } catch {
    return null;
  }
}

export async function generateMetadata({
  params,
}: SharedDocPageProps): Promise<Metadata> {
  const resolvedParams = await params;
  const shareToken = decodeURIComponent(String(resolvedParams.shareToken || ""));
  const doc = await fetchSharedDoc(shareToken);

  const title = doc?.title?.trim()
    ? `${doc.title} | Shared Doc | Squircle`
    : "Shared Doc | Squircle";
  const previewTextRaw = doc?.summary?.trim()
    ? doc.summary
    : extractText(doc?.content || []);
  const description = (
    previewTextRaw ||
    "Open this shared document on Squircle."
  )
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 200);
  const urlPath = `/docs/shared/${encodeURIComponent(shareToken)}`;

  return {
    title,
    description,
    openGraph: {
      title,
      description,
      type: "article",
      url: urlPath,
      siteName: "Squircle",
      images: [
        {
          url: DEFAULT_OG_IMAGE,
          width: 1200,
          height: 630,
          alt: doc?.title?.trim()
            ? `${doc.title} shared document`
            : "Squircle shared document",
        },
      ],
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      images: [DEFAULT_OG_IMAGE],
    },
  };
}

export default async function SharedDocPage({ params }: SharedDocPageProps) {
  const resolvedParams = await params;
  const shareToken = decodeURIComponent(String(resolvedParams.shareToken || ""));

  return <SharedDocView shareToken={shareToken} />;
}
