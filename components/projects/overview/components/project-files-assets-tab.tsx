"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import {
  BookOpen,
  Cloud,
  Code2,
  Copy,
  Download,
  Eye,
  ExternalLink,
  FileText,
  Image as ImageIcon,
  MoreHorizontal,
  RefreshCcw,
  SearchX,
  Send,
  Trash2,
  Upload,
  Video,
} from "lucide-react";
import { toast } from "sonner";
import { useQuery } from "@tanstack/react-query";

import { useProjectStore } from "@/stores";
import useWorkspaceStore from "@/stores/workspace";
import useWorkspaceProject from "@/hooks/use-workspace-project";
import useWorkspaceGoogleDrive from "@/hooks/use-workspace-google-drive";
import useWorkspaceDoc from "@/hooks/use-workspace-doc";
import useWorkspaceSpace from "@/hooks/use-workspace-space";
import useFile from "@/hooks/use-file";
import type { CustomFile } from "@/types/file";
import type { WorkspaceDocRecord } from "@/types/doc";
import type { WorkspaceGoogleDriveFileRecord } from "@/types/integration";
import type { WorkspaceSpaceRoomRecord } from "@/types/space";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
} from "@/components/ui/empty";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

import {
  ProjectAsset,
  ProjectAssetType,
  ProjectMember,
  ProjectOverviewRecord,
} from "../types";
import LoaderComponent from "@/components/shared/loader";
import Image from "next/image";

const OFFICE_EMBED_EXTENSIONS = new Set([
  "doc",
  "docx",
  "ppt",
  "pptx",
  "xls",
  "xlsx",
  "odt",
  "ods",
  "odp",
  "rtf",
]);

const TEXT_PREVIEW_EXTENSIONS = new Set([
  "txt",
  "md",
  "json",
  "csv",
  "log",
  "js",
  "jsx",
  "ts",
  "tsx",
  "css",
  "html",
  "xml",
  "yml",
  "yaml",
]);

function getExtensionFromValue(value?: string) {
  const withoutQuery = String(value || "")
    .split("?")[0]
    .split("#")[0]
    .trim();
  const parts = withoutQuery.toLowerCase().split(".");
  return parts.length > 1 ? parts[parts.length - 1] : "";
}

function getAssetExtension(asset: ProjectAsset) {
  return (
    getExtensionFromValue(asset.name) ||
    getExtensionFromValue(asset.externalDownloadUrl) ||
    getExtensionFromValue(asset.url) ||
    getExtensionFromValue(asset.externalViewUrl)
  );
}

function isInternalDocsRoute(url?: string) {
  const normalized = String(url || "").trim();
  if (!normalized) {
    return false;
  }

  try {
    return new URL(normalized, "http://squircle.local").pathname.startsWith(
      "/docs",
    );
  } catch {
    return normalized.startsWith("/docs");
  }
}

function getWorkspaceDocIdFromUrl(url?: string) {
  const normalized = String(url || "").trim();
  if (!normalized) {
    return "";
  }

  let pathname = normalized;
  try {
    pathname = new URL(normalized, "http://squircle.local").pathname;
  } catch {
    pathname = normalized;
  }

  const match = pathname.match(/^\/docs\/([^/?#]+)/);
  const docId = match?.[1] ? decodeURIComponent(match[1]) : "";
  return docId && docId !== "shared" ? docId : "";
}

function getWorkspaceDocIdFromAsset(asset: ProjectAsset) {
  return (
    String(asset.docId || "").trim() ||
    getWorkspaceDocIdFromUrl(asset.url) ||
    getWorkspaceDocIdFromUrl(asset.externalViewUrl)
  );
}

function getAssetOpenUrl(asset: ProjectAsset) {
  const workspaceDocId = getWorkspaceDocIdFromAsset(asset);
  if (workspaceDocId) {
    return `/docs/${workspaceDocId}`;
  }

  return (
    String(asset.externalViewUrl || "").trim() ||
    String(asset.url || "").trim() ||
    String(asset.externalDownloadUrl || "").trim()
  );
}

function getAssetDownloadUrl(asset: ProjectAsset) {
  if (isWorkspaceDocAsset(asset)) {
    return getAssetOpenUrl(asset);
  }

  return (
    String(asset.externalDownloadUrl || "").trim() ||
    String(asset.url || "").trim() ||
    String(asset.externalViewUrl || "").trim()
  );
}

function getAbsoluteAssetUrl(asset: ProjectAsset) {
  const rawUrl = getAssetOpenUrl(asset);
  if (!rawUrl) {
    return "";
  }

  if (/^https?:\/\//i.test(rawUrl)) {
    return rawUrl;
  }

  if (typeof window === "undefined") {
    return rawUrl;
  }

  try {
    return new URL(rawUrl, window.location.origin).toString();
  } catch {
    return rawUrl;
  }
}

function getRoomLabel(room: WorkspaceSpaceRoomRecord) {
  const scope = String(room.scope || "").trim();
  const visibility = String(room.visibility || "").trim();
  return [scope, visibility].filter(Boolean).join(" • ");
}

function isOfficePreviewAsset(asset: ProjectAsset) {
  const extension = getAssetExtension(asset);
  return OFFICE_EMBED_EXTENSIONS.has(extension);
}

function isPdfAsset(asset: ProjectAsset) {
  const mimeType = String(asset.mimeType || "").toLowerCase();
  return mimeType.includes("pdf") || getAssetExtension(asset) === "pdf";
}

function isTextPreviewAsset(asset: ProjectAsset) {
  if (
    isWorkspaceDocAsset(asset) ||
    isPdfAsset(asset) ||
    isInternalDocsRoute(asset.url)
  ) {
    return false;
  }

  const mimeType = String(asset.mimeType || "").toLowerCase();

  if (
    mimeType.startsWith("text/") ||
    mimeType.includes("json") ||
    mimeType.includes("javascript") ||
    mimeType.includes("xml")
  ) {
    return true;
  }

  return TEXT_PREVIEW_EXTENSIONS.has(getAssetExtension(asset));
}

function isWorkspaceDocAsset(asset: ProjectAsset) {
  return (
    asset.source === "workspace-doc" ||
    Boolean(asset.docId) ||
    asset.mimeType === "text/x-squircle-doc" ||
    asset.folder === "workspace-docs" ||
    Boolean(getWorkspaceDocIdFromAsset(asset))
  );
}

function getOfficePreviewUrl(url: string) {
  return (
    "https://view.officeapps.live.com/op/embed.aspx?src=" +
    encodeURIComponent(url)
  );
}

function inferAssetType(
  mimeType?: string,
  resourceType?: string,
): ProjectAssetType {
  const normalizedMime = String(mimeType || "").toLowerCase();
  const normalizedResource = String(resourceType || "").toLowerCase();

  if (normalizedMime.startsWith("image/") || normalizedResource === "image") {
    return "Image";
  }

  if (normalizedMime.startsWith("video/") || normalizedResource === "video") {
    return "Video";
  }

  if (
    normalizedMime.includes("javascript") ||
    normalizedMime.includes("typescript") ||
    normalizedMime.includes("json") ||
    normalizedMime.includes("xml") ||
    normalizedMime.includes("html") ||
    normalizedMime.includes("css") ||
    normalizedMime.startsWith("text/")
  ) {
    return "Code";
  }

  return "Document";
}

function inferAssetTypeFromDriveMime(mimeType?: string): ProjectAssetType {
  const normalizedMime = String(mimeType || "").toLowerCase();

  if (normalizedMime.startsWith("image/")) {
    return "Image";
  }

  if (normalizedMime.startsWith("video/")) {
    return "Video";
  }

  if (
    normalizedMime.includes("javascript") ||
    normalizedMime.includes("typescript") ||
    normalizedMime.includes("json") ||
    normalizedMime.includes("xml") ||
    normalizedMime.includes("html") ||
    normalizedMime.includes("css") ||
    normalizedMime.startsWith("text/")
  ) {
    return "Code";
  }

  return "Document";
}

function formatUploadDateLabel(value?: string | null) {
  if (!value) {
    return "Just now";
  }

  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    return "Just now";
  }

  return parsed.toLocaleString();
}

function formatAssetFileSize(rawSize?: number | string) {
  const size = typeof rawSize === "number" ? rawSize : Number(rawSize || 0);

  if (!Number.isFinite(size) || size <= 0) {
    return "Unknown size";
  }

  if (size < 1024) {
    return `${size} B`;
  }

  const units = ["KB", "MB", "GB"];
  let value = size / 1024;
  let unitIndex = 0;

  while (value >= 1024 && unitIndex < units.length - 1) {
    value /= 1024;
    unitIndex += 1;
  }

  return `${value.toFixed(value >= 100 ? 0 : value >= 10 ? 1 : 2)} ${units[unitIndex]}`;
}

function getAssetIcon(type: ProjectAssetType) {
  if (type === "Image") {
    return ImageIcon;
  }

  if (type === "Video") {
    return Video;
  }

  if (type === "Code") {
    return Code2;
  }

  return FileText;
}

function getBlockPlainText(value: unknown): string {
  if (typeof value === "string") {
    return value;
  }

  if (typeof value === "number" || typeof value === "boolean") {
    return String(value);
  }

  if (Array.isArray(value)) {
    return value.map((entry) => getBlockPlainText(entry)).join(" ");
  }

  if (!value || typeof value !== "object") {
    return "";
  }

  const record = value as Record<string, unknown>;
  return [record.text, record.content, record.children]
    .map((entry) => getBlockPlainText(entry))
    .join(" ");
}

function getWorkspaceDocPreviewRows(content: unknown[]) {
  const rows: Array<{ id: string; type: string; text: string; depth: number }> =
    [];

  const walk = (blocks: unknown[], depth = 0) => {
    blocks.forEach((block, index) => {
      if (!block || typeof block !== "object") {
        return;
      }

      const record = block as Record<string, unknown>;
      const text = getBlockPlainText(record.content).trim();
      const type = String(record.type || "paragraph").trim();

      if (text) {
        rows.push({
          id: String(record.id || `${depth}-${index}`),
          type,
          text,
          depth,
        });
      }

      if (Array.isArray(record.children) && record.children.length) {
        walk(record.children, depth + 1);
      }
    });
  };

  walk(Array.isArray(content) ? content : []);
  return rows;
}

function getLinkedTaskOptions(project: ProjectOverviewRecord) {
  return project.workflows.flatMap((workflow) =>
    workflow.tasks.map((task) => ({
      id: task.id,
      title: task.title,
    })),
  );
}

type ProjectFilesAssetsTabProps = {
  project: ProjectOverviewRecord;
  members: ProjectMember[];
};

type AssetPreviewPanelProps = {
  asset: ProjectAsset;
  onDownload: (asset: ProjectAsset) => void;
};

function AssetPreviewPanel({ asset, onDownload }: AssetPreviewPanelProps) {
  const { workspaceId } = useWorkspaceStore();
  const workspaceDocHook = useWorkspaceDoc();
  const workspaceDocId = getWorkspaceDocIdFromAsset(asset);
  const workspaceDocDetailQuery = workspaceDocHook.useWorkspaceDocDetail(
    workspaceId || "",
    workspaceDocId,
    {
      enabled: Boolean(
        workspaceId && workspaceDocId && isWorkspaceDocAsset(asset),
      ),
    },
  );
  const shouldLoadTextPreview = Boolean(asset.url && isTextPreviewAsset(asset));
  const textPreviewQuery = useQuery({
    queryKey: ["project-asset-text-preview", asset.id, asset.url],
    enabled: shouldLoadTextPreview,
    staleTime: 60_000,
    queryFn: async () => {
      const response = await fetch(asset.url as string);

      if (!response.ok) {
        throw new Error("Could not load file content.");
      }

      const contentType = String(response.headers.get("content-type") || "")
        .toLowerCase()
        .trim();
      if (
        contentType.includes("text/html") &&
        getAssetExtension(asset) !== "html"
      ) {
        throw new Error("This file opens in its own viewer.");
      }

      const content = await response.text();
      return content.slice(0, 150_000);
    },
  });

  if (isWorkspaceDocAsset(asset)) {
    const workspaceDoc = workspaceDocDetailQuery.data?.data?.doc;
    const previewRows = getWorkspaceDocPreviewRows(workspaceDoc?.content || []);
    const openHref = workspaceDocId
      ? `/docs/${workspaceDocId}`
      : String(asset.url || "");

    if (
      workspaceDocId &&
      (workspaceDocDetailQuery.isLoading || workspaceDocDetailQuery.isFetching)
    ) {
      return (
        <div className="flex h-[72vh] items-center justify-center rounded-lg border border-border/20 bg-background">
          <LoaderComponent />
        </div>
      );
    }

    return (
      <div className="h-[72vh] overflow-auto rounded-lg border border-border/20 bg-background">
        <div className="border-b border-border/20 px-4 py-3">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <div className="flex items-center gap-2 text-[11px] text-muted-foreground">
                <BookOpen className="size-3.5" />
                Workspace doc
              </div>
              <div className="mt-1 truncate text-[15px] font-semibold">
                {workspaceDoc?.title || asset.name}
              </div>
              {workspaceDoc?.summary || asset.summary ? (
                <div className="text-muted-foreground mt-1 text-[12px] leading-5">
                  {workspaceDoc?.summary || asset.summary}
                </div>
              ) : null}
            </div>
            {openHref ? (
              <a href={openHref} target="_blank" rel="noreferrer">
                <Button type="button" variant="outline" size="sm">
                  <ExternalLink />
                  Open
                </Button>
              </a>
            ) : null}
          </div>
        </div>

        {previewRows.length ? (
          <div className="space-y-2 px-5 py-4">
            {previewRows.map((row) => (
              <div
                key={row.id}
                className="text-[13px] leading-6 text-foreground"
                style={{ paddingLeft: `${Math.min(row.depth, 3) * 14}px` }}
              >
                {row.type.includes("heading") ? (
                  <div className="pt-1 text-[15px] font-semibold">
                    {row.text}
                  </div>
                ) : row.type.includes("bullet") ||
                  row.type.includes("number") ? (
                  <div className="flex gap-2">
                    <span className="text-muted-foreground">•</span>
                    <span>{row.text}</span>
                  </div>
                ) : (
                  <p>{row.text}</p>
                )}
              </div>
            ))}
          </div>
        ) : (
          <div className="flex h-[52vh] items-center justify-center px-6 text-center">
            <div className="mx-auto max-w-md">
              <div className="mx-auto flex size-11 items-center justify-center rounded-lg bg-muted">
                <BookOpen className="size-5 text-primary" />
              </div>
              <div className="mt-3 text-[14px] font-semibold">
                Preview unavailable here
              </div>
              <div className="text-muted-foreground mt-1 text-[12px] leading-5">
                Open this workspace doc to read or edit it in the full Docs
                workspace.
              </div>
            </div>
          </div>
        )}
      </div>
    );
  }

  if (asset.url && isPdfAsset(asset)) {
    const pdfUrl = `${asset.url}#toolbar=1&navpanes=0`;

    return (
      <object
        data={pdfUrl}
        type="application/pdf"
        className="h-[72vh] w-full rounded-lg border border-border/20 bg-background"
      >
        <div className="flex h-[72vh] items-center flex-col gap-2 justify-center rounded-lg border border-dashed border-border/30 bg-muted/20 px-6 text-center">
          <div className="text-[14px] font-semibold">{asset.name}</div>
          <div className="text-muted-foreground mt-1 text-[12px]">
            This PDF cannot be previewed inline in this browser. You can still
            download it.
          </div>
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="mt-3"
            onClick={() => onDownload(asset)}
          >
            <Download />
            Download PDF
          </Button>
        </div>
      </object>
    );
  }

  if (asset.source === "google-drive" && asset.thumbnailUrl) {
    return (
      <Image
        src={asset.thumbnailUrl}
        alt={asset.name}
        className="h-[72vh] w-full rounded-lg object-contain"
        height={200}
        width={200}
      />
    );
  }

  if (asset.source === "google-drive" && asset.externalViewUrl) {
    return (
      <iframe
        src={asset.externalViewUrl}
        title={asset.name}
        className="h-[72vh] w-full rounded-lg border border-border/20 bg-background"
      />
    );
  }

  if (asset.url && asset.mimeType?.startsWith("image/")) {
    return (
      <img
        src={asset.url}
        alt={asset.name}
        className="h-[72vh] w-full rounded-lg object-contain"
      />
    );
  }

  if (asset.url && asset.mimeType?.startsWith("video/")) {
    return (
      <video
        controls
        src={asset.url}
        className="h-[72vh] w-full rounded-lg bg-black object-contain"
      />
    );
  }

  if (asset.url && isOfficePreviewAsset(asset)) {
    return (
      <iframe
        src={getOfficePreviewUrl(asset.url)}
        title={asset.name}
        className="h-[72vh] w-full rounded-lg border border-border/20 bg-background"
      />
    );
  }

  if (asset.url && isTextPreviewAsset(asset)) {
    if (textPreviewQuery.isLoading || textPreviewQuery.isFetching) {
      return <LoaderComponent />;
    }

    if (textPreviewQuery.error) {
      return (
        <div className="flex h-[72vh] items-center justify-center rounded-lg border border-dashed border-border/30 bg-muted/20 px-6 text-center">
          <div>
            <div className="text-[14px] font-semibold">{asset.name}</div>
            <div className="text-muted-foreground mt-1 text-[12px]">
              This document cannot be previewed inline in this browser. You can
              still download it.
            </div>
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="mt-3"
              onClick={() => onDownload(asset)}
            >
              <Download />
              Download file
            </Button>
          </div>
        </div>
      );
    }

    return (
      <div className="h-[72vh] overflow-auto rounded-lg border border-border/20 bg-background p-3">
        <pre className="text-[12px] whitespace-pre-wrap break-words">
          {textPreviewQuery.data ?? ""}
        </pre>
      </div>
    );
  }

  if (asset.url && asset.type === "Document") {
    return (
      <iframe
        src={asset.url}
        title={asset.name}
        className="h-[72vh] w-full rounded-lg border border-border/20 bg-background"
      />
    );
  }

  return (
    <div className="flex h-[72vh] items-center justify-center rounded-lg border border-dashed border-border/30 bg-muted/20 px-6 text-center">
      <div>
        <div className="text-[14px] font-semibold">{asset.name}</div>
        <div className="text-muted-foreground mt-1 text-[12px]">
          A direct inline preview is not available for this file type.
        </div>
        {asset.url ? (
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="mt-3"
            onClick={() => onDownload(asset)}
          >
            <Download />
            Download file
          </Button>
        ) : null}
      </div>
    </div>
  );
}

export function ProjectFilesAssetsTab({
  project,
  members,
}: ProjectFilesAssetsTabProps) {
  const NO_LINKED_TASK_VALUE = "none";
  const { workspaceId } = useWorkspaceStore();
  const { useUpdateWorkspaceProject } = useWorkspaceProject();
  const workspaceGoogleDriveHook = useWorkspaceGoogleDrive();
  const workspaceDocHook = useWorkspaceDoc();
  const workspaceSpaceHook = useWorkspaceSpace();
  const { useUploadAsset, useDeleteAsset } = useFile();
  const upsertProjectRecord = useProjectStore(
    (state) => state.upsertProjectRecord,
  );

  const updateWorkspaceProjectMutation = useUpdateWorkspaceProject({
    onSuccess: (response) => {
      const nextRecord = response.data.project?.record;

      if (nextRecord) {
        upsertProjectRecord(nextRecord);
      }
    },
  });
  const uploadAssetMutation = useUploadAsset();
  const deleteAssetMutation = useDeleteAsset();
  const updateWorkspaceDocMutation = workspaceDocHook.useUpdateWorkspaceDoc();
  const createSpaceMessageMutation =
    workspaceSpaceHook.useCreateWorkspaceSpaceMessage();
  const googleDriveIntegrationQuery =
    workspaceGoogleDriveHook.useWorkspaceGoogleDriveIntegration(
      workspaceId || "",
      {
        enabled: Boolean(workspaceId),
      },
    );

  const hiddenReplaceInputRef = useRef<HTMLInputElement | null>(null);

  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState<string>("all");
  const [viewerAsset, setViewerAsset] = useState<ProjectAsset | null>(null);
  const [sendAsset, setSendAsset] = useState<ProjectAsset | null>(null);
  const [uploadOpen, setUploadOpen] = useState(false);
  const [driveImportOpen, setDriveImportOpen] = useState(false);
  const [workspaceDocImportOpen, setWorkspaceDocImportOpen] = useState(false);
  const [sendRoomId, setSendRoomId] = useState("");
  const [sendNote, setSendNote] = useState("");
  const [uploadFileValue, setUploadFileValue] = useState<File | null>(null);
  const [driveSearch, setDriveSearch] = useState("");
  const [selectedDriveFileId, setSelectedDriveFileId] = useState("");
  const [workspaceDocSearch, setWorkspaceDocSearch] = useState("");
  const [selectedWorkspaceDocId, setSelectedWorkspaceDocId] = useState("");
  const [driveLinkedTaskId, setDriveLinkedTaskId] =
    useState(NO_LINKED_TASK_VALUE);
  const [workspaceDocLinkedTaskId, setWorkspaceDocLinkedTaskId] =
    useState(NO_LINKED_TASK_VALUE);
  const [uploadLinkedTaskId, setUploadLinkedTaskId] =
    useState(NO_LINKED_TASK_VALUE);
  const [replacingAsset, setReplacingAsset] = useState<ProjectAsset | null>(
    null,
  );

  const linkedTasks = useMemo(() => getLinkedTaskOptions(project), [project]);
  const assets = useMemo(() => project.assets ?? [], [project.assets]);
  const googleDriveConnected = Boolean(
    googleDriveIntegrationQuery.data?.data?.isConnected,
  );
  const roomsQuery = workspaceSpaceHook.useWorkspaceSpaceRooms(
    workspaceId || "",
    {
      page: 1,
      limit: 100,
      kind: "all",
    },
    {
      enabled: Boolean(workspaceId && sendAsset),
    },
  );
  const sendableRooms = useMemo(
    () =>
      (roomsQuery.data?.data?.rooms ?? []).filter(
        (room) => room.kind !== "direct",
      ),
    [roomsQuery.data?.data?.rooms],
  );
  const googleDriveFilesQuery =
    workspaceGoogleDriveHook.useWorkspaceGoogleDriveFiles(
      workspaceId || "",
      {
        search: driveSearch,
        pageSize: 30,
      },
      {
        enabled:
          Boolean(workspaceId) && driveImportOpen && googleDriveConnected,
      },
    );
  const driveFiles = useMemo(
    () => googleDriveFilesQuery.data?.data?.files ?? [],
    [googleDriveFilesQuery.data?.data?.files],
  );
  const workspaceDocsQuery = workspaceDocHook.useWorkspaceDocs(
    workspaceId || "",
    {
      page: 1,
      limit: 50,
      search: workspaceDocSearch,
      archived: false,
    },
    {
      enabled: Boolean(workspaceId) && workspaceDocImportOpen,
    },
  );
  const workspaceDocs = useMemo(
    () => workspaceDocsQuery.data?.data?.docs ?? [],
    [workspaceDocsQuery.data?.data?.docs],
  );
  const selectedDriveFile = useMemo(
    () => driveFiles.find((file) => file.id === selectedDriveFileId) || null,
    [driveFiles, selectedDriveFileId],
  );
  const selectedWorkspaceDoc = useMemo(
    () =>
      workspaceDocs.find((doc) => doc.id === selectedWorkspaceDocId) || null,
    [selectedWorkspaceDocId, workspaceDocs],
  );
  const selectedSendRoom = useMemo(
    () => sendableRooms.find((room) => room.id === sendRoomId) || null,
    [sendRoomId, sendableRooms],
  );

  useEffect(() => {
    if (!sendAsset || !sendableRooms.length) {
      setSendRoomId("");
      return;
    }

    const currentRoomStillExists = sendableRooms.some(
      (room) => room.id === sendRoomId,
    );

    if (currentRoomStillExists) {
      return;
    }

    const projectRoom = sendableRooms.find(
      (room) => room.id === `project-${project.id}`,
    );
    setSendRoomId(projectRoom?.id || sendableRooms[0]?.id || "");
  }, [project.id, sendAsset, sendRoomId, sendableRooms]);

  const visibleAssets = useMemo(() => {
    const normalized = search.trim().toLowerCase();

    return assets.filter((asset) => {
      if (typeFilter !== "all" && asset.type !== typeFilter) {
        return false;
      }

      if (!normalized) {
        return true;
      }

      return [
        asset.name,
        asset.linkedTask,
        asset.uploadedBy,
        asset.type,
        asset.summary,
        asset.source,
      ]
        .filter(
          (value): value is string =>
            typeof value === "string" && Boolean(value),
        )
        .some((value) => value.toLowerCase().includes(normalized));
    });
  }, [assets, search, typeFilter]);

  const persistAssets = async (
    nextAssets: ProjectAsset[],
    messages: { loading: string; success: string; error: string },
  ) => {
    if (!workspaceId) {
      toast("Open this project from a workspace to manage files.");
      throw new Error("Missing workspace");
    }

    const nextRecord = {
      ...project,
      assets: nextAssets,
    };

    await toast.promise(
      updateWorkspaceProjectMutation.mutateAsync({
        workspaceId,
        projectId: project.id,
        updates: {
          record: nextRecord,
        },
      }),
      messages,
    );
  };

  const buildProjectAsset = (asset: CustomFile, linkedTaskId: string) => {
    const linkedTask = linkedTasks.find((task) => task.id === linkedTaskId);
    const uploader = members.find(
      (member) => member.id === String(asset.ownerId),
    );

    return {
      id: `asset-${String(asset._id)}`,
      assetId: String(asset._id),
      source: "upload",
      name: String(asset.fileName || "Untitled file"),
      type: inferAssetType(asset.mimeType, asset.resourceType),
      url: asset.url,
      mimeType: asset.mimeType,
      resourceType: asset.resourceType,
      uploadedBy: uploader?.name ?? "Workspace member",
      uploadedById: String(asset.ownerId || ""),
      uploadedAt: "Just now",
      linkedTask: linkedTask?.title ?? "Unlinked",
      linkedTaskId: linkedTask?.id,
      fileSize: formatAssetFileSize(asset.fileSize),
      folder: asset.folder,
    } satisfies ProjectAsset;
  };

  const buildDriveProjectAsset = (
    driveFile: WorkspaceGoogleDriveFileRecord,
    linkedTaskId: string,
  ) => {
    const linkedTask = linkedTasks.find((task) => task.id === linkedTaskId);
    const previewUrl =
      String(driveFile.previewLink || "").trim() ||
      String(driveFile.webViewLink || "").trim();
    const downloadUrl = String(driveFile.downloadLink || "").trim();

    return {
      id: `asset-drive-${driveFile.id}-${Date.now().toString(36)}`,
      source: "google-drive",
      externalId: driveFile.id,
      name: String(driveFile.name || "Untitled file"),
      type: inferAssetTypeFromDriveMime(driveFile.mimeType),
      url: previewUrl || downloadUrl,
      externalViewUrl: previewUrl || String(driveFile.webViewLink || "").trim(),
      externalDownloadUrl: downloadUrl,
      thumbnailUrl: String(driveFile.thumbnailLink || "").trim(),
      mimeType: driveFile.mimeType,
      resourceType: inferAssetTypeFromDriveMime(
        driveFile.mimeType,
      ).toLowerCase(),
      uploadedBy:
        String(driveFile.ownerName || "").trim() ||
        String(
          googleDriveIntegrationQuery.data?.data?.connection?.accountEmail ||
            "",
        ).trim() ||
        "Google Drive",
      uploadedById: "",
      uploadedAt: formatUploadDateLabel(driveFile.modifiedTime),
      linkedTask: linkedTask?.title ?? "Unlinked",
      linkedTaskId: linkedTask?.id,
      fileSize: formatAssetFileSize(driveFile.size),
      folder: "google-drive",
    } satisfies ProjectAsset;
  };

  const buildWorkspaceDocProjectAsset = (
    doc: WorkspaceDocRecord,
    linkedTaskId: string,
  ) => {
    const linkedTask = linkedTasks.find((task) => task.id === linkedTaskId);

    return {
      id: `asset-doc-${doc.id}`,
      source: "workspace-doc",
      docId: doc.id,
      name: doc.title || "Untitled document",
      type: "Document",
      url: `/docs/${doc.id}`,
      summary: doc.summary || "",
      mimeType: "text/x-squircle-doc",
      resourceType: "document",
      uploadedBy:
        doc.updatedBy?.name || doc.createdBy?.name || "Workspace member",
      uploadedById: doc.updatedBy?.id || doc.createdBy?.id || "",
      uploadedAt: formatUploadDateLabel(doc.updatedAt || doc.lastEditedAt),
      linkedTask: linkedTask?.title ?? "Unlinked",
      linkedTaskId: linkedTask?.id,
      fileSize: "Workspace doc",
      folder: "workspace-docs",
    } satisfies ProjectAsset;
  };

  const handleOpenDriveImport = () => {
    if (!workspaceId) {
      toast("Open this project from a workspace to import cloud files.");
      return;
    }

    if (!googleDriveConnected) {
      toast("Connect Google Drive in Settings → Integrations first.");
      return;
    }

    setDriveImportOpen(true);
  };

  const handleImportFromDrive = async () => {
    if (!selectedDriveFile) {
      toast("Select a Google Drive file to import.");
      return;
    }

    if (
      assets.some(
        (asset) =>
          asset.id !== replacingAsset?.id &&
          asset.externalId === selectedDriveFile.id,
      )
    ) {
      toast("This Google Drive file is already attached to the project.");
      return;
    }

    const linkedTaskId =
      driveLinkedTaskId === NO_LINKED_TASK_VALUE ? "" : driveLinkedTaskId;
    const importedAsset = buildDriveProjectAsset(
      selectedDriveFile,
      linkedTaskId,
    );

    const replacingDrive = replacingAsset?.source === "google-drive";
    const replacingDriveAssetId = replacingDrive ? replacingAsset?.id : "";
    const nextAssets = replacingDrive
      ? assets.map((asset) =>
          asset.id === replacingDriveAssetId
            ? {
                ...importedAsset,
                id: replacingDriveAssetId || importedAsset.id,
              }
            : asset,
        )
      : [importedAsset, ...assets];

    await persistAssets(nextAssets, {
      loading: replacingDrive
        ? "Replacing Google Drive file..."
        : "Importing from Google Drive...",
      success: replacingDrive
        ? "Google Drive file replaced."
        : "Google Drive file attached to this project.",
      error: replacingDrive
        ? "We could not replace that Google Drive file."
        : "We could not attach that Google Drive file.",
    });

    setSelectedDriveFileId("");
    setDriveLinkedTaskId(NO_LINKED_TASK_VALUE);
    setDriveImportOpen(false);
    setReplacingAsset(null);
  };

  const handleAttachWorkspaceDoc = async () => {
    if (!selectedWorkspaceDoc) {
      toast("Select a workspace document to attach.");
      return;
    }

    if (
      assets.some(
        (asset) =>
          asset.id !== replacingAsset?.id &&
          (String(asset.docId || "") === selectedWorkspaceDoc.id ||
            asset.id === `asset-doc-${selectedWorkspaceDoc.id}`),
      )
    ) {
      toast("This document is already attached to the project.");
      return;
    }

    const linkedTaskId =
      workspaceDocLinkedTaskId === NO_LINKED_TASK_VALUE
        ? ""
        : workspaceDocLinkedTaskId;
    const importedAsset = buildWorkspaceDocProjectAsset(
      selectedWorkspaceDoc,
      linkedTaskId,
    );
    const replacingWorkspaceDoc =
      replacingAsset !== null && isWorkspaceDocAsset(replacingAsset);
    const replacingWorkspaceDocId = replacingWorkspaceDoc
      ? replacingAsset?.id
      : "";

    const attachPromise = (async () => {
      const nextAssets = replacingWorkspaceDoc
        ? assets.map((asset) =>
            asset.id === replacingWorkspaceDocId
              ? {
                  ...importedAsset,
                  id: replacingWorkspaceDocId || importedAsset.id,
                }
              : asset,
          )
        : [importedAsset, ...assets];

      await persistAssets(nextAssets, {
        loading: replacingWorkspaceDoc
          ? "Replacing workspace document..."
          : "Attaching workspace document...",
        success: replacingWorkspaceDoc
          ? "Workspace document replaced."
          : "Workspace document attached to this project.",
        error: replacingWorkspaceDoc
          ? "We could not replace that workspace document."
          : "We could not attach that workspace document.",
      });

      if (selectedWorkspaceDoc.canEdit && workspaceId) {
        const nextProjectIds = Array.from(
          new Set([
            ...(selectedWorkspaceDoc.assignedProjectIds || []),
            project.id,
          ]),
        );

        await updateWorkspaceDocMutation
          .mutateAsync({
            workspaceId,
            docId: selectedWorkspaceDoc.id,
            updates: {
              assignedProjectIds: nextProjectIds,
            },
          })
          .catch(() => {
            toast(
              "The doc was attached here, but its project assignment could not be updated.",
            );
          });
      }
    })();

    try {
      await attachPromise;
      setSelectedWorkspaceDocId("");
      setWorkspaceDocLinkedTaskId(NO_LINKED_TASK_VALUE);
      setWorkspaceDocImportOpen(false);
      setReplacingAsset(null);
      void workspaceDocsQuery.refetch();
    } catch {
      // persistAssets already surfaced the failure.
    }
  };

  const handleUpload = async () => {
    if (!uploadFileValue) {
      toast("Choose a file to upload.");
      return;
    }

    try {
      const formData = new FormData();
      formData.append("file", uploadFileValue);
      if (workspaceId) {
        formData.append("workspaceId", workspaceId);
      }
      formData.append("folder", "project");

      const uploadPromise = uploadAssetMutation.mutateAsync(
        formData,
      ) as unknown as Promise<{ data: { asset: CustomFile } }>;
      toast.promise(uploadPromise, {
        loading: "Uploading file...",
        success: "File uploaded.",
        error: "We could not upload that file.",
      });
      const uploadResponse = await uploadPromise;

      const linkedTaskId =
        uploadLinkedTaskId === NO_LINKED_TASK_VALUE ? "" : uploadLinkedTaskId;
      const uploadedAsset = buildProjectAsset(
        uploadResponse.data.asset,
        linkedTaskId,
      );

      await persistAssets([uploadedAsset, ...assets], {
        loading: "Saving file metadata...",
        success: "File added to this project.",
        error: "We could not save this file to the project.",
      });

      setUploadFileValue(null);
      setUploadLinkedTaskId(NO_LINKED_TASK_VALUE);
      setUploadOpen(false);
    } catch {
      // toast.promise already surfaced the failure
    }
  };

  const handleReplaceFile = async (file: File) => {
    if (!replacingAsset) {
      return;
    }

    try {
      const formData = new FormData();
      formData.append("file", file);
      if (workspaceId) {
        formData.append("workspaceId", workspaceId);
      }
      formData.append("folder", replacingAsset.folder || "project");

      const uploadPromise = uploadAssetMutation.mutateAsync(
        formData,
      ) as unknown as Promise<{ data: { asset: CustomFile } }>;
      toast.promise(uploadPromise, {
        loading: `Replacing ${replacingAsset.name}...`,
        success: "Replacement uploaded.",
        error: "We could not upload the replacement file.",
      });
      const uploadResponse = await uploadPromise;

      if (replacingAsset.assetId) {
        await deleteAssetMutation
          .mutateAsync(replacingAsset.assetId)
          .catch(() => {
            toast("The old file could not be removed automatically.");
          });
      }

      const uploadedAsset = buildProjectAsset(
        uploadResponse.data.asset,
        replacingAsset.linkedTaskId || "",
      );

      const nextAssets = assets.map((asset) =>
        asset.id === replacingAsset.id
          ? {
              ...uploadedAsset,
              id: replacingAsset.id,
            }
          : asset,
      );

      await persistAssets(nextAssets, {
        loading: "Saving replacement...",
        success: "File replaced.",
        error: "We could not save the replacement file.",
      });
    } catch {
      // toast.promise already surfaced the failure
    } finally {
      setReplacingAsset(null);
      if (hiddenReplaceInputRef.current) {
        hiddenReplaceInputRef.current.value = "";
      }
    }
  };

  const handleDeleteAsset = async (asset: ProjectAsset) => {
    try {
      if (asset.assetId) {
        await toast.promise(deleteAssetMutation.mutateAsync(asset.assetId), {
          loading: `Deleting ${asset.name}...`,
          success: "File removed from storage.",
          error: "We could not delete that file.",
        });
      }

      const docId = getWorkspaceDocIdFromAsset(asset);
      if (docId && workspaceId) {
        const doc = workspaceDocs.find((entry) => entry.id === docId);
        if (doc?.canEdit) {
          const nextProjectIds = (doc.assignedProjectIds || []).filter(
            (projectId) => projectId !== project.id,
          );

          await updateWorkspaceDocMutation
            .mutateAsync({
              workspaceId,
              docId,
              updates: {
                assignedProjectIds: nextProjectIds,
              },
            })
            .catch(() => {
              toast(
                "The doc was removed here, but its project assignment could not be updated.",
              );
            });
        }
      }

      await persistAssets(
        assets.filter((item) => item.id !== asset.id),
        {
          loading: "Removing file...",
          success: "File removed from this project.",
          error: "We could not remove that file from the project.",
        },
      );
    } catch {
      // toast.promise already surfaced the failure
    }
  };

  const handleCopyLink = async (asset: ProjectAsset) => {
    const linkValue = getAbsoluteAssetUrl(asset);

    if (!linkValue) {
      toast("No preview link is available for this asset.");
      return;
    }

    try {
      await navigator.clipboard.writeText(linkValue);
      toast("File link copied.");
    } catch {
      toast("Could not copy file link in this browser.");
    }
  };

  const handleDownload = (asset: ProjectAsset) => {
    const downloadUrl = getAssetDownloadUrl(asset);

    if (!downloadUrl) {
      toast("No download URL is available for this file.");
      return;
    }

    if (isWorkspaceDocAsset(asset)) {
      window.open(downloadUrl, "_blank", "noopener,noreferrer");
      return;
    }

    const anchor = document.createElement("a");
    anchor.href = downloadUrl;
    anchor.target = "_blank";
    anchor.rel = "noreferrer";
    anchor.download = asset.name;
    anchor.click();
  };

  const handleReplaceAssetAction = (asset: ProjectAsset) => {
    if (isWorkspaceDocAsset(asset)) {
      setReplacingAsset(asset);
      const docId = getWorkspaceDocIdFromAsset(asset);
      setSelectedWorkspaceDocId(docId);
      setWorkspaceDocLinkedTaskId(asset.linkedTaskId || NO_LINKED_TASK_VALUE);
      setWorkspaceDocImportOpen(true);
      return;
    }

    if (asset.source === "google-drive") {
      if (!workspaceId || !googleDriveConnected) {
        handleOpenDriveImport();
        return;
      }

      setReplacingAsset(asset);
      setSelectedDriveFileId(asset.externalId || "");
      setDriveLinkedTaskId(asset.linkedTaskId || NO_LINKED_TASK_VALUE);
      handleOpenDriveImport();
      return;
    }

    setReplacingAsset(asset);
    hiddenReplaceInputRef.current?.click();
  };

  const handleSendFile = async () => {
    if (!sendAsset) {
      return;
    }

    if (!workspaceId) {
      toast("Open this project from a workspace to send files.");
      return;
    }

    if (!selectedSendRoom) {
      toast("Select a space to send this file to.");
      return;
    }

    const assetUrl = getAbsoluteAssetUrl(sendAsset);
    const fallbackNote = `Sharing "${sendAsset.name}" from ${project.name}.`;
    const content = [
      sendNote.trim() || fallbackNote,
      assetUrl ? `Open: ${assetUrl}` : "",
    ]
      .filter(Boolean)
      .join("\n\n");

    const request = createSpaceMessageMutation.mutateAsync({
      workspaceId,
      roomId: selectedSendRoom.id,
      payload: {
        content,
        attachments: [
          {
            id: sendAsset.id,
            name: sendAsset.name,
            kind: sendAsset.type === "Image" ? "image" : "file",
            url: assetUrl || getAssetOpenUrl(sendAsset),
          },
        ],
      },
    });

    try {
      await toast.promise(request, {
        loading: `Sending to ${selectedSendRoom.name}...`,
        success: `Sent to ${selectedSendRoom.name}.`,
        error: "We could not send this file.",
      });

      setSendAsset(null);
      setSendNote("");
      setSendRoomId("");
    } catch {
      // toast.promise already surfaced the failure.
    }
  };

  return (
    <>
      <section
        data-tour="project-files-shell"
        className="overflow-hidden rounded-xl border border-border/35 bg-card/75 shadow-xs"
      >
        <div
          data-tour="project-files-controls"
          className="flex flex-col gap-3 border-b border-border/20 px-3 py-3 md:px-4"
        >
          <div className="flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
            <div>
              <div className="text-[14px] font-semibold md:text-[15px]">
                Files & assets
              </div>
              <div className="text-muted-foreground text-[12px] leading-5">
                Upload, replace, preview, send, and download project files from
                one place.
              </div>
            </div>

            <div className="flex w-full flex-col gap-2 sm:flex-row xl:w-auto">
              <Input
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Search files, tasks, or uploaders"
                className="h-8 w-full sm:w-64"
              />

              <div className="flex flex-wrap items-center gap-2">
                <Select value={typeFilter} onValueChange={setTypeFilter}>
                  <SelectTrigger size="sm" className="w-36">
                    <SelectValue placeholder="All types" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All types</SelectItem>
                    <SelectItem value="Document">Documents</SelectItem>
                    <SelectItem value="Image">Images</SelectItem>
                    <SelectItem value="Video">Videos</SelectItem>
                    <SelectItem value="Code">Code</SelectItem>
                  </SelectContent>
                </Select>

                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button
                      data-tour="project-files-upload"
                      type="button"
                      variant="outline"
                      size="sm"
                    >
                      <Upload />
                      Upload
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-60">
                    <DropdownMenuItem onClick={() => setUploadOpen(true)}>
                      <Upload />
                      Upload from computer
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      onClick={handleOpenDriveImport}
                      disabled={!googleDriveConnected}
                    >
                      <Cloud />
                      Import from Drive
                    </DropdownMenuItem>
                    {!googleDriveConnected ? (
                      <div className="px-2 py-1 text-[11px] leading-4 text-muted-foreground">
                        Connect Google Drive in settings to activate this.
                      </div>
                    ) : null}
                    <DropdownMenuSeparator />
                    <DropdownMenuItem
                      onClick={() => setWorkspaceDocImportOpen(true)}
                    >
                      <BookOpen />
                      Workspace doc upload
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            </div>
          </div>
        </div>

        {visibleAssets.length ? (
          <>
            <div className="divide-y divide-border/20 lg:hidden">
              {visibleAssets.map((asset) => {
                const Icon = getAssetIcon(asset.type);

                return (
                  <button
                    key={asset.id}
                    type="button"
                    onClick={() => setViewerAsset(asset)}
                    className="flex w-full items-start gap-3 px-3 py-3 text-left md:px-4"
                  >
                    <span className="mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-md bg-background/80">
                      <Icon className="size-4 text-primary" />
                    </span>
                    <div className="min-w-0 flex-1">
                      <div className="truncate text-[13px] font-medium">
                        {asset.name}
                      </div>
                      <div className="text-muted-foreground mt-1 flex flex-wrap items-center gap-2 text-[11px]">
                        <span>{asset.type}</span>
                        {asset.source === "google-drive" ? (
                          <span>Google Drive</span>
                        ) : null}
                        {isWorkspaceDocAsset(asset) ? (
                          <span>Workspace doc</span>
                        ) : null}
                        <span>{asset.fileSize}</span>
                        <span>{asset.uploadedBy}</span>
                      </div>
                      <div className="text-muted-foreground mt-1 line-clamp-1 text-[11px]">
                        Linked to {asset.linkedTask}
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>

            <div data-tour="project-files-list" className="hidden lg:block">
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow className="hover:bg-transparent">
                      <TableHead>File</TableHead>
                      <TableHead>Type</TableHead>
                      <TableHead>Size</TableHead>
                      <TableHead>Uploaded by</TableHead>
                      <TableHead>Updated</TableHead>
                      <TableHead>Linked task</TableHead>
                      <TableHead className="w-10 text-right"> </TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {visibleAssets.map((asset) => {
                      const Icon = getAssetIcon(asset.type);

                      return (
                        <TableRow
                          key={asset.id}
                          className="h-11 bg-background/40 [&>td]:py-2"
                        >
                          <TableCell>
                            <button
                              type="button"
                              onClick={() => setViewerAsset(asset)}
                              className="flex min-w-0 items-center gap-2 text-left"
                            >
                              <span className="flex size-7 shrink-0 items-center justify-center rounded-md bg-background/80">
                                <Icon className="size-3.5 text-primary" />
                              </span>
                              <div className="min-w-0">
                                <div className="truncate text-[12.5px] font-medium md:text-[13px]">
                                  {asset.name}
                                </div>
                              </div>
                            </button>
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-1.5">
                              <Badge variant="outline" className="font-medium">
                                {asset.type}
                              </Badge>
                              {asset.source === "google-drive" ? (
                                <Badge
                                  variant="secondary"
                                  className="font-medium"
                                >
                                  Drive
                                </Badge>
                              ) : null}
                              {isWorkspaceDocAsset(asset) ? (
                                <Badge
                                  variant="secondary"
                                  className="font-medium"
                                >
                                  Doc
                                </Badge>
                              ) : null}
                            </div>
                          </TableCell>
                          <TableCell>{asset.fileSize}</TableCell>
                          <TableCell>{asset.uploadedBy}</TableCell>
                          <TableCell className="text-muted-foreground">
                            {asset.uploadedAt}
                          </TableCell>
                          <TableCell>
                            <span className="truncate text-[12px] md:text-[12.5px]">
                              {asset.linkedTask}
                            </span>
                          </TableCell>
                          <TableCell className="text-right">
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button
                                  type="button"
                                  variant="ghost"
                                  size="icon-sm"
                                >
                                  <MoreHorizontal />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end">
                                <DropdownMenuItem
                                  onClick={() => setViewerAsset(asset)}
                                >
                                  <Eye />
                                  Preview
                                </DropdownMenuItem>
                                <DropdownMenuItem
                                  onClick={() => setSendAsset(asset)}
                                >
                                  <Send />
                                  Send file
                                </DropdownMenuItem>
                                <DropdownMenuItem
                                  onClick={() => handleCopyLink(asset)}
                                >
                                  <Copy />
                                  Copy link
                                </DropdownMenuItem>
                                <DropdownMenuItem
                                  onClick={() => handleDownload(asset)}
                                >
                                  {isWorkspaceDocAsset(asset) ? (
                                    <ExternalLink />
                                  ) : (
                                    <Download />
                                  )}
                                  {isWorkspaceDocAsset(asset)
                                    ? "Open doc"
                                    : "Download"}
                                </DropdownMenuItem>
                                <DropdownMenuItem
                                  onClick={() => handleReplaceAssetAction(asset)}
                                >
                                  <RefreshCcw />
                                  {isWorkspaceDocAsset(asset)
                                    ? "Change doc"
                                    : asset.source === "google-drive"
                                      ? "Change Drive file"
                                      : "Replace file"}
                                </DropdownMenuItem>
                                <DropdownMenuSeparator />
                                <DropdownMenuItem
                                  variant="destructive"
                                  onClick={() => handleDeleteAsset(asset)}
                                >
                                  <Trash2 />
                                  Delete
                                </DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>
            </div>
          </>
        ) : (
          <div className="px-4 py-4">
            <Empty className="border-0 p-0 md:p-0">
              <EmptyHeader>
                <EmptyMedia variant="icon">
                  <SearchX className="size-4 text-primary/85" />
                </EmptyMedia>
                <EmptyDescription className="text-[12px]">
                  No files match the current search and type filters.
                </EmptyDescription>
              </EmptyHeader>
            </Empty>
          </div>
        )}
      </section>

      <input
        ref={hiddenReplaceInputRef}
        type="file"
        className="hidden"
        onChange={(event) => {
          const file = event.target.files?.[0];

          if (!file) {
            setReplacingAsset(null);
            return;
          }

          void handleReplaceFile(file);
        }}
      />

      <Dialog
        open={Boolean(viewerAsset)}
        onOpenChange={(open) => !open && setViewerAsset(null)}
      >
        <DialogContent className="max-w-[92vw] xl:max-w-6xl">
          <DialogHeader>
            <DialogTitle>{viewerAsset?.name}</DialogTitle>
            <DialogDescription>
              Preview the selected file, then copy, send, or download it.
            </DialogDescription>
          </DialogHeader>

          {viewerAsset ? (
            <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_14rem]">
              <div className="rounded-xl border border-border/20 bg-background/70 p-4">
                <AssetPreviewPanel
                  asset={viewerAsset}
                  onDownload={handleDownload}
                />
              </div>

              <div className="space-y-2 rounded-xl border border-border/20 bg-background/70 p-3">
                <div className="text-muted-foreground text-[11px] uppercase tracking-[0.08em]">
                  Details
                </div>
                <div className="text-[12px]">
                  <span className="text-muted-foreground">Type:</span>{" "}
                  {viewerAsset.type}
                </div>
                <div className="text-[12px]">
                  <span className="text-muted-foreground">Uploaded by:</span>{" "}
                  {viewerAsset.uploadedBy}
                </div>
                <div className="text-[12px]">
                  <span className="text-muted-foreground">Updated:</span>{" "}
                  {viewerAsset.uploadedAt}
                </div>
                <div className="text-[12px]">
                  <span className="text-muted-foreground">Linked task:</span>{" "}
                  {viewerAsset.linkedTask}
                </div>
                {viewerAsset.summary ? (
                  <div className="text-[12px] leading-5">
                    <span className="text-muted-foreground">Summary:</span>{" "}
                    {viewerAsset.summary}
                  </div>
                ) : null}
                <div className="pt-2 space-y-2">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="w-full"
                    onClick={() => handleDownload(viewerAsset)}
                  >
                    {isWorkspaceDocAsset(viewerAsset) ? (
                      <ExternalLink />
                    ) : (
                      <Download />
                    )}
                    {isWorkspaceDocAsset(viewerAsset) ? "Open" : "Download"}
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="w-full"
                    onClick={() => setSendAsset(viewerAsset)}
                  >
                    <Send />
                    Send file
                  </Button>
                </div>
              </div>
            </div>
          ) : null}
        </DialogContent>
      </Dialog>

      <Dialog
        open={Boolean(sendAsset)}
        onOpenChange={(open) => !open && setSendAsset(null)}
      >
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Send file</DialogTitle>
            <DialogDescription>
              Share the selected asset into a project or team space.
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-3">
            <div className="grid gap-2">
              <Label>Space</Label>
              <Select
                value={sendRoomId}
                onValueChange={setSendRoomId}
                disabled={roomsQuery.isLoading || roomsQuery.isFetching}
              >
                <SelectTrigger className="w-full">
                  <SelectValue
                    placeholder={
                      roomsQuery.isLoading || roomsQuery.isFetching
                        ? "Loading spaces..."
                        : "Select a space"
                    }
                  />
                </SelectTrigger>
                <SelectContent>
                  {sendableRooms.map((room) => (
                    <SelectItem key={room.id} value={room.id}>
                      {room.name}
                      {getRoomLabel(room) ? ` · ${getRoomLabel(room)}` : ""}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {!roomsQuery.isLoading &&
              !roomsQuery.isFetching &&
              !sendableRooms.length ? (
                <p className="text-[11px] leading-4 text-muted-foreground">
                  No project or group spaces are available for this file.
                </p>
              ) : null}
            </div>
            <div className="grid gap-2">
              <Label>Note</Label>
              <Textarea
                value={sendNote}
                onChange={(event) => setSendNote(event.target.value)}
                className="min-h-20"
                placeholder="Add a short handoff note"
              />
            </div>
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="ghost"
              onClick={() => setSendAsset(null)}
            >
              Cancel
            </Button>
            <Button
              type="button"
              onClick={() => void handleSendFile()}
              disabled={
                !sendAsset ||
                !sendRoomId ||
                createSpaceMessageMutation.isPending ||
                roomsQuery.isLoading ||
                roomsQuery.isFetching
              }
            >
              Send
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={uploadOpen} onOpenChange={setUploadOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Upload file</DialogTitle>
            <DialogDescription>
              Upload a real file, link it to a task, and keep it persisted on
              this project.
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-3">
            <div className="grid gap-2">
              <Label htmlFor="project-upload-file">File</Label>
              <Input
                id="project-upload-file"
                type="file"
                onChange={(event) =>
                  setUploadFileValue(event.target.files?.[0] ?? null)
                }
              />
            </div>

            <div className="grid gap-2">
              <Label>Linked task</Label>
              <Select
                value={uploadLinkedTaskId}
                onValueChange={setUploadLinkedTaskId}
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Optional task link" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={NO_LINKED_TASK_VALUE}>
                    No linked task
                  </SelectItem>
                  {linkedTasks.map((task) => (
                    <SelectItem key={task.id} value={task.id}>
                      {task.title}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="ghost"
              onClick={() => setUploadOpen(false)}
            >
              Cancel
            </Button>
            <Button
              type="button"
              onClick={() => void handleUpload()}
              disabled={
                !uploadFileValue ||
                uploadAssetMutation.isPending ||
                updateWorkspaceProjectMutation.isPending
              }
            >
              Upload file
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog
        open={workspaceDocImportOpen}
        onOpenChange={(open) => {
          setWorkspaceDocImportOpen(open);
          if (!open && replacingAsset && isWorkspaceDocAsset(replacingAsset)) {
            setReplacingAsset(null);
          }
        }}
      >
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>
              {replacingAsset && isWorkspaceDocAsset(replacingAsset)
                ? "Change workspace document"
                : "Attach workspace document"}
            </DialogTitle>
            <DialogDescription>
              Choose an existing Squircle doc and keep it visible from this
              project.
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-3">
            <div className="grid gap-2">
              <Label htmlFor="workspace-doc-search">Search docs</Label>
              <Input
                id="workspace-doc-search"
                value={workspaceDocSearch}
                onChange={(event) => setWorkspaceDocSearch(event.target.value)}
                placeholder="Search by title or summary"
                className="h-9"
              />
            </div>

            <div className="max-h-72 overflow-auto rounded-md border border-border/25">
              {workspaceDocsQuery.isLoading || workspaceDocsQuery.isFetching ? (
                <div className="p-4">
                  <LoaderComponent />
                </div>
              ) : workspaceDocs.length ? (
                <div className="divide-y divide-border/20">
                  {workspaceDocs.map((doc) => {
                    const active = selectedWorkspaceDocId === doc.id;
                    const alreadyAttached = assets.some(
                      (asset) =>
                        asset.id !== replacingAsset?.id &&
                        (String(asset.docId || "") === doc.id ||
                          asset.id === `asset-doc-${doc.id}`),
                    );

                    return (
                      <button
                        key={doc.id}
                        type="button"
                        className={`flex w-full items-start justify-between gap-3 px-3 py-2 text-left transition ${
                          active ? "bg-muted/50" : "hover:bg-muted/30"
                        }`}
                        onClick={() => setSelectedWorkspaceDocId(doc.id)}
                      >
                        <div className="min-w-0">
                          <div className="truncate text-[12.5px] font-medium">
                            {doc.title}
                          </div>
                          <div className="text-muted-foreground mt-0.5 line-clamp-2 text-[11px]">
                            {doc.summary || "Workspace document"}
                          </div>
                          <div className="text-muted-foreground mt-1 flex flex-wrap gap-1.5 text-[10.5px]">
                            <span>{doc.publishState}</span>
                            <span>
                              Updated {formatUploadDateLabel(doc.updatedAt)}
                            </span>
                            {doc.assignedProjectIds.includes(project.id) ? (
                              <span>Already assigned to this project</span>
                            ) : null}
                          </div>
                        </div>
                        <Badge
                          variant={
                            active || alreadyAttached ? "default" : "outline"
                          }
                          className="h-6 shrink-0"
                        >
                          {alreadyAttached
                            ? "Attached"
                            : active
                              ? "Selected"
                              : "Select"}
                        </Badge>
                      </button>
                    );
                  })}
                </div>
              ) : (
                <div className="px-4 py-6">
                  <Empty className="border-0 p-0 md:p-0">
                    <EmptyHeader>
                      <EmptyMedia variant="icon">
                        <BookOpen className="size-4 text-primary/85" />
                      </EmptyMedia>
                      <EmptyDescription className="text-[12px]">
                        No workspace documents found for this search.
                      </EmptyDescription>
                    </EmptyHeader>
                  </Empty>
                </div>
              )}
            </div>

            <div className="grid gap-2">
              <Label>Linked task</Label>
              <Select
                value={workspaceDocLinkedTaskId}
                onValueChange={setWorkspaceDocLinkedTaskId}
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Optional task link" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={NO_LINKED_TASK_VALUE}>
                    No linked task
                  </SelectItem>
                  {linkedTasks.map((task) => (
                    <SelectItem key={task.id} value={task.id}>
                      {task.title}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {selectedWorkspaceDoc && !selectedWorkspaceDoc.canEdit ? (
              <p className="rounded-md border border-border/50 bg-muted/25 px-3 py-2 text-[11px] text-muted-foreground">
                You can attach this doc to the project list, but only the owner
                or an admin can update the document&apos;s project assignment.
              </p>
            ) : null}
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="ghost"
              onClick={() => setWorkspaceDocImportOpen(false)}
            >
              Cancel
            </Button>
            <Button
              type="button"
              onClick={() => void handleAttachWorkspaceDoc()}
              disabled={
                !selectedWorkspaceDoc ||
                updateWorkspaceProjectMutation.isPending ||
                updateWorkspaceDocMutation.isPending ||
                workspaceDocsQuery.isFetching
              }
            >
              {replacingAsset && isWorkspaceDocAsset(replacingAsset)
                ? "Change document"
                : "Attach document"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog
        open={driveImportOpen}
        onOpenChange={(open) => {
          setDriveImportOpen(open);
          if (!open && replacingAsset?.source === "google-drive") {
            setReplacingAsset(null);
          }
        }}
      >
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>
              {replacingAsset?.source === "google-drive"
                ? "Change Google Drive file"
                : "Import from Google Drive"}
            </DialogTitle>
            <DialogDescription>
              Search your connected Google Drive and attach a file to this
              project.
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-3">
            <div className="grid gap-2">
              <Label htmlFor="drive-search">Search Drive files</Label>
              <Input
                id="drive-search"
                value={driveSearch}
                onChange={(event) => setDriveSearch(event.target.value)}
                placeholder="Search by file name"
                className="h-9"
              />
            </div>

            <div className="max-h-64 overflow-auto rounded-md border border-border/25">
              {googleDriveFilesQuery.isLoading ||
              googleDriveFilesQuery.isFetching ? (
                <div className="p-4">
                  <LoaderComponent />
                </div>
              ) : driveFiles.length ? (
                <div className="divide-y divide-border/20">
                  {driveFiles.map((file) => {
                    const active = selectedDriveFileId === file.id;
                    return (
                      <button
                        key={file.id}
                        type="button"
                        className={`flex w-full items-start justify-between gap-3 px-3 py-2 text-left transition ${
                          active ? "bg-muted/50" : "hover:bg-muted/30"
                        }`}
                        onClick={() => setSelectedDriveFileId(file.id)}
                      >
                        <div className="min-w-0">
                          <div className="truncate text-[12.5px] font-medium">
                            {file.name}
                          </div>
                          <div className="text-muted-foreground mt-0.5 truncate text-[11px]">
                            {file.ownerName ||
                              file.ownerEmail ||
                              "Google Drive"}{" "}
                            · {formatAssetFileSize(file.size)}
                          </div>
                        </div>
                        <Badge
                          variant={active ? "default" : "outline"}
                          className="h-6"
                        >
                          {active ? "Selected" : "Select"}
                        </Badge>
                      </button>
                    );
                  })}
                </div>
              ) : (
                <div className="px-4 py-6">
                  <Empty className="border-0 p-0 md:p-0">
                    <EmptyHeader>
                      <EmptyMedia variant="icon">
                        <Cloud className="size-4 text-primary/85" />
                      </EmptyMedia>
                      <EmptyDescription className="text-[12px]">
                        No Google Drive files found for this search.
                      </EmptyDescription>
                    </EmptyHeader>
                  </Empty>
                </div>
              )}
            </div>

            <div className="grid gap-2">
              <Label>Linked task</Label>
              <Select
                value={driveLinkedTaskId}
                onValueChange={setDriveLinkedTaskId}
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Optional task link" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={NO_LINKED_TASK_VALUE}>
                    No linked task
                  </SelectItem>
                  {linkedTasks.map((task) => (
                    <SelectItem key={task.id} value={task.id}>
                      {task.title}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="ghost"
              onClick={() => setDriveImportOpen(false)}
            >
              Cancel
            </Button>
            <Button
              type="button"
              onClick={() => void handleImportFromDrive()}
              disabled={
                !selectedDriveFile ||
                updateWorkspaceProjectMutation.isPending ||
                googleDriveFilesQuery.isFetching
              }
            >
              {replacingAsset?.source === "google-drive"
                ? "Change file"
                : "Attach file"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
