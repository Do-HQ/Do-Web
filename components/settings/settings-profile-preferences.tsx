"use client";

import { useEffect, useMemo, useState } from "react";
import { useTheme } from "next-themes";
import { toast } from "sonner";

import useAuthStore from "@/stores/auth";
import useUser from "@/hooks/use-user";
import { getUserPreferences } from "@/lib/helpers/user-preferences";
import type {
  UserPreferences,
  UserStartPagePreference,
  UserThemePreference,
} from "@/types/auth";
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

type AppearancePreferences = UserPreferences["appearance"];
type WorkspacePreferences = UserPreferences["workspace"];

const hasChanges = <T extends Record<string, string | boolean>>(
  value: T,
  saved: T,
) =>
  (Object.keys(value) as Array<keyof T>).some((key) => value[key] !== saved[key]);

const SettingsProfilePreferences = () => {
  const { user, setUser } = useAuthStore();
  const { setTheme } = useTheme();
  const { useUpdateUser } = useUser();
  const { mutateAsync: updateUserPreferences, isPending: isSavingPreferences } =
    useUpdateUser({
      onSuccess: (response) => {
        const nextUser = response?.data?.user;
        if (nextUser) {
          setUser(nextUser);
        }
      },
    });

  const initialPreferences = useMemo(() => getUserPreferences(user), [user]);

  const [appearance, setAppearance] = useState<AppearancePreferences>(
    initialPreferences.appearance,
  );
  const [savedAppearance, setSavedAppearance] = useState<AppearancePreferences>(
    initialPreferences.appearance,
  );
  const [workspace, setWorkspace] = useState<WorkspacePreferences>(
    initialPreferences.workspace,
  );
  const [savedWorkspace, setSavedWorkspace] = useState<WorkspacePreferences>(
    initialPreferences.workspace,
  );

  useEffect(() => {
    setAppearance(initialPreferences.appearance);
    setSavedAppearance(initialPreferences.appearance);
    setWorkspace(initialPreferences.workspace);
    setSavedWorkspace(initialPreferences.workspace);
  }, [initialPreferences]);

  useEffect(() => {
    if (typeof document === "undefined") {
      return;
    }

    document.body.dataset.reduceMotion = appearance.reduceMotion
      ? "true"
      : "false";
  }, [appearance.reduceMotion]);

  const appearanceChanged = useMemo(
    () => hasChanges(appearance, savedAppearance),
    [appearance, savedAppearance],
  );

  const workspaceChanged = useMemo(
    () => hasChanges(workspace, savedWorkspace),
    [workspace, savedWorkspace],
  );

  const persistPreferences = async (nextPreferences: UserPreferences) => {
    const request = updateUserPreferences({
      preferences: nextPreferences,
    });

    toast.promise(request, {
      loading: "Saving preferences...",
      success: "Preferences updated",
      error: "Could not save preferences.",
    });

    const response = await request;
    const normalized = getUserPreferences(response?.data?.user ?? user);
    setAppearance(normalized.appearance);
    setSavedAppearance(normalized.appearance);
    setWorkspace(normalized.workspace);
    setSavedWorkspace(normalized.workspace);
  };

  const handleSaveAppearance = async () => {
    const nextPreferences: UserPreferences = {
      appearance,
      workspace: savedWorkspace,
    };
    await persistPreferences(nextPreferences);
  };

  const handleResetAppearance = () => {
    setAppearance(savedAppearance);
    setTheme(savedAppearance.theme);
  };

  const handleSaveWorkspace = async () => {
    const nextPreferences: UserPreferences = {
      appearance: savedAppearance,
      workspace,
    };
    await persistPreferences(nextPreferences);
  };

  const handleResetWorkspace = () => {
    setWorkspace(savedWorkspace);
  };

  return (
    <FieldGroup className="gap-8">
      <FieldSet>
        <FieldLegend>Appearance</FieldLegend>
        <FieldDescription>
          Personal display options applied across your app experience.
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
              const nextTheme = value as UserThemePreference;
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
            <FieldTitle>Reduce motion</FieldTitle>
            <FieldDescription>
              Reduce animations and transitions for calmer interactions.
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
            onClick={() => void handleSaveAppearance()}
            loading={isSavingPreferences}
          >
            Save
          </Button>
          <Button
            className="max-w-20"
            size="sm"
            variant="ghost"
            disabled={!appearanceChanged || isSavingPreferences}
            onClick={handleResetAppearance}
          >
            Reset
          </Button>
        </div>
      </FieldSet>

      <FieldSeparator />

      <FieldSet>
        <FieldLegend>Startup</FieldLegend>
        <FieldDescription>
          Choose where Squircle should take you after authentication.
        </FieldDescription>

        <Field orientation="horizontal">
          <FieldContent>
            <FieldTitle>Start page</FieldTitle>
            <FieldDescription>
              Set your preferred landing route when your session starts.
            </FieldDescription>
          </FieldContent>
          <Select
            value={workspace.startPage}
            onValueChange={(value) =>
              setWorkspace({
                startPage: value as UserStartPagePreference,
              })
            }
          >
            <SelectTrigger className="w-44">
              <SelectValue placeholder="Select start page" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="home">Dashboard</SelectItem>
              <SelectItem value="my-tasks">My tasks</SelectItem>
              <SelectItem value="inbox">Spaces inbox</SelectItem>
              <SelectItem value="last-visited">Last visited</SelectItem>
            </SelectContent>
          </Select>
        </Field>

        <div className="flex items-center gap-2">
          <Button
            className="max-w-20"
            size="sm"
            disabled={!workspaceChanged}
            onClick={() => void handleSaveWorkspace()}
            loading={isSavingPreferences}
          >
            Save
          </Button>
          <Button
            className="max-w-20"
            size="sm"
            variant="ghost"
            disabled={!workspaceChanged || isSavingPreferences}
            onClick={handleResetWorkspace}
          >
            Reset
          </Button>
        </div>
      </FieldSet>
    </FieldGroup>
  );
};

export default SettingsProfilePreferences;
