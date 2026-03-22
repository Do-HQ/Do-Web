import type { Metadata } from "next";

import SharedDocView from "@/components/docs/shared-doc-view";
import { WorkspaceDocRecord } from "@/types/doc";

export const dynamic = "force-dynamic";
export const revalidate = 0;

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
    return false;
  }

  if (!/^https?:\/\//i.test(normalized)) {
    return false;
  }

  try {
    const parsed = new URL(normalized);
    const hostname = parsed.hostname.toLowerCase();

    if (
      hostname === "localhost" ||
      hostname === "127.0.0.1" ||
      hostname === "0.0.0.0"
    ) {
      return false;
    }

    return (
      IMAGE_EXT_PATTERN.test(normalized) ||
      normalized.includes("/image/upload/") ||
      normalized.includes("images.unsplash.com") ||
      normalized.includes("googleusercontent.com")
    );
  } catch {
    return false;
  }
}

function extractFirstImageFromBlocks(value: unknown): string | null {
  if (!Array.isArray(value)) {
    return null;
  }

  for (const item of value) {
    if (!item || typeof item !== "object") {
      continue;
    }

    const block = item as Record<string, unknown>;
    const blockType = String(block.type || "").toLowerCase();

    if (blockType.includes("image") || blockType === "file") {
      const props =
        block.props && typeof block.props === "object"
          ? (block.props as Record<string, unknown>)
          : {};

      const candidates = [
        props.url,
        props.src,
        props.previewUrl,
        props.preview,
        props.image,
        props.file,
        block.url,
        block.src,
        block.href,
      ];

      for (const candidate of candidates) {
        if (isLikelyImageUrl(candidate)) {
          return String(candidate).trim();
        }
      }
    }

    const nestedCandidates = [block.children, block.content];
    for (const nested of nestedCandidates) {
      const found = extractFirstImageFromBlocks(nested);
      if (found) {
        return found;
      }
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
  const firstDocImage = extractFirstImageFromBlocks(doc?.content || []);
  const imageCandidates = [firstDocImage, DEFAULT_OG_IMAGE].filter(
    (value, index, self): value is string =>
      Boolean(value) && self.indexOf(value) === index,
  );
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
      images: imageCandidates.map((url) => ({
        url,
        width: 1200,
        height: 630,
        alt: doc?.title?.trim()
          ? `${doc.title} shared document`
          : "Squircle shared document",
      })),
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      images: imageCandidates,
    },
  };
}

export default async function SharedDocPage({ params }: SharedDocPageProps) {
  const resolvedParams = await params;
  const shareToken = decodeURIComponent(String(resolvedParams.shareToken || ""));

  return <SharedDocView shareToken={shareToken} />;
}
