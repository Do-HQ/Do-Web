import type { Metadata } from "next";

import SharedDocView from "@/components/docs/shared-doc-view";
import { WorkspaceDocRecord } from "@/types/doc";

const DEFAULT_OG_IMAGE =
  "https://res.cloudinary.com/dgiropjpp/image/upload/v1769595973/Logo_maker_project-1_kh0vdk.png";
const IMAGE_EXT_PATTERN =
  /\.(png|jpe?g|gif|webp|avif|bmp|svg)(?:\?.*)?$/i;

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

function isLikelyImageUrl(value: unknown): value is string {
  if (typeof value !== "string") {
    return false;
  }

  const normalized = value.trim();
  if (!normalized) {
    return false;
  }

  if (normalized.startsWith("blob:")) {
    return false;
  }

  if (normalized.startsWith("data:image/")) {
    return true;
  }

  if (!/^https?:\/\//i.test(normalized)) {
    return false;
  }

  return (
    IMAGE_EXT_PATTERN.test(normalized) || normalized.includes("/image/upload/")
  );
}

function extractFirstImageUrl(value: unknown): string | null {
  if (isLikelyImageUrl(value)) {
    return value.trim();
  }

  if (Array.isArray(value)) {
    for (const item of value) {
      const found = extractFirstImageUrl(item);
      if (found) {
        return found;
      }
    }
    return null;
  }

  if (!value || typeof value !== "object") {
    return null;
  }

  const node = value as Record<string, unknown>;

  // Prefer explicit image block payloads first.
  if (
    typeof node.type === "string" &&
    node.type.toLowerCase().includes("image")
  ) {
    const directCandidates = [
      node.url,
      node.src,
      node.href,
      node.image,
      node.file,
      node.content,
    ];

    for (const candidate of directCandidates) {
      const found = extractFirstImageUrl(candidate);
      if (found) {
        return found;
      }
    }

    if (node.props && typeof node.props === "object") {
      const props = node.props as Record<string, unknown>;
      const propCandidates = [
        props.url,
        props.src,
        props.href,
        props.image,
        props.file,
      ];

      for (const candidate of propCandidates) {
        const found = extractFirstImageUrl(candidate);
        if (found) {
          return found;
        }
      }
    }
  }

  for (const candidate of Object.values(node)) {
    const found = extractFirstImageUrl(candidate);
    if (found) {
      return found;
    }
  }

  return null;
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
  const ogImage = extractFirstImageUrl(doc?.content || []) || DEFAULT_OG_IMAGE;
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
          url: ogImage,
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
      images: [ogImage],
    },
  };
}

export default async function SharedDocPage({ params }: SharedDocPageProps) {
  const resolvedParams = await params;
  const shareToken = decodeURIComponent(String(resolvedParams.shareToken || ""));

  return <SharedDocView shareToken={shareToken} />;
}
