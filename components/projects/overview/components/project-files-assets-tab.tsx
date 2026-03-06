"use client";

import { useMemo, useRef, useState } from "react";
import {
  Code2,
  Copy,
  Download,
  Eye,
  FileText,
  Image as ImageIcon,
  MoreHorizontal,
  RefreshCcw,
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
import useFile from "@/hooks/use-file";
import type { CustomFile } from "@/types/file";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
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

const SEND_TARGETS = [
  "Project chat",
  "Workspace chat",
  "Design team",
  "Client share link",
] as const;

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

function getAssetExtension(name: string) {
  const parts = name.toLowerCase().split(".");
  return parts.length > 1 ? parts[parts.length - 1] : "";
}

function isOfficePreviewAsset(asset: ProjectAsset) {
  const extension = getAssetExtension(asset.name);
  return OFFICE_EMBED_EXTENSIONS.has(extension);
}

function isPdfAsset(asset: ProjectAsset) {
  const mimeType = String(asset.mimeType || "").toLowerCase();
  return mimeType.includes("pdf") || getAssetExtension(asset.name) === "pdf";
}

function isTextPreviewAsset(asset: ProjectAsset) {
  const mimeType = String(asset.mimeType || "").toLowerCase();

  if (
    mimeType.startsWith("text/") ||
    mimeType.includes("json") ||
    mimeType.includes("javascript") ||
    mimeType.includes("xml")
  ) {
    return true;
  }

  return TEXT_PREVIEW_EXTENSIONS.has(getAssetExtension(asset.name));
}

function getOfficePreviewUrl(url: string) {
  return "https://view.officeapps.live.com/op/embed.aspx?src=" + encodeURIComponent(url);
}

function inferAssetType(mimeType?: string, resourceType?: string): ProjectAssetType {
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

      const content = await response.text();
      return content.slice(0, 150_000);
    },
  });

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

  if (asset.url && isPdfAsset(asset)) {
    return (
      <iframe
        src={asset.url}
        title={asset.name}
        className="h-[72vh] w-full rounded-lg border border-border/20 bg-background"
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
      return (
        <div className="flex h-[72vh] items-center justify-center rounded-lg border border-border/20 bg-muted/20 text-[12px]">
          Loading preview...
        </div>
      );
    }

    if (textPreviewQuery.error) {
      return (
        <div className="flex h-[72vh] items-center justify-center rounded-lg border border-dashed border-border/30 bg-muted/20 px-6 text-center">
          <div>
            <div className="text-[14px] font-semibold">{asset.name}</div>
            <div className="text-muted-foreground mt-1 text-[12px]">
              This document cannot be previewed inline in this browser. You can still download it.
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
  const { useUploadAsset, useDeleteAsset } = useFile();
  const upsertProjectRecord = useProjectStore((state) => state.upsertProjectRecord);

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

  const hiddenReplaceInputRef = useRef<HTMLInputElement | null>(null);

  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState<string>("all");
  const [viewerAsset, setViewerAsset] = useState<ProjectAsset | null>(null);
  const [sendAsset, setSendAsset] = useState<ProjectAsset | null>(null);
  const [uploadOpen, setUploadOpen] = useState(false);
  const [sendTarget, setSendTarget] = useState<string>(SEND_TARGETS[0]);
  const [sendNote, setSendNote] = useState("");
  const [uploadFileValue, setUploadFileValue] = useState<File | null>(null);
  const [uploadLinkedTaskId, setUploadLinkedTaskId] = useState(
    NO_LINKED_TASK_VALUE,
  );
  const [replacingAsset, setReplacingAsset] = useState<ProjectAsset | null>(null);

  const linkedTasks = useMemo(() => getLinkedTaskOptions(project), [project]);
  const assets = useMemo(() => project.assets ?? [], [project.assets]);

  const visibleAssets = useMemo(() => {
    const normalized = search.trim().toLowerCase();

    return assets.filter((asset) => {
      if (typeFilter !== "all" && asset.type !== typeFilter) {
        return false;
      }

      if (!normalized) {
        return true;
      }

      return [asset.name, asset.linkedTask, asset.uploadedBy, asset.type]
        .filter(Boolean)
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
    const uploader = members.find((member) => member.id === String(asset.ownerId));

    return {
      id: `asset-${String(asset._id)}`,
      assetId: String(asset._id),
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
        await deleteAssetMutation.mutateAsync(replacingAsset.assetId).catch(() => {
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
    if (!asset.url) {
      toast("No preview link is available for this asset.");
      return;
    }

    try {
      await navigator.clipboard.writeText(asset.url);
      toast("File link copied.");
    } catch {
      toast("Could not copy file link in this browser.");
    }
  };

  const handleDownload = (asset: ProjectAsset) => {
    if (!asset.url) {
      toast("No download URL is available for this file.");
      return;
    }

    const anchor = document.createElement("a");
    anchor.href = asset.url;
    anchor.target = "_blank";
    anchor.rel = "noreferrer";
    anchor.download = asset.name;
    anchor.click();
  };

  const handleSendFile = () => {
    if (!sendAsset) {
      return;
    }

    toast(`${sendAsset.name} sent to ${sendTarget}.`);
    setSendAsset(null);
    setSendNote("");
    setSendTarget(SEND_TARGETS[0]);
  };

  return (
    <>
      <section className="overflow-hidden rounded-xl border border-border/35 bg-card/75 shadow-xs">
        <div className="flex flex-col gap-3 border-b border-border/20 px-3 py-3 md:px-4">
          <div className="flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
            <div>
              <div className="text-[14px] font-semibold md:text-[15px]">Files & assets</div>
              <div className="text-muted-foreground text-[12px] leading-5">
                Upload, replace, preview, send, and download project files from one place.
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

                <Button type="button" variant="outline" size="sm" onClick={() => setUploadOpen(true)}>
                  <Upload />
                  Upload
                </Button>
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
                      <div className="truncate text-[13px] font-medium">{asset.name}</div>
                      <div className="text-muted-foreground mt-1 flex flex-wrap items-center gap-2 text-[11px]">
                        <span>{asset.type}</span>
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

            <div className="hidden lg:block">
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
                        <TableRow key={asset.id} className="h-11 bg-background/40 [&>td]:py-2">
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
                            <Badge variant="outline" className="font-medium">
                              {asset.type}
                            </Badge>
                          </TableCell>
                          <TableCell>{asset.fileSize}</TableCell>
                          <TableCell>{asset.uploadedBy}</TableCell>
                          <TableCell className="text-muted-foreground">{asset.uploadedAt}</TableCell>
                          <TableCell>
                            <span className="truncate text-[12px] md:text-[12.5px]">{asset.linkedTask}</span>
                          </TableCell>
                          <TableCell className="text-right">
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button type="button" variant="ghost" size="icon-sm">
                                  <MoreHorizontal />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end">
                                <DropdownMenuItem onClick={() => setViewerAsset(asset)}>
                                  <Eye />
                                  Preview
                                </DropdownMenuItem>
                                <DropdownMenuItem onClick={() => setSendAsset(asset)}>
                                  <Send />
                                  Send file
                                </DropdownMenuItem>
                                <DropdownMenuItem onClick={() => handleCopyLink(asset)}>
                                  <Copy />
                                  Copy link
                                </DropdownMenuItem>
                                <DropdownMenuItem onClick={() => handleDownload(asset)}>
                                  <Download />
                                  Download
                                </DropdownMenuItem>
                                <DropdownMenuItem
                                  onClick={() => {
                                    setReplacingAsset(asset);
                                    hiddenReplaceInputRef.current?.click();
                                  }}
                                >
                                  <RefreshCcw />
                                  Replace
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
          <div className="text-muted-foreground px-4 py-4 text-[12px] leading-5">
            No files match the current search and type filters.
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

      <Dialog open={Boolean(viewerAsset)} onOpenChange={(open) => !open && setViewerAsset(null)}>
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
                <AssetPreviewPanel asset={viewerAsset} onDownload={handleDownload} />
              </div>

              <div className="space-y-2 rounded-xl border border-border/20 bg-background/70 p-3">
                <div className="text-muted-foreground text-[11px] uppercase tracking-[0.08em]">
                  Details
                </div>
                <div className="text-[12px]">
                  <span className="text-muted-foreground">Type:</span> {viewerAsset.type}
                </div>
                <div className="text-[12px]">
                  <span className="text-muted-foreground">Uploaded by:</span> {viewerAsset.uploadedBy}
                </div>
                <div className="text-[12px]">
                  <span className="text-muted-foreground">Updated:</span> {viewerAsset.uploadedAt}
                </div>
                <div className="text-[12px]">
                  <span className="text-muted-foreground">Linked task:</span> {viewerAsset.linkedTask}
                </div>
                <div className="pt-2 space-y-2">
                  <Button type="button" variant="outline" size="sm" className="w-full" onClick={() => handleDownload(viewerAsset)}>
                    <Download />
                    Download
                  </Button>
                  <Button type="button" variant="outline" size="sm" className="w-full" onClick={() => setSendAsset(viewerAsset)}>
                    <Send />
                    Send file
                  </Button>
                </div>
              </div>
            </div>
          ) : null}
        </DialogContent>
      </Dialog>

      <Dialog open={Boolean(sendAsset)} onOpenChange={(open) => !open && setSendAsset(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Send file</DialogTitle>
            <DialogDescription>
              Share the selected asset into another team surface.
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-3">
            <div className="grid gap-2">
              <Label>Destination</Label>
              <Select value={sendTarget} onValueChange={setSendTarget}>
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {SEND_TARGETS.map((target) => (
                    <SelectItem key={target} value={target}>
                      {target}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
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
            <Button type="button" variant="ghost" onClick={() => setSendAsset(null)}>
              Cancel
            </Button>
            <Button type="button" onClick={handleSendFile} disabled={!sendAsset}>
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
              Upload a real file, link it to a task, and keep it persisted on this project.
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-3">
            <div className="grid gap-2">
              <Label htmlFor="project-upload-file">File</Label>
              <Input
                id="project-upload-file"
                type="file"
                onChange={(event) => setUploadFileValue(event.target.files?.[0] ?? null)}
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
            <Button type="button" variant="ghost" onClick={() => setUploadOpen(false)}>
              Cancel
            </Button>
            <Button
              type="button"
              onClick={() => void handleUpload()}
              disabled={!uploadFileValue || uploadAssetMutation.isPending || updateWorkspaceProjectMutation.isPending}
            >
              Upload file
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
