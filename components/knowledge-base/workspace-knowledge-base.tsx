"use client";

import { type ComponentType, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  BookOpen,
  ChevronLeft,
  ChevronRight,
  Compass,
  Dot,
  ExternalLink,
  Layers3,
  Library,
  Pin,
  RefreshCcw,
  Search,
  Sparkles,
  Star,
  Tag,
} from "lucide-react";

import { useDebounce } from "@/hooks/use-debounce";
import useWorkspaceKnowledgeBase from "@/hooks/use-workspace-knowledge-base";
import useWorkspaceStore from "@/stores/workspace";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty";
import { Input } from "@/components/ui/input";
import LoaderComponent from "@/components/shared/loader";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import type {
  WorkspaceKnowledgeBaseArticleRecord,
  WorkspaceKnowledgeBaseSearchQueryParams,
} from "@/types/knowledge-base";
import { ROUTES } from "@/utils/constants";

const SOURCE_OPTIONS: Array<{
  value: WorkspaceKnowledgeBaseSearchQueryParams["source"];
  label: string;
}> = [
  { value: "all", label: "All sources" },
  { value: "doc", label: "Docs" },
  { value: "project", label: "Project knowledge" },
  { value: "curated", label: "Curated guides" },
];

const PUBLISH_STATE_OPTIONS: Array<{
  value: WorkspaceKnowledgeBaseSearchQueryParams["publishState"];
  label: string;
}> = [
  { value: "all", label: "Any state" },
  { value: "draft", label: "Draft" },
  { value: "review", label: "Review" },
  { value: "published", label: "Published" },
];

const BOOLEAN_FILTER_OPTIONS = [
  { value: "all", label: "Any" },
  { value: "true", label: "Yes" },
  { value: "false", label: "No" },
];

const CONFIDENCE_OPTIONS = [
  { value: "__any__", label: "Any confidence" },
  { value: "0.5", label: "50%+" },
  { value: "0.7", label: "70%+" },
  { value: "0.85", label: "85%+" },
];

type QuickViewKey =
  | "all"
  | "published"
  | "review"
  | "draft"
  | "featured"
  | "pinned";

const QUICK_VIEWS: Array<{ key: QuickViewKey; label: string }> = [
  { key: "all", label: "All knowledge" },
  { key: "published", label: "Published" },
  { key: "review", label: "In review" },
  { key: "draft", label: "Drafts" },
  { key: "featured", label: "Featured" },
  { key: "pinned", label: "Pinned" },
];

const quickViewDescription: Record<QuickViewKey, string> = {
  all: "All indexed workspace knowledge.",
  published: "Ready for broad internal sharing.",
  review: "Pending quality and owner checks.",
  draft: "Early drafts not yet finalized.",
  featured: "High-value reference materials.",
  pinned: "Priority resources for quick access.",
};

const formatUpdatedAt = (value: string) => {
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    return "Recently";
  }

  return parsed.toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
};

const sentenceCase = (value: string) => {
  const normalized = cleanString(value);
  if (!normalized) {
    return "";
  }

  return normalized.charAt(0).toUpperCase() + normalized.slice(1);
};

const sourceBadgeClass = (source: string) => {
  if (source === "project") {
    return "bg-blue-500/10 text-blue-600 border-blue-500/30 dark:text-blue-300";
  }

  if (source === "curated") {
    return "bg-violet-500/10 text-violet-600 border-violet-500/30 dark:text-violet-300";
  }

  return "bg-emerald-500/10 text-emerald-600 border-emerald-500/30 dark:text-emerald-300";
};

const viewToFilters = (
  view: QuickViewKey,
): Pick<
  WorkspaceKnowledgeBaseSearchQueryParams,
  "publishState" | "featured" | "pinned"
> => {
  if (view === "published") {
    return { publishState: "published", featured: "all", pinned: "all" };
  }
  if (view === "review") {
    return { publishState: "review", featured: "all", pinned: "all" };
  }
  if (view === "draft") {
    return { publishState: "draft", featured: "all", pinned: "all" };
  }
  if (view === "featured") {
    return { publishState: "all", featured: "true", pinned: "all" };
  }
  if (view === "pinned") {
    return { publishState: "all", featured: "all", pinned: "true" };
  }
  return { publishState: "all", featured: "all", pinned: "all" };
};

const getActiveQuickView = (
  publishState: WorkspaceKnowledgeBaseSearchQueryParams["publishState"],
  featured: "all" | "true" | "false",
  pinned: "all" | "true" | "false",
): QuickViewKey | null => {
  if (featured === "true" && pinned === "all" && publishState === "all") {
    return "featured";
  }
  if (pinned === "true" && featured === "all" && publishState === "all") {
    return "pinned";
  }
  if (publishState === "published" && featured === "all" && pinned === "all") {
    return "published";
  }
  if (publishState === "review" && featured === "all" && pinned === "all") {
    return "review";
  }
  if (publishState === "draft" && featured === "all" && pinned === "all") {
    return "draft";
  }
  if (publishState === "all" && featured === "all" && pinned === "all") {
    return "all";
  }
  return null;
};

const contentPreviewRows = (article: WorkspaceKnowledgeBaseArticleRecord) => {
  return [
    {
      id: "source",
      name: "Source",
      value: sentenceCase(article.source),
      status: "origin",
    },
    {
      id: "category",
      name: "Category",
      value: sentenceCase(article.category),
      status: "taxonomy",
    },
    {
      id: "state",
      name: "State",
      value: sentenceCase(article.publishState),
      status: "readiness",
    },
    {
      id: "tags",
      name: "Tag count",
      value: String(article.tags.length),
      status: "coverage",
    },
  ];
};

function PaneLoader() {
  return (
    <div className="flex h-full min-h-0 items-center justify-center px-3 py-6">
      <LoaderComponent />
    </div>
  );
}

function PaneSyncOverlay() {
  return (
    <div className="bg-background/50 absolute inset-0 z-10 flex items-center justify-center backdrop-blur-[1px]">
      <LoaderComponent />
    </div>
  );
}

function CompactEmpty({
  title,
  description,
  icon: Icon,
}: {
  title: string;
  description: string;
  icon: ComponentType<{ className?: string }>;
}) {
  return (
    <Empty className="gap-3 rounded-lg border-border/35 bg-background/40 p-4 md:p-5">
      <EmptyHeader className="gap-1.5">
        <EmptyMedia
          variant="icon"
          className="bg-muted/60 text-muted-foreground size-8 rounded-md [&_svg]:size-4"
        >
          <Icon />
        </EmptyMedia>
        <EmptyTitle className="text-[13px] font-medium tracking-normal">
          {title}
        </EmptyTitle>
        <EmptyDescription className="text-[11px] leading-5">
          {description}
        </EmptyDescription>
      </EmptyHeader>
    </Empty>
  );
}

export default function WorkspaceKnowledgeBase() {
  const router = useRouter();
  const { workspaceId } = useWorkspaceStore();
  const knowledgeBaseHook = useWorkspaceKnowledgeBase();

  const resolvedWorkspaceId = String(workspaceId || "").trim();
  const [search, setSearch] = useState("");
  const [source, setSource] =
    useState<WorkspaceKnowledgeBaseSearchQueryParams["source"]>("all");
  const [publishState, setPublishState] =
    useState<WorkspaceKnowledgeBaseSearchQueryParams["publishState"]>("all");
  const [category, setCategory] = useState("all");
  const [tag, setTag] = useState("");
  const [featured, setFeatured] = useState<"all" | "true" | "false">("all");
  const [pinned, setPinned] = useState<"all" | "true" | "false">("all");
  const [minConfidence, setMinConfidence] = useState("");
  const [page, setPage] = useState(1);
  const [selectedArticleId, setSelectedArticleId] = useState("");

  const debouncedSearch = useDebounce(search, 280);
  const debouncedTag = useDebounce(tag, 280);

  const kbQuery = knowledgeBaseHook.useWorkspaceKnowledgeBaseSearch(
    resolvedWorkspaceId,
    {
      query: debouncedSearch,
      page,
      limit: 20,
      source,
      category,
      publishState,
      tags: debouncedTag,
      featured,
      pinned,
      minConfidence,
    },
    {
      enabled: Boolean(resolvedWorkspaceId),
    },
  );

  const knowledgeData = kbQuery.data?.data;
  const articles = useMemo(
    () => knowledgeData?.articles ?? [],
    [knowledgeData?.articles],
  );
  const pagination = knowledgeData?.pagination;
  const facets = knowledgeData?.facets;
  const isInitialLoading = kbQuery.isLoading && !knowledgeData;
  const isRefreshing = kbQuery.isFetching && !isInitialLoading;

  const categoryOptions = useMemo(() => {
    const facetCategories = facets?.categories || [];
    const mapped = facetCategories
      .map((item) => ({
        value: item.value,
        label: `${item.value} (${item.count})`,
      }))
      .filter((item) => item.value);

    return [{ value: "all", label: "All categories" }, ...mapped];
  }, [facets?.categories]);

  const topTags = useMemo(() => {
    return (facets?.tags || []).slice(0, 16);
  }, [facets?.tags]);

  const selectedArticle = useMemo(() => {
    return articles.find((article) => article.id === selectedArticleId) || null;
  }, [articles, selectedArticleId]);

  const totalPages = pagination?.totalPages || 1;
  const totalResults = pagination?.total || 0;
  const activeQuickView = getActiveQuickView(publishState, featured, pinned);
  const projectKnowledgeCount =
    facets?.sources?.find((item) => item.value === "project")?.count || 0;

  useEffect(() => {
    if (!articles.length) {
      setSelectedArticleId("");
      return;
    }

    const hasSelected = articles.some(
      (article) => article.id === selectedArticleId,
    );
    if (!hasSelected) {
      setSelectedArticleId(articles[0].id);
    }
  }, [articles, selectedArticleId]);

  const hasActiveFilters =
    source !== "all" ||
    publishState !== "all" ||
    category !== "all" ||
    Boolean(tag.trim()) ||
    featured !== "all" ||
    pinned !== "all" ||
    Boolean(minConfidence) ||
    Boolean(search.trim());

  const resetFilters = () => {
    setSearch("");
    setSource("all");
    setPublishState("all");
    setCategory("all");
    setTag("");
    setFeatured("all");
    setPinned("all");
    setMinConfidence("");
    setPage(1);
  };

  const applyQuickView = (view: QuickViewKey) => {
    const next = viewToFilters(view);
    setPublishState(next.publishState || "all");
    setFeatured((next.featured as "all" | "true" | "false") || "all");
    setPinned((next.pinned as "all" | "true" | "false") || "all");
    setPage(1);
  };

  if (!resolvedWorkspaceId) {
    return (
      <section className="flex h-full min-h-0 w-full flex-col">
        <CompactEmpty
          icon={Library}
          title="Select a workspace first"
          description="Choose a workspace to load your indexed knowledge base."
        />
      </section>
    );
  }

  return (
    <section
      data-tour="knowledge-base-shell"
      className="flex h-full min-h-0 w-full flex-col gap-3"
    >
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="space-y-0.5">
          <h1 className="text-[15px] font-semibold">Knowledge base</h1>
          <p className="text-muted-foreground text-[12px]">
            Centralized workspace knowledge with searchable insights.
          </p>
        </div>
        <div className="flex items-center gap-1.5">
          <Badge variant="outline" className="h-6 rounded-md px-2 text-[11px]">
            {totalResults} results
          </Badge>
          <Button
            type="button"
            size="sm"
            className="h-8 text-[11px]"
            onClick={() => router.push(ROUTES.DOCS)}
          >
            <BookOpen className="size-3.5" />
            Open docs
          </Button>
        </div>
      </div>

      <div className="grid min-h-0 flex-1 gap-3 xl:grid-cols-[270px_360px_minmax(0,1fr)]">
        <section
          data-tour="knowledge-base-navigator"
          className="bg-background relative flex min-h-0 flex-col overflow-hidden rounded-xl border border-border/45"
        >
          <div className="space-y-2 border-b px-3 py-3">
            <h2 className="text-[13px] font-medium">Navigator</h2>
            <div className="relative">
              <Search className="text-muted-foreground absolute top-1/2 left-2.5 size-3.5 -translate-y-1/2" />
              <Input
                data-tour="knowledge-base-search"
                value={search}
                onChange={(event) => {
                  setSearch(event.target.value);
                  setPage(1);
                }}
                placeholder="Search title or summary"
                className="h-8 pl-8 text-[12px]"
              />
            </div>
          </div>

          <div className="relative min-h-0 flex-1 px-2 py-2">
            {isInitialLoading ? (
              <PaneLoader />
            ) : (
              <ScrollArea className="h-full">
                <div className="space-y-3 px-1">
                  <div className="space-y-1">
                    <p className="text-muted-foreground px-1 text-[10px] font-medium uppercase">
                      Views
                    </p>
                    {QUICK_VIEWS.map((view) => (
                      <button
                        key={view.key}
                        type="button"
                        className={cn(
                          "hover:bg-accent/50 flex h-8 w-full items-center justify-between rounded-md px-2 text-left text-[12px] transition",
                          activeQuickView === view.key &&
                            "bg-accent text-foreground",
                        )}
                        onClick={() => applyQuickView(view.key)}
                      >
                        <span>{view.label}</span>
                        <ChevronRight className="text-muted-foreground size-3.5" />
                      </button>
                    ))}
                  </div>

                  <Separator />

                  <div className="space-y-1">
                    <p className="text-muted-foreground px-1 text-[10px] font-medium uppercase">
                      Sources
                    </p>
                    {SOURCE_OPTIONS.filter(
                      (option) => option.value !== "all",
                    ).map((option) => {
                      const isActive = source === option.value;
                      const facetCount =
                        facets?.sources?.find(
                          (item) => item.value === option.value,
                        )?.count || 0;
                      return (
                        <button
                          key={option.value}
                          type="button"
                          className={cn(
                            "hover:bg-accent/50 flex h-8 w-full items-center justify-between rounded-md px-2 text-left text-[12px] transition",
                            isActive && "bg-accent",
                          )}
                          onClick={() => {
                            setSource(option.value || "all");
                            if (option.value === "project") {
                              setPublishState("all");
                              setFeatured("all");
                              setPinned("all");
                            }
                            setPage(1);
                          }}
                        >
                          <span>{option.label}</span>
                          <span className="text-muted-foreground text-[10px]">
                            {facetCount}
                          </span>
                        </button>
                      );
                    })}
                  </div>

                  <Separator />

                  <div className="space-y-1">
                    <p className="text-muted-foreground px-1 text-[10px] font-medium uppercase">
                      Popular tags
                    </p>
                    <div className="flex flex-wrap gap-1">
                      {topTags.length ? (
                        topTags.map((tagItem) => (
                          <button
                            type="button"
                            key={tagItem.value}
                            className={cn(
                              "inline-flex h-6 items-center rounded-full border px-2 text-[10px] transition",
                              cleanString(tag).toLowerCase() === tagItem.value
                                ? "border-primary/45 bg-primary/10 text-primary"
                                : "border-border/55 hover:bg-accent/60",
                            )}
                            onClick={() => {
                              setTag(tagItem.value);
                              setPage(1);
                            }}
                          >
                            <Tag className="mr-1 size-2.5" />
                            {tagItem.value}
                          </button>
                        ))
                      ) : (
                        <p className="text-muted-foreground px-1 py-1 text-[11px]">
                          No tag data yet.
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              </ScrollArea>
            )}
            {isRefreshing ? <PaneSyncOverlay /> : null}
          </div>
        </section>

        <section
          data-tour="knowledge-base-articles"
          className="bg-background relative flex min-h-0 flex-col overflow-hidden rounded-xl border border-border/45"
        >
          <div className="space-y-2 border-b px-3 py-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <h2 className="text-[13px] font-medium">Articles</h2>
              <Badge
                variant="outline"
                className="h-5 rounded-md px-1.5 text-[10px]"
              >
                Page {pagination?.page || 1}/{totalPages}
              </Badge>
            </div>
            <p className="text-muted-foreground line-clamp-2 text-[11px]">
              {quickViewDescription[activeQuickView || "all"]}
            </p>

            <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
              <Select
                value={publishState}
                onValueChange={(nextValue) => {
                  setPublishState(
                    nextValue as WorkspaceKnowledgeBaseSearchQueryParams["publishState"],
                  );
                  setPage(1);
                }}
              >
                <SelectTrigger className="h-8 w-full text-[12px]">
                  <SelectValue placeholder="State" />
                </SelectTrigger>
                <SelectContent>
                  {PUBLISH_STATE_OPTIONS.map((option) => (
                    <SelectItem
                      key={option.value}
                      value={option.value || "all"}
                    >
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Select
                value={category}
                onValueChange={(nextValue) => {
                  setCategory(nextValue);
                  setPage(1);
                }}
              >
                <SelectTrigger className="h-8 w-full text-[12px]">
                  <SelectValue placeholder="Category" />
                </SelectTrigger>
                <SelectContent>
                  {categoryOptions.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Select
                value={minConfidence || "__any__"}
                onValueChange={(nextValue) => {
                  setMinConfidence(nextValue === "__any__" ? "" : nextValue);
                  setPage(1);
                }}
              >
                <SelectTrigger className="h-8 w-full text-[12px]">
                  <SelectValue placeholder="Confidence" />
                </SelectTrigger>
                <SelectContent>
                  {CONFIDENCE_OPTIONS.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Select
                value={featured}
                onValueChange={(nextValue) => {
                  setFeatured(nextValue as "all" | "true" | "false");
                  setPage(1);
                }}
              >
                <SelectTrigger className="h-8 w-full text-[12px]">
                  <SelectValue placeholder="Featured" />
                </SelectTrigger>
                <SelectContent>
                  {BOOLEAN_FILTER_OPTIONS.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      Featured: {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Select
                value={pinned}
                onValueChange={(nextValue) => {
                  setPinned(nextValue as "all" | "true" | "false");
                  setPage(1);
                }}
              >
                <SelectTrigger className="h-8 w-full text-[12px]">
                  <SelectValue placeholder="Pinned" />
                </SelectTrigger>
                <SelectContent>
                  {BOOLEAN_FILTER_OPTIONS.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      Pinned: {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Input
                value={tag}
                onChange={(event) => {
                  setTag(event.target.value);
                  setPage(1);
                }}
                placeholder="Tag filter"
                className="h-8 text-[12px]"
              />
            </div>
          </div>

          <div className="relative min-h-0 flex-1 px-2 py-2">
            {isInitialLoading ? (
              <PaneLoader />
            ) : (
              <>
                <ScrollArea className="h-[calc(100%-40px)]">
                  <div className="space-y-1.5 p-1">
                    {articles.length ? (
                      articles.map((article) => {
                        const isActive = selectedArticle?.id === article.id;
                        return (
                          <button
                            key={article.id}
                            type="button"
                            onClick={() => setSelectedArticleId(article.id)}
                            className={cn(
                              "hover:bg-accent/45 w-full rounded-lg border px-2.5 py-2 text-left transition",
                              isActive
                                ? "border-primary/35 bg-primary/5"
                                : "border-border/35 bg-background",
                            )}
                          >
                            <div className="flex items-start justify-between gap-2">
                              <div className="min-w-0">
                                <p className="line-clamp-1 text-[12px] font-medium">
                                  {article.title}
                                </p>
                                <p className="text-muted-foreground mt-0.5 line-clamp-2 text-[11px]">
                                  {article.summary}
                                </p>
                              </div>
                              <Badge
                                variant="outline"
                                className={cn(
                                  "h-5 rounded-md px-1.5 text-[10px]",
                                  sourceBadgeClass(article.source),
                                )}
                              >
                                {sentenceCase(article.source)}
                              </Badge>
                            </div>
                            <div className="text-muted-foreground mt-1.5 flex items-center gap-1 text-[10px]">
                              <span>{formatUpdatedAt(article.updatedAt)}</span>
                              <Dot className="size-3" />
                              <span>{sentenceCase(article.publishState)}</span>
                            </div>
                          </button>
                        );
                      })
                    ) : source === "project" ? (
                      <CompactEmpty
                        icon={Layers3}
                        title="No project knowledge yet"
                        description={
                          projectKnowledgeCount
                            ? "Try resetting filters to reveal project articles."
                            : "No project summaries are indexed yet. Create or update projects and they will appear here."
                        }
                      />
                    ) : (
                      <CompactEmpty
                        icon={Library}
                        title="No matching knowledge yet"
                        description="Try broader filters or publish more docs into the index."
                      />
                    )}
                  </div>
                </ScrollArea>

                <div className="mt-2 flex items-center justify-between gap-2 px-1">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="h-7 text-[11px]"
                    disabled={!pagination?.hasPrevPage}
                    onClick={() =>
                      setPage((current) => Math.max(1, current - 1))
                    }
                  >
                    <ChevronLeft className="size-3.5" />
                    Prev
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="h-7 text-[11px]"
                    onClick={resetFilters}
                    disabled={!hasActiveFilters}
                  >
                    <RefreshCcw className="size-3.5" />
                    Reset
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="h-7 text-[11px]"
                    disabled={!pagination?.hasNextPage}
                    onClick={() => setPage((current) => current + 1)}
                  >
                    Next
                    <ChevronRight className="size-3.5" />
                  </Button>
                </div>
              </>
            )}
            {isRefreshing ? <PaneSyncOverlay /> : null}
          </div>
        </section>

        <section
          data-tour="knowledge-base-detail"
          className="bg-background relative flex min-h-0 flex-col overflow-hidden rounded-xl border border-border/45"
        >
          <div className="space-y-2 border-b px-3 py-3">
            <div className="flex flex-wrap items-start justify-between gap-2">
              <div className="min-w-0 space-y-1">
                <h2 className="line-clamp-1 text-[14px] font-medium">
                  {selectedArticle?.title || "Select an article"}
                </h2>
                {selectedArticle ? (
                  <div className="flex flex-wrap items-center gap-1.5">
                    <Badge
                      variant="outline"
                      className={cn(
                        "h-5 rounded-md px-1.5 text-[10px]",
                        sourceBadgeClass(selectedArticle.source),
                      )}
                    >
                      {selectedArticle.source === "doc" ? (
                        <BookOpen className="mr-1 size-3" />
                      ) : selectedArticle.source === "project" ? (
                        <Layers3 className="mr-1 size-3" />
                      ) : (
                        <Compass className="mr-1 size-3" />
                      )}
                      {sentenceCase(selectedArticle.source)}
                    </Badge>
                    <Badge
                      variant="outline"
                      className="h-5 rounded-md px-1.5 text-[10px]"
                    >
                      {Math.round(
                        Number(selectedArticle.confidenceScore || 0) * 100,
                      )}
                      %
                    </Badge>
                    {selectedArticle.featured ? (
                      <Badge
                        variant="outline"
                        className="h-5 rounded-md px-1.5 text-[10px]"
                      >
                        <Star className="mr-1 size-3" />
                        Featured
                      </Badge>
                    ) : null}
                    {selectedArticle.pinned ? (
                      <Badge
                        variant="outline"
                        className="h-5 rounded-md px-1.5 text-[10px]"
                      >
                        <Pin className="mr-1 size-3" />
                        Pinned
                      </Badge>
                    ) : null}
                  </div>
                ) : (
                  <p className="text-muted-foreground text-[11px]">
                    Pick an item from the middle list to inspect details.
                  </p>
                )}
              </div>

              {selectedArticle ? (
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="h-8 text-[11px]"
                  onClick={() =>
                    router.push(selectedArticle.route || ROUTES.DASHBOARD)
                  }
                >
                  Open article
                  <ExternalLink className="size-3.5" />
                </Button>
              ) : null}
            </div>
          </div>

          <div className="relative min-h-0 flex-1 px-3 py-3">
            {isInitialLoading ? (
              <PaneLoader />
            ) : selectedArticle ? (
              <Tabs defaultValue="content" className="h-full min-h-0 gap-3">
                <TabsList className="h-8 w-full justify-start bg-transparent p-0">
                  <TabsTrigger
                    value="content"
                    className="h-8 flex-none rounded-md border border-border/45 px-3 text-[11px] data-[state=active]:border-primary/35"
                  >
                    Content
                  </TabsTrigger>
                  <TabsTrigger
                    value="insight"
                    className="h-8 flex-none rounded-md border border-border/45 px-3 text-[11px] data-[state=active]:border-primary/35"
                  >
                    Insight
                  </TabsTrigger>
                  <TabsTrigger
                    value="activity"
                    className="h-8 flex-none rounded-md border border-border/45 px-3 text-[11px] data-[state=active]:border-primary/35"
                  >
                    Activity
                  </TabsTrigger>
                </TabsList>

                <TabsContent
                  value="content"
                  className="mt-0 flex min-h-0 flex-1 flex-col space-y-3"
                >
                  <div className="rounded-lg border border-border/40 p-3">
                    <p className="text-[11px] leading-6 whitespace-pre-wrap">
                      {selectedArticle.summary}
                    </p>
                  </div>

                  <ScrollArea className="min-h-0 flex-1 rounded-lg border border-border/40 p-3">
                    <div className="prose prose-sm dark:prose-invert max-w-none">
                      <p className="text-[12px] leading-6 whitespace-pre-wrap">
                        {selectedArticle.body}
                      </p>
                    </div>
                  </ScrollArea>
                </TabsContent>

                <TabsContent
                  value="insight"
                  className="mt-0 flex min-h-0 flex-1 flex-col gap-3"
                >
                  <div className="grid grid-cols-2 gap-2 md:grid-cols-4">
                    <article className="rounded-lg border border-border/40 p-2.5">
                      <p className="text-muted-foreground text-[10px]">
                        Confidence
                      </p>
                      <p className="mt-1 text-[13px] font-semibold">
                        {Math.round(
                          Number(selectedArticle.confidenceScore || 0) * 100,
                        )}
                        %
                      </p>
                    </article>
                    <article className="rounded-lg border border-border/40 p-2.5">
                      <p className="text-muted-foreground text-[10px]">Tags</p>
                      <p className="mt-1 text-[13px] font-semibold">
                        {selectedArticle.tags.length}
                      </p>
                    </article>
                    <article className="rounded-lg border border-border/40 p-2.5">
                      <p className="text-muted-foreground text-[10px]">
                        Category
                      </p>
                      <p className="mt-1 line-clamp-1 text-[13px] font-semibold">
                        {sentenceCase(selectedArticle.category)}
                      </p>
                    </article>
                    <article className="rounded-lg border border-border/40 p-2.5">
                      <p className="text-muted-foreground text-[10px]">State</p>
                      <p className="mt-1 text-[13px] font-semibold">
                        {sentenceCase(selectedArticle.publishState)}
                      </p>
                    </article>
                  </div>

                  <ScrollArea className="min-h-0 flex-1 rounded-lg border border-border/40 p-2">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Metric</TableHead>
                          <TableHead>Value</TableHead>
                          <TableHead>Status</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {contentPreviewRows(selectedArticle).map((row) => (
                          <TableRow key={row.id}>
                            <TableCell className="text-[11px]">
                              {row.name}
                            </TableCell>
                            <TableCell className="text-[11px]">
                              {row.value}
                            </TableCell>
                            <TableCell className="text-[11px]">
                              {row.status}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </ScrollArea>
                </TabsContent>

                <TabsContent
                  value="activity"
                  className="mt-0 flex min-h-0 flex-1 flex-col gap-2"
                >
                  <article className="rounded-lg border border-border/40 p-3">
                    <p className="text-muted-foreground text-[10px]">
                      Last indexed
                    </p>
                    <p className="mt-1 text-[12px] font-medium">
                      {formatUpdatedAt(selectedArticle.updatedAt)}
                    </p>
                  </article>
                  <article className="rounded-lg border border-border/40 p-3">
                    <p className="text-muted-foreground text-[10px]">Route</p>
                    <p className="mt-1 line-clamp-1 text-[12px]">
                      {selectedArticle.route}
                    </p>
                  </article>
                  <article className="rounded-lg border border-border/40 p-3">
                    <p className="text-muted-foreground text-[10px]">
                      Top tags
                    </p>
                    <div className="mt-1 flex flex-wrap gap-1">
                      {selectedArticle.tags.length ? (
                        selectedArticle.tags.slice(0, 14).map((item) => (
                          <Badge
                            key={item}
                            variant="outline"
                            className="h-5 px-1.5 text-[10px]"
                          >
                            {item}
                          </Badge>
                        ))
                      ) : (
                        <span className="text-muted-foreground text-[11px]">
                          No tags added yet.
                        </span>
                      )}
                    </div>
                  </article>
                </TabsContent>
              </Tabs>
            ) : (
              <CompactEmpty
                icon={BookOpen}
                title="Select an article"
                description="Pick an item from the middle list to view content and insights."
              />
            )}
            {isRefreshing ? <PaneSyncOverlay /> : null}
          </div>
        </section>
      </div>
    </section>
  );
}

function cleanString(value: string) {
  return String(value || "").trim();
}
