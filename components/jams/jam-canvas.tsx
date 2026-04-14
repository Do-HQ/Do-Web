"use client";

import * as React from "react";
import dynamic from "next/dynamic";
import { useTheme } from "next-themes";
import {
  sceneCoordsToViewportCoords,
  viewportCoordsToSceneCoords,
} from "@excalidraw/excalidraw";

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
  commentModeEnabled?: boolean;
  commentPins?: Array<{
    id: string;
    position: { x: number; y: number } | null;
    status: "open" | "resolved";
  }>;
  selectedPinId?: string;
  hideResolvedPins?: boolean;
  className?: string;
  onSnapshotChange?: (snapshot: Record<string, unknown>) => void;
  onCreateCommentPin?: (position: {
    scene: { x: number; y: number };
    viewport: { left: number; top: number };
  }) => void;
  onSelectCommentPin?: (threadId: string) => void;
  onSelectedPinViewportChange?: (
    position: { left: number; top: number } | null,
  ) => void;
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
  getAppState?: () => {
    zoom: { value: number };
    offsetLeft: number;
    offsetTop: number;
    scrollX: number;
    scrollY: number;
  };
  onScrollChange?: (cb: () => void) => (() => void) | void;
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
  commentModeEnabled = false,
  commentPins = [],
  selectedPinId = "",
  hideResolvedPins = true,
  className,
  onSnapshotChange,
  onCreateCommentPin,
  onSelectCommentPin,
  onSelectedPinViewportChange,
  onRegisterSnapshotGetter,
}: JamCanvasProps) => {
  const { resolvedTheme } = useTheme();
  const apiRef = React.useRef<ExcalidrawApi | null>(null);
  const containerRef = React.useRef<HTMLDivElement | null>(null);
  const applyingSnapshotRef = React.useRef(false);
  const initialHydrationRef = React.useRef(true);
  const [appStateTick, setAppStateTick] = React.useState(0);
  const lastSelectedViewportRef = React.useRef<{ left: number; top: number } | null>(
    null,
  );

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
    (
      elements: readonly unknown[],
      _appState: unknown,
      files: Record<string, unknown>,
    ) => {
      setAppStateTick((value) => value + 1);
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

  React.useEffect(() => {
    if (!apiRef.current?.onScrollChange) {
      return;
    }

    const unsubscribe = apiRef.current.onScrollChange(() => {
      setAppStateTick((value) => value + 1);
    });

    return () => {
      if (typeof unsubscribe === "function") {
        unsubscribe();
      }
    };
  }, [jamId]);

  const visiblePins = React.useMemo(
    () =>
      (Array.isArray(commentPins) ? commentPins : []).filter((pin) => {
        if (!pin?.position) {
          return false;
        }
        if (!hideResolvedPins) {
          return true;
        }
        return pin.status === "open" || pin.id === selectedPinId;
      }),
    [commentPins, hideResolvedPins, selectedPinId],
  );

  const projectedPins = React.useMemo(() => {
    const appState = apiRef.current?.getAppState?.();
    const containerBounds = containerRef.current?.getBoundingClientRect();
    if (!appState || !containerBounds) {
      return [];
    }

    return visiblePins
      .map((pin) => {
        if (!pin.position) {
          return null;
        }
        const viewport = sceneCoordsToViewportCoords(
          {
            sceneX: Number(pin.position.x),
            sceneY: Number(pin.position.y),
          },
          appState as never,
        );

        return {
          ...pin,
          left: Number(viewport.x) - containerBounds.left,
          top: Number(viewport.y) - containerBounds.top,
        };
      })
      .filter(Boolean) as Array<
      (typeof visiblePins)[number] & { left: number; top: number }
    >;
  }, [appStateTick, visiblePins]);

  React.useEffect(() => {
    if (!onSelectedPinViewportChange) {
      return;
    }

    const selectedPin = projectedPins.find(
      (entry) => String(entry.id || "") === String(selectedPinId || ""),
    );
    if (!selectedPin) {
      lastSelectedViewportRef.current = null;
      onSelectedPinViewportChange(null);
      return;
    }

    const nextPosition = {
      left: Number(selectedPin.left || 0),
      top: Number(selectedPin.top || 0),
    };
    const previous = lastSelectedViewportRef.current;
    if (
      previous &&
      Math.abs(previous.left - nextPosition.left) < 0.5 &&
      Math.abs(previous.top - nextPosition.top) < 0.5
    ) {
      return;
    }
    lastSelectedViewportRef.current = nextPosition;
    onSelectedPinViewportChange(nextPosition);
  }, [onSelectedPinViewportChange, projectedPins, selectedPinId]);

  const handleCommentOverlayPointerDown = React.useCallback(
    (event: React.PointerEvent<HTMLDivElement>) => {
      if (!commentModeEnabled || !onCreateCommentPin) {
        return;
      }

      const appState = apiRef.current?.getAppState?.();
      if (!appState) {
        return;
      }

      event.preventDefault();
      event.stopPropagation();

      const sceneCoords = viewportCoordsToSceneCoords(
        {
          clientX: event.clientX,
          clientY: event.clientY,
        },
        appState as never,
      );

      const containerBounds = containerRef.current?.getBoundingClientRect();
      onCreateCommentPin({
        scene: {
          x: Number(sceneCoords.x),
          y: Number(sceneCoords.y),
        },
        viewport: {
          left: Math.max(
            0,
            Number(event.clientX) - Number(containerBounds?.left || 0),
          ),
          top: Math.max(
            0,
            Number(event.clientY) - Number(containerBounds?.top || 0),
          ),
        },
      });
    },
    [commentModeEnabled, onCreateCommentPin],
  );

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
    <div
      ref={containerRef}
      className={cn(
        "jam-excalidraw relative h-full min-h-0 w-full overflow-hidden",
        commentModeEnabled && "cursor-crosshair",
        className,
      )}
    >
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
      <div
        className={cn(
          "absolute inset-0 z-20",
          commentModeEnabled ? "pointer-events-auto" : "pointer-events-none",
        )}
        onPointerDown={handleCommentOverlayPointerDown}
      >
        {projectedPins.map((pin, index) => {
          const isSelected = String(selectedPinId || "") === String(pin.id);
          const isResolved = pin.status === "resolved";
          const displayIndex = index + 1;

          return (
            <button
              key={pin.id}
              type="button"
              className={cn(
                "absolute grid size-7 -translate-x-1/2 -translate-y-1/2 place-items-center rounded-full border text-[11px] font-semibold transition",
                "pointer-events-auto",
                isResolved
                  ? "border-border/70 bg-muted/90 text-muted-foreground"
                  : "border-primary/35 bg-primary text-primary-foreground",
                isSelected && "ring-2 ring-primary/40 ring-offset-2 ring-offset-background",
              )}
              style={{
                left: `${pin.left}px`,
                top: `${pin.top}px`,
              }}
              onPointerDown={(event) => event.stopPropagation()}
              onClick={(event) => {
                event.stopPropagation();
                onSelectCommentPin?.(pin.id);
              }}
              aria-label={`Open comment thread ${displayIndex}`}
              title={`Open comment thread ${displayIndex}`}
            >
              {displayIndex}
            </button>
          );
        })}
      </div>
      {!canEdit ? (
        <div className="bg-background/90 text-muted-foreground pointer-events-none absolute top-3 right-3 z-20 rounded-md border px-2 py-1 text-[11px]">
          Read-only jam
        </div>
      ) : null}
    </div>
  );
};

export default JamCanvas;
