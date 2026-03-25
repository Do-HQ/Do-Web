"use client";

import { useEffect, useMemo, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  BookOpen,
  CheckCircle2,
  ExternalLink,
  GraduationCap,
  Link2,
  Plus,
  Search,
  Trash2,
  Video,
} from "lucide-react";

import useWorkspace from "@/hooks/use-workspace";
import useWorkspaceDoc from "@/hooks/use-workspace-doc";
import useWorkspaceKnowledgeBase from "@/hooks/use-workspace-knowledge-base";
import { useWorkspacePermissions } from "@/hooks/use-workspace-permissions";
import useWorkspaceStore from "@/stores/workspace";
import type {
  WorkspaceOnboardingKit,
  WorkspaceOnboardingKitItem,
  WorkspaceOnboardingItemType,
} from "@/types/workspace";
import { Badge } from "../ui/badge";
import { Button } from "../ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "../ui/dialog";
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "../ui/empty";
import {
  Field,
  FieldContent,
  FieldDescription,
  FieldGroup,
  FieldLegend,
  FieldSet,
  FieldTitle,
} from "../ui/field";
import { Input } from "../ui/input";
import { ScrollArea } from "../ui/scroll-area";
import { Switch } from "../ui/switch";
import { Textarea } from "../ui/textarea";
import LoaderComponent from "../shared/loader";
import { cn } from "@/lib/utils";

const DEFAULT_ONBOARDING_KIT: WorkspaceOnboardingKit = {
  enabled: false,
  title: "Welcome to the workspace",
  description: "Review the key resources your team has prepared for you.",
  items: [],
};

const createItemId = () =>
  globalThis.crypto?.randomUUID?.() ||
  `onboarding-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

const hasChanges = <T,>(value: T, saved: T) =>
  JSON.stringify(value) !== JSON.stringify(saved);

const typeMeta: Record<
  WorkspaceOnboardingItemType,
  {
    label: string;
    icon: typeof BookOpen;
    badgeClassName: string;
  }
> = {
  doc: {
    label: "Doc",
    icon: BookOpen,
    badgeClassName:
      "border-sky-500/30 bg-sky-500/10 text-sky-700 dark:text-sky-300",
  },
  "knowledge-base": {
    label: "KB article",
    icon: GraduationCap,
    badgeClassName:
      "border-violet-500/30 bg-violet-500/10 text-violet-700 dark:text-violet-300",
  },
  video: {
    label: "Video",
    icon: Video,
    badgeClassName:
      "border-amber-500/30 bg-amber-500/10 text-amber-700 dark:text-amber-300",
  },
  link: {
    label: "Link",
    icon: Link2,
    badgeClassName:
      "border-emerald-500/30 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300",
  },
};

type ResourceDraft = {
  type: "video" | "link";
  title: string;
  description: string;
  url: string;
  required: boolean;
};

const DEFAULT_RESOURCE_DRAFT: ResourceDraft = {
  type: "link",
  title: "",
  description: "",
  url: "",
  required: true,
};

const SettingsWorkspaceOnboarding = () => {
  const queryClient = useQueryClient();
  const { workspaceId } = useWorkspaceStore();
  const { canManageWorkspaceSettings } = useWorkspacePermissions();
  const readOnly = !canManageWorkspaceSettings;

  const workspaceHook = useWorkspace();
  const docsHook = useWorkspaceDoc();
  const knowledgeBaseHook = useWorkspaceKnowledgeBase();

  const workspaceQuery = workspaceHook.useWorkspaceById(workspaceId || "");
  const workspace = workspaceQuery.data?.data?.workspace;

  const [kit, setKit] = useState<WorkspaceOnboardingKit>(DEFAULT_ONBOARDING_KIT);
  const [savedKit, setSavedKit] = useState<WorkspaceOnboardingKit>(
    DEFAULT_ONBOARDING_KIT,
  );
  const [docSearch, setDocSearch] = useState("");
  const [knowledgeSearch, setKnowledgeSearch] = useState("");
  const [isDocDialogOpen, setIsDocDialogOpen] = useState(false);
  const [isKnowledgeDialogOpen, setIsKnowledgeDialogOpen] = useState(false);
  const [isResourceDialogOpen, setIsResourceDialogOpen] = useState(false);
  const [resourceDraft, setResourceDraft] = useState<ResourceDraft>(
    DEFAULT_RESOURCE_DRAFT,
  );

  const docsQuery = docsHook.useWorkspaceDocs(
    workspaceId || "",
    useMemo(
      () => ({
        page: 1,
        limit: 18,
        search: docSearch,
        archived: false,
      }),
      [docSearch],
    ),
    {
      enabled: isDocDialogOpen && !!workspaceId,
    },
  );

  const knowledgeBaseQuery = knowledgeBaseHook.useWorkspaceKnowledgeBaseSearch(
    workspaceId || "",
    useMemo(
      () => ({
        query: knowledgeSearch,
        page: 1,
        limit: 18,
        publishState: "published",
      }),
      [knowledgeSearch],
    ),
    {
      enabled: isKnowledgeDialogOpen && !!workspaceId,
    },
  );

  const { isPending: isSaving, mutateAsync: updateWorkspace } =
    workspaceHook.useUpdateWorkspace({
      onSuccess() {
        queryClient.invalidateQueries({
          queryKey: ["get-workspace-detail", workspaceId],
        });
        queryClient.invalidateQueries({
          queryKey: ["get-workspace-detail"],
        });
        queryClient.invalidateQueries({
          queryKey: ["workspace-onboarding", workspaceId],
        });
      },
    });

  useEffect(() => {
    const nextKit: WorkspaceOnboardingKit = {
      ...DEFAULT_ONBOARDING_KIT,
      ...(workspace?.onboardingKit || {}),
      items: Array.isArray(workspace?.onboardingKit?.items)
        ? workspace.onboardingKit.items
        : [],
    };

    setKit(nextKit);
    setSavedKit(nextKit);
  }, [workspace?.onboardingKit]);

  const isDirty = useMemo(() => hasChanges(kit, savedKit), [kit, savedKit]);

  const onboardingItems = kit.items || [];

  const addItem = (item: WorkspaceOnboardingKitItem) => {
    setKit((current) => ({
      ...current,
      items: [...(current.items || []), item],
    }));
  };

  const removeItem = (itemId: string) => {
    setKit((current) => ({
      ...current,
      items: (current.items || []).filter((item) => item.id !== itemId),
    }));
  };

  const updateItem = (
    itemId: string,
    updates: Partial<WorkspaceOnboardingKitItem>,
  ) => {
    setKit((current) => ({
      ...current,
      items: (current.items || []).map((item) =>
        item.id === itemId ? { ...item, ...updates } : item,
      ),
    }));
  };

  const saveKit = async () => {
    if (!workspaceId) {
      return;
    }

    const payload: WorkspaceOnboardingKit = {
      ...kit,
      title: kit.title.trim() || DEFAULT_ONBOARDING_KIT.title,
      description:
        kit.description.trim() || DEFAULT_ONBOARDING_KIT.description,
      items: (kit.items || []).map((item) => ({
        ...item,
        title: String(item.title || "").trim(),
        description: String(item.description || "").trim(),
      })),
    };

    const request = updateWorkspace({
      workspaceId,
      data: {
        onboardingKit: payload,
      },
    });

    await toast.promise(request, {
      loading: "Saving onboarding kit...",
      success: (response) => {
        const nextKit = {
          ...payload,
          items: [...payload.items],
        };
        setSavedKit(nextKit);
        setKit(nextKit);
        return response?.data?.message || "Onboarding kit saved";
      },
      error: "Could not save onboarding kit",
    });
  };

  const handleAddDoc = (doc: {
    id: string;
    title: string;
    summary?: string;
  }) => {
    const alreadyExists = onboardingItems.some(
      (item) => item.type === "doc" && item.docId === doc.id,
    );

    if (alreadyExists) {
      toast("That doc is already in the onboarding kit.");
      return;
    }

    addItem({
      id: createItemId(),
      type: "doc",
      title: doc.title,
      description: String(doc.summary || "").trim(),
      required: true,
      docId: doc.id,
      route: `/docs/${encodeURIComponent(doc.id)}`,
    });

    setIsDocDialogOpen(false);
    setDocSearch("");
  };

  const handleAddKnowledgeBaseArticle = (article: {
    id: string;
    title: string;
    summary?: string;
    route: string;
  }) => {
    const alreadyExists = onboardingItems.some(
      (item) =>
        item.type === "knowledge-base" &&
        item.articleId === article.id &&
        item.route === article.route,
    );

    if (alreadyExists) {
      toast("That knowledge base article is already in the onboarding kit.");
      return;
    }

    addItem({
      id: createItemId(),
      type: "knowledge-base",
      title: article.title,
      description: String(article.summary || "").trim(),
      required: true,
      articleId: article.id,
      route: article.route,
    });

    setIsKnowledgeDialogOpen(false);
    setKnowledgeSearch("");
  };

  const handleSaveResource = () => {
    const title = resourceDraft.title.trim();
    const url = resourceDraft.url.trim();

    if (!title) {
      toast("Add a title for this onboarding resource.");
      return;
    }

    if (!url) {
      toast("Add a URL for this onboarding resource.");
      return;
    }

    addItem({
      id: createItemId(),
      type: resourceDraft.type,
      title,
      description: resourceDraft.description.trim(),
      required: resourceDraft.required,
      url,
    });

    setResourceDraft(DEFAULT_RESOURCE_DRAFT);
    setIsResourceDialogOpen(false);
  };

  const docs = docsQuery.data?.data?.docs || [];
  const articles = knowledgeBaseQuery.data?.data?.articles || [];

  return (
    <>
      <FieldGroup className="gap-8">
        <FieldSet>
          <FieldLegend>Workspace onboarding</FieldLegend>
          <FieldDescription>
            Choose the docs, knowledge-base articles, videos, and links new
            members should review when they join this workspace.
          </FieldDescription>
          {readOnly ? (
            <FieldDescription>
              Read-only for members. Ask an owner/admin to update this.
            </FieldDescription>
          ) : null}

          <div
            className={cn(
              "mt-4 grid gap-3 md:grid-cols-2",
              readOnly && "pointer-events-none opacity-65",
            )}
          >
            <Card className="border-border/45 shadow-none">
              <CardHeader className="pb-1">
                <CardTitle className="text-[13px]">Experience</CardTitle>
                <CardDescription>
                  Control whether new members are prompted to complete the kit.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <Field orientation="horizontal">
                  <FieldContent>
                    <FieldTitle>Enable onboarding kit</FieldTitle>
                    <FieldDescription>
                      Show a dashboard prompt and checklist for newly joined
                      members.
                    </FieldDescription>
                  </FieldContent>
                  <Switch
                    checked={kit.enabled}
                    onCheckedChange={(checked) =>
                      setKit((current) => ({ ...current, enabled: checked }))
                    }
                  />
                </Field>

                <div className="space-y-2">
                  <label className="text-[12px] font-medium">
                    Onboarding title
                  </label>
                  <Input
                    value={kit.title}
                    onChange={(event) =>
                      setKit((current) => ({
                        ...current,
                        title: event.target.value,
                      }))
                    }
                    placeholder="Welcome to the workspace"
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-[12px] font-medium">
                    Onboarding description
                  </label>
                  <Textarea
                    value={kit.description}
                    onChange={(event) =>
                      setKit((current) => ({
                        ...current,
                        description: event.target.value,
                      }))
                    }
                    className="min-h-24 resize-none"
                    placeholder="Explain what new members should complete first."
                  />
                </div>
              </CardContent>
            </Card>

            <Card className="border-border/45 shadow-none">
              <CardHeader className="pb-1">
                <CardTitle className="text-[13px]">Prompt behavior</CardTitle>
                <CardDescription>
                  Initial workspace owners are excluded automatically. New
                  members are prompted from their dashboard until required items
                  are complete.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-3 text-[12px] text-muted-foreground">
                <div className="rounded-lg border border-border/45 bg-muted/20 p-3">
                  <div className="flex items-center justify-between gap-3">
                    <span>Required items</span>
                    <Badge variant="outline" className="text-[11px]">
                      {
                        onboardingItems.filter((item) => item.required).length
                      }{" "}
                      required
                    </Badge>
                  </div>
                  <p className="mt-1 text-[11.5px]">
                    Members can finish onboarding once all required items are
                    marked complete.
                  </p>
                </div>

                <div className="rounded-lg border border-border/45 bg-muted/20 p-3">
                  <div className="flex items-center justify-between gap-3">
                    <span>Total kit resources</span>
                    <Badge variant="outline" className="text-[11px]">
                      {onboardingItems.length} items
                    </Badge>
                  </div>
                  <p className="mt-1 text-[11.5px]">
                    Mix docs, knowledge-base articles, videos, and linked
                    resources in one checklist.
                  </p>
                </div>
              </CardContent>
            </Card>
          </div>
        </FieldSet>

        <FieldSet>
          <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <FieldLegend>Kit content</FieldLegend>
              <FieldDescription>
                Pick the resources that should appear in the onboarding
                checklist.
              </FieldDescription>
            </div>

            <div
              className={cn(
                "flex flex-wrap gap-2",
                readOnly && "pointer-events-none opacity-65",
              )}
            >
              <Button
                size="sm"
                variant="outline"
                onClick={() => setIsDocDialogOpen(true)}
              >
                <BookOpen className="size-4" />
                Add doc
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={() => setIsKnowledgeDialogOpen(true)}
              >
                <GraduationCap className="size-4" />
                Add KB article
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={() => {
                  setResourceDraft(DEFAULT_RESOURCE_DRAFT);
                  setIsResourceDialogOpen(true);
                }}
              >
                <Plus className="size-4" />
                Add link or video
              </Button>
            </div>
          </div>

          {onboardingItems.length ? (
            <div className="mt-4 space-y-3">
              {onboardingItems.map((item) => {
                const meta = typeMeta[item.type];
                const Icon = meta.icon;

                return (
                  <div
                    key={item.id}
                    className="rounded-xl border border-border/45 bg-card/70 p-3"
                  >
                    <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                      <div className="min-w-0 space-y-2">
                        <div className="flex flex-wrap items-center gap-2">
                          <Badge
                            variant="outline"
                            className={cn("gap-1.5 text-[11px]", meta.badgeClassName)}
                          >
                            <Icon className="size-3.5" />
                            {meta.label}
                          </Badge>
                          {item.required ? (
                            <Badge variant="secondary" className="text-[11px]">
                              Required
                            </Badge>
                          ) : (
                            <Badge variant="outline" className="text-[11px]">
                              Optional
                            </Badge>
                          )}
                        </div>
                        <div className="space-y-1">
                          <div className="text-[13px] font-semibold">
                            {item.title}
                          </div>
                          {item.description ? (
                            <p className="text-muted-foreground text-[12px]">
                              {item.description}
                            </p>
                          ) : null}
                        </div>
                      </div>

                      <div
                        className={cn(
                          "flex flex-wrap items-center gap-2",
                          readOnly && "pointer-events-none opacity-65",
                        )}
                      >
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() =>
                            updateItem(item.id, { required: !item.required })
                          }
                        >
                          <CheckCircle2 className="size-4" />
                          {item.required ? "Make optional" : "Make required"}
                        </Button>
                        <Button
                          size="icon-sm"
                          variant="outline"
                          onClick={() => removeItem(item.id)}
                          aria-label={`Remove ${item.title}`}
                        >
                          <Trash2 className="size-4" />
                        </Button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <Empty className="border-border/45 mt-4 rounded-xl border px-4 py-10">
              <EmptyHeader>
                <EmptyMedia variant="icon">
                  <GraduationCap className="size-5" />
                </EmptyMedia>
                <EmptyTitle className="text-[14px]">
                  No onboarding resources yet
                </EmptyTitle>
                <EmptyDescription className="text-[12px]">
                  Add docs, knowledge-base articles, videos, or helpful links so
                  new members know where to start.
                </EmptyDescription>
              </EmptyHeader>
            </Empty>
          )}
        </FieldSet>

        <div className="flex flex-wrap items-center justify-end gap-2">
          <Button
            variant="outline"
            disabled={!isDirty || isSaving || readOnly}
            onClick={() => setKit(savedKit)}
          >
            Reset
          </Button>
          <Button
            disabled={!isDirty || isSaving || readOnly}
            onClick={saveKit}
            loading={isSaving}
          >
            Save onboarding kit
          </Button>
        </div>
      </FieldGroup>

      <Dialog open={isDocDialogOpen} onOpenChange={setIsDocDialogOpen}>
        <DialogContent className="sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>Add workspace doc</DialogTitle>
            <DialogDescription>
              Pick an existing workspace doc to include in the onboarding
              checklist.
            </DialogDescription>
          </DialogHeader>

          <div className="relative">
            <Search className="text-muted-foreground absolute top-1/2 left-3 size-4 -translate-y-1/2" />
            <Input
              value={docSearch}
              onChange={(event) => setDocSearch(event.target.value)}
              className="pl-9"
              placeholder="Search docs"
            />
          </div>

          <ScrollArea className="max-h-90">
            <div className="space-y-2 pr-3">
              {docsQuery.isLoading ? (
                <div className="flex min-h-36 items-center justify-center">
                  <LoaderComponent />
                </div>
              ) : docs.length ? (
                docs.map((doc) => (
                  <button
                    key={doc.id}
                    type="button"
                    onClick={() =>
                      handleAddDoc({
                        id: doc.id,
                        title: doc.title,
                        summary: doc.summary,
                      })
                    }
                    className="hover:border-border flex w-full items-start justify-between gap-3 rounded-xl border border-border/45 bg-card/65 p-3 text-left transition-colors"
                  >
                    <div className="min-w-0 space-y-1">
                      <div className="text-[13px] font-semibold">
                        {doc.title}
                      </div>
                      {doc.summary ? (
                        <p className="text-muted-foreground line-clamp-2 text-[12px]">
                          {doc.summary}
                        </p>
                      ) : null}
                    </div>
                    <Badge variant="outline" className="shrink-0 text-[11px]">
                      Doc
                    </Badge>
                  </button>
                ))
              ) : (
                <Empty className="border-border/45 rounded-xl border px-4 py-10">
                  <EmptyHeader>
                    <EmptyTitle className="text-[14px]">
                      No matching docs
                    </EmptyTitle>
                    <EmptyDescription className="text-[12px]">
                      Try another search or create a workspace doc first.
                    </EmptyDescription>
                  </EmptyHeader>
                </Empty>
              )}
            </div>
          </ScrollArea>
        </DialogContent>
      </Dialog>

      <Dialog
        open={isKnowledgeDialogOpen}
        onOpenChange={setIsKnowledgeDialogOpen}
      >
        <DialogContent className="sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>Add knowledge-base article</DialogTitle>
            <DialogDescription>
              Pick a published knowledge-base article to include in the
              onboarding checklist.
            </DialogDescription>
          </DialogHeader>

          <div className="relative">
            <Search className="text-muted-foreground absolute top-1/2 left-3 size-4 -translate-y-1/2" />
            <Input
              value={knowledgeSearch}
              onChange={(event) => setKnowledgeSearch(event.target.value)}
              className="pl-9"
              placeholder="Search knowledge base"
            />
          </div>

          <ScrollArea className="max-h-90">
            <div className="space-y-2 pr-3">
              {knowledgeBaseQuery.isLoading ? (
                <div className="flex min-h-36 items-center justify-center">
                  <LoaderComponent />
                </div>
              ) : articles.length ? (
                articles.map((article) => (
                  <button
                    key={article.id}
                    type="button"
                    onClick={() =>
                      handleAddKnowledgeBaseArticle({
                        id: article.id,
                        title: article.title,
                        summary: article.summary,
                        route: article.route,
                      })
                    }
                    className="hover:border-border flex w-full items-start justify-between gap-3 rounded-xl border border-border/45 bg-card/65 p-3 text-left transition-colors"
                  >
                    <div className="min-w-0 space-y-1">
                      <div className="text-[13px] font-semibold">
                        {article.title}
                      </div>
                      <p className="text-muted-foreground line-clamp-2 text-[12px]">
                        {article.summary}
                      </p>
                    </div>
                    <Badge variant="outline" className="shrink-0 text-[11px]">
                      KB
                    </Badge>
                  </button>
                ))
              ) : (
                <Empty className="border-border/45 rounded-xl border px-4 py-10">
                  <EmptyHeader>
                    <EmptyTitle className="text-[14px]">
                      No matching articles
                    </EmptyTitle>
                    <EmptyDescription className="text-[12px]">
                      Try another search or publish relevant content to the
                      knowledge base first.
                    </EmptyDescription>
                  </EmptyHeader>
                </Empty>
              )}
            </div>
          </ScrollArea>
        </DialogContent>
      </Dialog>

      <Dialog open={isResourceDialogOpen} onOpenChange={setIsResourceDialogOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Add linked resource</DialogTitle>
            <DialogDescription>
              Add an external video or URL that new members should review during
              onboarding.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="grid gap-3 sm:grid-cols-2">
              <Button
                variant={resourceDraft.type === "link" ? "default" : "outline"}
                className="justify-start"
                onClick={() =>
                  setResourceDraft((current) => ({ ...current, type: "link" }))
                }
              >
                <Link2 className="size-4" />
                Link
              </Button>
              <Button
                variant={resourceDraft.type === "video" ? "default" : "outline"}
                className="justify-start"
                onClick={() =>
                  setResourceDraft((current) => ({ ...current, type: "video" }))
                }
              >
                <Video className="size-4" />
                Video
              </Button>
            </div>

            <div className="space-y-2">
              <label className="text-[12px] font-medium">Title</label>
              <Input
                value={resourceDraft.title}
                onChange={(event) =>
                  setResourceDraft((current) => ({
                    ...current,
                    title: event.target.value,
                  }))
                }
                placeholder="Team handbook video"
              />
            </div>

            <div className="space-y-2">
              <label className="text-[12px] font-medium">Description</label>
              <Textarea
                value={resourceDraft.description}
                onChange={(event) =>
                  setResourceDraft((current) => ({
                    ...current,
                    description: event.target.value,
                  }))
                }
                className="min-h-24 resize-none"
                placeholder="Tell new members why this resource matters."
              />
            </div>

            <div className="space-y-2">
              <label className="text-[12px] font-medium">
                {resourceDraft.type === "video" ? "Video URL" : "Resource URL"}
              </label>
              <Input
                value={resourceDraft.url}
                onChange={(event) =>
                  setResourceDraft((current) => ({
                    ...current,
                    url: event.target.value,
                  }))
                }
                placeholder="https://..."
              />
            </div>

            <Field orientation="horizontal">
              <FieldContent>
                <FieldTitle>Required item</FieldTitle>
                <FieldDescription>
                  Members must complete this before onboarding is marked done.
                </FieldDescription>
              </FieldContent>
              <Switch
                checked={resourceDraft.required}
                onCheckedChange={(checked) =>
                  setResourceDraft((current) => ({
                    ...current,
                    required: checked,
                  }))
                }
              />
            </Field>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setIsResourceDialogOpen(false)}
            >
              Cancel
            </Button>
            <Button onClick={handleSaveResource}>
              <ExternalLink className="size-4" />
              Add resource
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
};

export default SettingsWorkspaceOnboarding;
