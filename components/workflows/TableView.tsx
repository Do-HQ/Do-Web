"use client";

type TableViewProps = {
  children: React.ReactNode;
};

export function TableView({ children }: TableViewProps) {
  return (
    <section data-tour="project-workflows-table" className="space-y-3">
      {children}
    </section>
  );
}
