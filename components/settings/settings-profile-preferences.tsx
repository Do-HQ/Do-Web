"use client";

import { useMemo, useState } from "react";
import {
  Field,
  FieldContent,
  FieldDescription,
  FieldGroup,
  FieldLegend,
  FieldSeparator,
  FieldSet,
  FieldTitle,
} from "../ui/field";
import { Button } from "../ui/button";
import { Switch } from "../ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../ui/select";
import { useTheme } from "next-themes";
import { Theme } from "@/types";
import { toast } from "sonner";

type AppearancePreferences = {
  theme: Theme;
  density: "comfortable" | "compact";
  reduceMotion: boolean;
};

type WorkspacePreferences = {
  startPage: "home" | "my-tasks" | "inbox" | "last-visited";
  defaultTaskView: "list" | "board" | "timeline";
  weekStartsOn: "monday" | "sunday";
  showCompletedTasks: boolean;
};

type ProductivityPreferences = {
  autoSaveDrafts: boolean;
  confirmBeforeDelete: boolean;
  showKeyboardShortcuts: boolean;
  enableCommandPaletteHints: boolean;
};

const DEFAULT_APPEARANCE: AppearancePreferences = {
  theme: "system",
  density: "comfortable",
  reduceMotion: false,
};

const DEFAULT_WORKSPACE: WorkspacePreferences = {
  startPage: "home",
  defaultTaskView: "list",
  weekStartsOn: "monday",
  showCompletedTasks: true,
};

const DEFAULT_PRODUCTIVITY: ProductivityPreferences = {
  autoSaveDrafts: true,
  confirmBeforeDelete: true,
  showKeyboardShortcuts: true,
  enableCommandPaletteHints: true,
};

const hasChanges = <T extends Record<string, string | boolean>>(
  value: T,
  saved: T,
) => {
  return (Object.keys(value) as Array<keyof T>).some(
    (key) => value[key] !== saved[key],
  );
};

const SettingsProfileReferences = () => {
  // Hooks
  const { theme, setTheme } = useTheme();

  // State
  const [appearance, setAppearance] = useState<AppearancePreferences>({
    ...DEFAULT_APPEARANCE,
    theme: (theme as Theme) || "system",
  });
  const [savedAppearance, setSavedAppearance] = useState<AppearancePreferences>(
    {
      ...DEFAULT_APPEARANCE,
      theme: (theme as Theme) || "system",
    },
  );

  const [workspace, setWorkspace] =
    useState<WorkspacePreferences>(DEFAULT_WORKSPACE);
  const [savedWorkspace, setSavedWorkspace] =
    useState<WorkspacePreferences>(DEFAULT_WORKSPACE);

  const [productivity, setProductivity] =
    useState<ProductivityPreferences>(DEFAULT_PRODUCTIVITY);
  const [savedProductivity, setSavedProductivity] =
    useState<ProductivityPreferences>(DEFAULT_PRODUCTIVITY);

  // Derived
  const appearanceChanged = useMemo(
    () => hasChanges(appearance, savedAppearance),
    [appearance, savedAppearance],
  );
  const workspaceChanged = useMemo(
    () => hasChanges(workspace, savedWorkspace),
    [workspace, savedWorkspace],
  );
  const productivityChanged = useMemo(
    () => hasChanges(productivity, savedProductivity),
    [productivity, savedProductivity],
  );

  // Handlers
  const handleSaveAppearance = () => {
    setSavedAppearance(appearance);
    toast.success("Appearance preferences updated", {
      description: "Appearance settings are saved locally for now.",
    });
  };

  const handleResetAppearance = () => {
    setAppearance(savedAppearance);
    setTheme(savedAppearance.theme);
  };

  const handleSaveWorkspace = () => {
    setSavedWorkspace(workspace);
    toast.success("Workspace preferences updated", {
      description: "Workspace defaults are saved locally for now.",
    });
  };

  const handleResetWorkspace = () => {
    setWorkspace(savedWorkspace);
  };

  const handleSaveProductivity = () => {
    setSavedProductivity(productivity);
    toast.success("Productivity preferences updated", {
      description: "Productivity preferences are saved locally for now.",
    });
  };

  const handleResetProductivity = () => {
    setProductivity(savedProductivity);
  };

  return (
    <FieldGroup className="gap-8">
      <FieldSet>
        <FieldLegend>Appearance</FieldLegend>
        <FieldDescription>
          Control how the interface looks and feels while you work.
        </FieldDescription>

        <Field orientation="horizontal">
          <FieldContent>
            <FieldTitle>Theme</FieldTitle>
            <FieldDescription>
              Switch between light, dark, or system mode.
            </FieldDescription>
          </FieldContent>
          <Select
            value={appearance.theme}
            onValueChange={(value) => {
              const nextTheme = value as Theme;
              setAppearance((prev) => ({ ...prev, theme: nextTheme }));
              setTheme(nextTheme);
            }}
          >
            <SelectTrigger className="w-40">
              <SelectValue placeholder="Select theme" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="system">System</SelectItem>
              <SelectItem value="light">Light</SelectItem>
              <SelectItem value="dark">Dark</SelectItem>
            </SelectContent>
          </Select>
        </Field>

        <Field orientation="horizontal">
          <FieldContent>
            <FieldTitle>Density</FieldTitle>
            <FieldDescription>
              Choose how compact interface spacing should be.
            </FieldDescription>
          </FieldContent>
          <Select
            value={appearance.density}
            onValueChange={(value) =>
              setAppearance((prev) => ({
                ...prev,
                density: value as AppearancePreferences["density"],
              }))
            }
          >
            <SelectTrigger className="w-40">
              <SelectValue placeholder="Select density" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="comfortable">Comfortable</SelectItem>
              <SelectItem value="compact">Compact</SelectItem>
            </SelectContent>
          </Select>
        </Field>

        <Field orientation="horizontal">
          <FieldContent>
            <FieldTitle>Reduce motion</FieldTitle>
            <FieldDescription>
              Minimize motion effects across transitions and overlays.
            </FieldDescription>
          </FieldContent>
          <Switch
            checked={appearance.reduceMotion}
            onCheckedChange={(checked) =>
              setAppearance((prev) => ({ ...prev, reduceMotion: checked }))
            }
          />
        </Field>

        <div className="flex items-center gap-2">
          <Button
            className="max-w-20"
            size="sm"
            disabled={!appearanceChanged}
            onClick={handleSaveAppearance}
          >
            Save
          </Button>
          <Button
            className="max-w-20"
            size="sm"
            variant="ghost"
            disabled={!appearanceChanged}
            onClick={handleResetAppearance}
          >
            Reset
          </Button>
        </div>
      </FieldSet>

      <FieldSeparator />

      <FieldSet>
        <FieldLegend>Workspace Defaults</FieldLegend>
        <FieldDescription>
          Set your preferred starting views and planning defaults.
        </FieldDescription>

        <Field orientation="horizontal">
          <FieldContent>
            <FieldTitle>Start page</FieldTitle>
            <FieldDescription>
              Choose where you land after signing in.
            </FieldDescription>
          </FieldContent>
          <Select
            value={workspace.startPage}
            onValueChange={(value) =>
              setWorkspace((prev) => ({
                ...prev,
                startPage: value as WorkspacePreferences["startPage"],
              }))
            }
          >
            <SelectTrigger className="w-44">
              <SelectValue placeholder="Select start page" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="home">Home</SelectItem>
              <SelectItem value="my-tasks">My Tasks</SelectItem>
              <SelectItem value="inbox">Inbox</SelectItem>
              <SelectItem value="last-visited">Last Visited</SelectItem>
            </SelectContent>
          </Select>
        </Field>

        <Field orientation="horizontal">
          <FieldContent>
            <FieldTitle>Default task view</FieldTitle>
            <FieldDescription>
              Pick your preferred project/task layout.
            </FieldDescription>
          </FieldContent>
          <Select
            value={workspace.defaultTaskView}
            onValueChange={(value) =>
              setWorkspace((prev) => ({
                ...prev,
                defaultTaskView:
                  value as WorkspacePreferences["defaultTaskView"],
              }))
            }
          >
            <SelectTrigger className="w-44">
              <SelectValue placeholder="Select task view" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="list">List</SelectItem>
              <SelectItem value="board">Board</SelectItem>
              <SelectItem value="timeline">Timeline</SelectItem>
            </SelectContent>
          </Select>
        </Field>

        <Field orientation="horizontal">
          <FieldContent>
            <FieldTitle>Week starts on</FieldTitle>
            <FieldDescription>
              Set your preferred weekly planning start day.
            </FieldDescription>
          </FieldContent>
          <Select
            value={workspace.weekStartsOn}
            onValueChange={(value) =>
              setWorkspace((prev) => ({
                ...prev,
                weekStartsOn: value as WorkspacePreferences["weekStartsOn"],
              }))
            }
          >
            <SelectTrigger className="w-40">
              <SelectValue placeholder="Select day" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="monday">Monday</SelectItem>
              <SelectItem value="sunday">Sunday</SelectItem>
            </SelectContent>
          </Select>
        </Field>

        <Field orientation="horizontal">
          <FieldContent>
            <FieldTitle>Show completed tasks by default</FieldTitle>
            <FieldDescription>
              Automatically include completed items in task views.
            </FieldDescription>
          </FieldContent>
          <Switch
            checked={workspace.showCompletedTasks}
            onCheckedChange={(checked) =>
              setWorkspace((prev) => ({ ...prev, showCompletedTasks: checked }))
            }
          />
        </Field>

        <div className="flex items-center gap-2">
          <Button
            className="max-w-20"
            size="sm"
            disabled={!workspaceChanged}
            onClick={handleSaveWorkspace}
          >
            Save
          </Button>
          <Button
            className="max-w-20"
            size="sm"
            variant="ghost"
            disabled={!workspaceChanged}
            onClick={handleResetWorkspace}
          >
            Reset
          </Button>
        </div>
      </FieldSet>

      <FieldSeparator />

      <FieldSet>
        <FieldLegend>Productivity</FieldLegend>
        <FieldDescription>
          Adjust interaction preferences for speed and safety.
        </FieldDescription>

        <Field orientation="horizontal">
          <FieldContent>
            <FieldTitle>Auto-save drafts</FieldTitle>
            <FieldDescription>
              Save changes automatically while you edit.
            </FieldDescription>
          </FieldContent>
          <Switch
            checked={productivity.autoSaveDrafts}
            onCheckedChange={(checked) =>
              setProductivity((prev) => ({ ...prev, autoSaveDrafts: checked }))
            }
          />
        </Field>

        <Field orientation="horizontal">
          <FieldContent>
            <FieldTitle>Confirm before delete</FieldTitle>
            <FieldDescription>
              Ask for confirmation before destructive actions.
            </FieldDescription>
          </FieldContent>
          <Switch
            checked={productivity.confirmBeforeDelete}
            onCheckedChange={(checked) =>
              setProductivity((prev) => ({
                ...prev,
                confirmBeforeDelete: checked,
              }))
            }
          />
        </Field>

        <Field orientation="horizontal">
          <FieldContent>
            <FieldTitle>Show keyboard shortcuts</FieldTitle>
            <FieldDescription>
              Display keyboard hints in menus and actions.
            </FieldDescription>
          </FieldContent>
          <Switch
            checked={productivity.showKeyboardShortcuts}
            onCheckedChange={(checked) =>
              setProductivity((prev) => ({
                ...prev,
                showKeyboardShortcuts: checked,
              }))
            }
          />
        </Field>

        <Field orientation="horizontal">
          <FieldContent>
            <FieldTitle>Command palette hints</FieldTitle>
            <FieldDescription>
              Show suggested commands as you work.
            </FieldDescription>
          </FieldContent>
          <Switch
            checked={productivity.enableCommandPaletteHints}
            onCheckedChange={(checked) =>
              setProductivity((prev) => ({
                ...prev,
                enableCommandPaletteHints: checked,
              }))
            }
          />
        </Field>

        <div className="flex items-center gap-2">
          <Button
            className="max-w-20"
            size="sm"
            disabled={!productivityChanged}
            onClick={handleSaveProductivity}
          >
            Save
          </Button>
          <Button
            className="max-w-20"
            size="sm"
            variant="ghost"
            disabled={!productivityChanged}
            onClick={handleResetProductivity}
          >
            Reset
          </Button>
        </div>
      </FieldSet>
    </FieldGroup>
  );
};

export default SettingsProfileReferences;
