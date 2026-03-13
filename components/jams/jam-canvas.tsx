"use client";

import * as React from "react";
import dynamic from "next/dynamic";
import { useTheme } from "next-themes";

import { cn } from "@/lib/utils";

const Excalidraw = dynamic(
  () => import("@excalidraw/excalidraw").then((module) => module.Excalidraw),
  {
    ssr: false,
  },
);

type JamCanvasProps = {
  jamId: string;
  snapshot: Record<string, unknown> | null;
  canEdit: boolean;
  gridModeEnabled?: boolean;
  className?: string;
  onSnapshotChange?: (snapshot: Record<string, unknown>) => void;
  onRegisterSnapshotGetter?: (
    getter: (() => Record<string, unknown> | null) | null,
  ) => void;
};

type ExcalidrawSnapshot = {
  elements: unknown[];
  files: Record<string, unknown>;
};

type ExcalidrawApi = {
  updateScene: (scene: {
    elements?: unknown[];
    files?: Record<string, unknown>;
  }) => void;
  getSceneElements?: () => readonly unknown[];
  getFiles?: () => Record<string, unknown>;
  scrollToContent?: (
    target?: readonly unknown[],
    options?: {
      fitToContent?: boolean;
      animate?: boolean;
    },
  ) => void;
};

const EMPTY_SCENE: ExcalidrawSnapshot = {
  elements: [],
  files: {},
};

const normalizeSnapshot = (
  snapshot: Record<string, unknown> | null,
): ExcalidrawSnapshot => {
  if (!snapshot || typeof snapshot !== "object") {
    return EMPTY_SCENE;
  }

  const elements = Array.isArray(snapshot.elements)
    ? snapshot.elements.filter((entry) => {
        if (!entry || typeof entry !== "object") {
          return false;
        }
        return !Boolean((entry as { isDeleted?: boolean }).isDeleted);
      })
    : [];
  const files =
    snapshot.files && typeof snapshot.files === "object"
      ? (snapshot.files as Record<string, unknown>)
      : {};
  return {
    elements,
    files,
  };
};

const JamCanvas = ({
  jamId,
  snapshot,
  canEdit,
  gridModeEnabled = false,
  className,
  onSnapshotChange,
  onRegisterSnapshotGetter,
}: JamCanvasProps) => {
  const { resolvedTheme } = useTheme();
  const apiRef = React.useRef<ExcalidrawApi | null>(null);
  const applyingSnapshotRef = React.useRef(false);
  const initialHydrationRef = React.useRef(true);

  const normalizedSnapshot = React.useMemo(
    () => normalizeSnapshot(snapshot),
    [snapshot],
  );
  const initialData = React.useMemo(
    () =>
      ({
        elements: normalizedSnapshot.elements as unknown[],
        files: normalizedSnapshot.files as Record<string, unknown>,
      }) as unknown,
    [normalizedSnapshot],
  );

  const applySnapshot = React.useCallback((nextSnapshot: ExcalidrawSnapshot) => {
    if (!apiRef.current) {
      return;
    }

    applyingSnapshotRef.current = true;

    try {
      apiRef.current.updateScene({
        elements: nextSnapshot.elements,
        files: nextSnapshot.files,
      });
    } catch {
      apiRef.current.updateScene({
        elements: EMPTY_SCENE.elements,
        files: EMPTY_SCENE.files,
      });
    }

    requestAnimationFrame(() => {
      if (
        initialHydrationRef.current &&
        Array.isArray(nextSnapshot.elements) &&
        nextSnapshot.elements.length > 0
      ) {
        try {
          apiRef.current?.scrollToContent?.(nextSnapshot.elements, {
            fitToContent: true,
            animate: false,
          });
        } catch {
          // best-effort
        }
      }

      applyingSnapshotRef.current = false;
    });
  }, []);

  React.useEffect(() => {
    initialHydrationRef.current = true;
  }, [jamId]);

  React.useEffect(() => {
    applySnapshot(normalizedSnapshot);
    const retryTimer = window.setTimeout(() => {
      applySnapshot(normalizedSnapshot);
      try {
        window.dispatchEvent(new Event("resize"));
      } catch {
        // noop
      }
      initialHydrationRef.current = false;
    }, 120);

    return () => window.clearTimeout(retryTimer);
  }, [applySnapshot, jamId, normalizedSnapshot]);

  const handleApiRef = React.useCallback(
    (api: unknown) => {
      apiRef.current = (api as ExcalidrawApi) || null;
      applySnapshot(normalizedSnapshot);
    },
    [applySnapshot, normalizedSnapshot],
  );

  const handleChange = React.useCallback(
    (elements: readonly unknown[], _appState: unknown, files: Record<string, unknown>) => {
      if (applyingSnapshotRef.current || !onSnapshotChange) {
        return;
      }

      const liveElements = Array.isArray(apiRef.current?.getSceneElements?.())
        ? [...(apiRef.current?.getSceneElements?.() || [])]
        : [...elements];

      const visibleElements = liveElements.filter((entry) => {
        if (!entry || typeof entry !== "object") {
          return false;
        }
        return !Boolean((entry as { isDeleted?: boolean }).isDeleted);
      });

      const sceneFiles =
        (apiRef.current?.getFiles?.() as Record<string, unknown> | undefined) ||
        files ||
        {};

      onSnapshotChange({
        type: "excalidraw",
        elements: visibleElements,
        files: sceneFiles,
      });
    },
    [onSnapshotChange],
  );

  React.useEffect(() => {
    if (!onRegisterSnapshotGetter) {
      return;
    }

    const getter = () => {
      const liveElements = Array.isArray(apiRef.current?.getSceneElements?.())
        ? [...(apiRef.current?.getSceneElements?.() || [])]
        : [];
      const visibleElements = liveElements.filter((entry) => {
        if (!entry || typeof entry !== "object") {
          return false;
        }
        return !Boolean((entry as { isDeleted?: boolean }).isDeleted);
      });

      const files =
        (apiRef.current?.getFiles?.() as Record<string, unknown> | undefined) ||
        {};

      return {
        type: "excalidraw",
        elements: visibleElements,
        files,
      };
    };

    onRegisterSnapshotGetter(getter);
    return () => onRegisterSnapshotGetter(null);
  }, [onRegisterSnapshotGetter]);

  const uiOptions = React.useMemo(
    () => ({
      canvasActions: {
        changeViewBackgroundColor: false,
        clearCanvas: canEdit,
        export: false as const,
        loadScene: false,
        saveToActiveFile: false,
        toggleTheme: false,
        saveAsImage: false,
      },
      tools: {
        image: false,
      },
    }),
    [canEdit],
  );

  return (
    <div className={cn("jam-excalidraw relative h-full min-h-0 w-full overflow-hidden", className)}>
      <Excalidraw
        key={jamId}
        excalidrawAPI={handleApiRef}
        initialData={initialData as never}
        onChange={handleChange}
        viewModeEnabled={!canEdit}
        zenModeEnabled
        gridModeEnabled={gridModeEnabled}
        UIOptions={uiOptions}
        theme={resolvedTheme === "dark" ? "dark" : "light"}
      />
      {!canEdit ? (
        <div className="bg-background/90 text-muted-foreground pointer-events-none absolute top-3 right-3 z-20 rounded-md border px-2 py-1 text-[11px]">
          Read-only jam
        </div>
      ) : null}
    </div>
  );
};

export default JamCanvas;
