import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";

import { ProjectTabKey } from "../types";
import { PROJECT_TABS } from "../utils";

type ProjectOverviewTabsProps = {
  value: ProjectTabKey;
  onValueChange: (value: ProjectTabKey) => void;
};

export function ProjectOverviewTabs({
  value,
  onValueChange,
}: ProjectOverviewTabsProps) {
  return (
    <Tabs
      value={value}
      onValueChange={(nextValue) => onValueChange(nextValue as ProjectTabKey)}
      className="gap-0"
    >
      <TabsList className="h-auto w-full justify-start gap-1 overflow-x-auto rounded-none bg-transparent p-0">
        {PROJECT_TABS.map((tab) => (
          <TabsTrigger
            key={tab.key}
            value={tab.key}
            className="h-8 flex-none rounded-lg border-0 px-3 text-[12px] font-medium text-muted-foreground data-[state=active]:bg-muted/80 data-[state=active]:text-foreground data-[state=active]:shadow-none md:text-[13px]"
          >
            {tab.label}
          </TabsTrigger>
        ))}
      </TabsList>
    </Tabs>
  );
}
