import DocCard from "@/components/toc/DocCard";
import { documents } from "@/constants/tocData";

export default function TableOfContents() {
  const fillerCount = documents.length % 4 === 0 ? 0 : 4 - (documents.length % 4);

  return (
    <div className="min-h-screen bg-background">
      <div className="mx-auto max-w-5xl px-4 py-16 sm:px-6 lg:px-8">

        <div className="mb-14 flex flex-col gap-5">
          <div className="flex items-center gap-3">
            <span
              className="h-px w-8 opacity-80"
              style={{ background: "var(--ring)" }}
            />
            <span className="text-[10px] font-semibold uppercase tracking-[0.2em] text-muted-foreground">
              Site Index
            </span>
          </div>

          <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <h1 className="text-4xl font-bold tracking-tight text-foreground sm:text-5xl">
                Table of Contents
              </h1>
              <p className="mt-2 text-sm text-muted-foreground">
                {documents.length} documents — everything you need, in one place.
              </p>
            </div>

            <div className="flex shrink-0 items-center gap-2 self-start rounded-full border border-border bg-muted/50 px-4 py-2 sm:self-auto">
              <span
                className="size-1.5 rounded-full"
                style={{ background: "var(--ring)" }}
              />
              <span className="text-xs text-muted-foreground">
                Last reviewed{" "}
                <span className="font-medium text-foreground">April 2025</span>
              </span>
            </div>
          </div>

          <div className="h-px w-full bg-border" />
        </div>

        <div className="overflow-hidden rounded-xl border-t border-l border-border">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {documents.map((doc) => (
              <DocCard key={doc.index} doc={doc} />
            ))}

            {fillerCount > 0 &&
              Array.from({ length: fillerCount }).map((_, i) => (
                <div
                  key={`filler-${i}`}
                  className="hidden border-b border-r border-border xl:block"
                />
              ))}
          </div>
        </div>

        <p className="mt-8 text-center text-[11px] text-muted-foreground/40">
          Can&apos;t find what you&apos;re looking for?{" "}
          <a
            href="/contact"
            className="underline underline-offset-2 transition-colors hover:text-muted-foreground"
          >
            Contact support
          </a>
        </p>
      </div>
    </div>
  );
}