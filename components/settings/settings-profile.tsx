"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import {
  Field,
  FieldContent,
  FieldDescription,
  FieldGroup,
  FieldLegend,
  FieldSeparator,
  FieldSet,
  FieldTitle,
} from "@/components/ui/field";
import { Input } from "@/components/shared/input";
import useAuthStore from "@/stores/auth";
import {
  Check,
  Copy,
  Download,
  Link2,
  LogOut,
  Trash2,
  Upload,
  X,
} from "lucide-react";
import { toast } from "sonner";
import { useCopyToClipboard } from "@/hooks/use-copy";
import { P } from "../ui/typography";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../ui/select";
import { Switch } from "../ui/switch";

type ProfileFormState = {
  firstName: string;
  lastName: string;
  email: string;
  avatarUrl: string;
};

type AgentPreferencesState = {
  copilotEnabled: boolean;
  autoScheduleEnabled: boolean;
  dailySummaryEnabled: boolean;
  planningDepth: "light" | "balanced" | "deep";
  riskSensitivity: "low" | "medium" | "high";
};

const DEFAULT_AGENT_PREFERENCES: AgentPreferencesState = {
  copilotEnabled: true,
  autoScheduleEnabled: false,
  dailySummaryEnabled: true,
  planningDepth: "balanced",
  riskSensitivity: "medium",
};

const getInitials = (firstName: string, lastName: string, email: string) => {
  const fullName = `${firstName} ${lastName}`.trim();

  if (fullName) {
    return fullName
      .split(" ")
      .filter(Boolean)
      .slice(0, 2)
      .map((part) => part[0]?.toUpperCase())
      .join("");
  }

  return email?.slice(0, 2).toUpperCase() || "SQ";
};

const buildInitialProfile = (
  user: ReturnType<typeof useAuthStore.getState>["user"],
): ProfileFormState => ({
  firstName: user?.firstName ?? "",
  lastName: user?.lastName ?? "",
  email: user?.email ?? "",
  avatarUrl: user?.profilePhoto?.url ?? "",
});

const SettingsProfile = () => {
  // Store
  const { user } = useAuthStore();

  // Refs
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Hooks
  const { copy, copied } = useCopyToClipboard();

  // Memo
  const initialProfile = useMemo(() => buildInitialProfile(user), [user]);

  // State
  const [profile, setProfile] = useState<ProfileFormState>(initialProfile);
  const [savedProfile, setSavedProfile] =
    useState<ProfileFormState>(initialProfile);
  const [agentPreferences, setAgentPreferences] =
    useState<AgentPreferencesState>(DEFAULT_AGENT_PREFERENCES);
  const [savedAgentPreferences, setSavedAgentPreferences] =
    useState<AgentPreferencesState>(DEFAULT_AGENT_PREFERENCES);

  // Effects
  useEffect(() => {
    setProfile(initialProfile);
    setSavedProfile(initialProfile);
  }, [initialProfile]);

  // Derived
  const profileChanged = useMemo(() => {
    return (Object.keys(profile) as Array<keyof ProfileFormState>).some(
      (key) => profile[key] !== savedProfile[key],
    );
  }, [profile, savedProfile]);

  const agentPreferencesChanged = useMemo(() => {
    return (
      Object.keys(agentPreferences) as Array<keyof AgentPreferencesState>
    ).some((key) => agentPreferences[key] !== savedAgentPreferences[key]);
  }, [agentPreferences, savedAgentPreferences]);

  // Handlers
  const updateProfileField = (key: keyof ProfileFormState, value: string) => {
    setProfile((prev) => ({
      ...prev,
      [key]: value,
    }));
  };

  const handlePickAvatar = () => {
    fileInputRef.current?.click();
  };

  const handleAvatarUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) {
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      updateProfileField("avatarUrl", String(reader.result ?? ""));
    };
    reader.readAsDataURL(file);
  };

  const handleRemoveAvatar = () => {
    updateProfileField("avatarUrl", "");
  };

  const handleSaveProfile = () => {
    setSavedProfile(profile);
    toast.success("Profile updated", {
      description: "Profile changes are saved locally for now.",
    });
  };

  const handleResetProfile = () => {
    setProfile(savedProfile);
  };

  const handleCopyProfileLink = () => {
    if (!user?._id) {
      toast.error("Unable to copy profile link", {
        description: "No user ID is available for this profile.",
      });
      return;
    }

    const origin =
      typeof window !== "undefined"
        ? window.location.origin
        : "https://squircle.live";
    copy(`${origin}/u/${user._id}`);
    toast.success("Profile link copied");
  };

  const handleExportProfileData = () => {
    const payload = {
      profile: {
        firstName: profile.firstName,
        lastName: profile.lastName,
        email: profile.email,
        avatarUrl: profile.avatarUrl,
      },
      account: {
        userId: user?._id,
        isVerified: user?.isVerified,
        createdAt: user?.createdAt,
        workspaceCount: user?.workspaces?.length ?? 0,
      },
      agentPreferences,
      exportedAt: new Date().toISOString(),
    };

    const blob = new Blob([JSON.stringify(payload, null, 2)], {
      type: "application/json",
    });

    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `squircle-profile-${user?._id ?? "user"}.json`;
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);

    toast.success("Profile data exported");
  };

  const handleSignOutAllSessions = () => {
    toast.warning("Sign out of all sessions is not connected yet", {
      description: "Hook this action to your authentication/session API.",
    });
  };

  const handleRequestDeletion = () => {
    toast.warning("Account deletion request is not connected yet", {
      description:
        "Wire this to support workflow or account deletion endpoint.",
    });
  };

  const handleSaveAgentPreferences = () => {
    setSavedAgentPreferences(agentPreferences);
    toast.success("Agent preferences updated", {
      description: "These preferences are saved locally for now.",
    });
  };

  const handleResetAgentPreferences = () => {
    setAgentPreferences(savedAgentPreferences);
  };

  return (
    <FieldGroup className="gap-8">
      <FieldSet>
        <FieldLegend>Profile Basics</FieldLegend>
        <FieldDescription>
          Keep your account details up to date. These details identify you
          across your workspace.
        </FieldDescription>

        <div className="flex flex-wrap items-center gap-4 rounded-md border p-4 max-w-130">
          <Avatar
            size="lg"
            userCard={{
              name:
                `${profile.firstName || ""} ${profile.lastName || ""}`.trim() ||
                profile.email,
              email: profile.email,
              role: "Workspace member",
            }}
          >
            <AvatarImage src={profile.avatarUrl} alt={profile.email} />
            <AvatarFallback>
              {getInitials(profile.firstName, profile.lastName, profile.email)}
            </AvatarFallback>
          </Avatar>

          <FieldContent className="min-w-0">
            <FieldTitle>Profile Photo</FieldTitle>
            <FieldDescription>
              Shown in comments, mentions, and member lists.
            </FieldDescription>
          </FieldContent>

          <div className="ml-auto flex items-center gap-2">
            <Button size="sm" variant="outline" onClick={handlePickAvatar}>
              <Upload />
              Upload
            </Button>
            <Button
              size="sm"
              variant="ghost"
              onClick={handleRemoveAvatar}
              disabled={!profile.avatarUrl}
            >
              <X />
              Remove
            </Button>
          </div>

          <input
            ref={fileInputRef}
            type="file"
            className="hidden"
            accept="image/*"
            onChange={handleAvatarUpload}
          />
        </div>

        <div className="grid gap-4 md:grid-cols-2 max-w-130">
          <Input
            label="First name"
            id="settings-first-name"
            className="max-w-none"
            value={profile.firstName}
            onChange={(event) =>
              updateProfileField("firstName", event.target.value)
            }
            placeholder="Enter your first name"
          />

          <Input
            label="Last name"
            id="settings-last-name"
            className="max-w-none"
            value={profile.lastName}
            onChange={(event) =>
              updateProfileField("lastName", event.target.value)
            }
            placeholder="Enter your last name"
          />
        </div>

        <Input
          label="Email address"
          id="settings-email"
          value={profile.email}
          readOnly
          tip="Email changes are managed through authentication settings."
          className="max-w-130"
        />

        <div className="flex items-center gap-2">
          <Button
            className="max-w-20"
            size="sm"
            disabled={!profileChanged}
            onClick={handleSaveProfile}
          >
            Save
          </Button>
          <Button
            className="max-w-20"
            size="sm"
            variant="ghost"
            disabled={!profileChanged}
            onClick={handleResetProfile}
          >
            Reset
          </Button>
        </div>
      </FieldSet>

      <FieldSeparator />

      <FieldSet>
        <FieldLegend>Account Credentials</FieldLegend>
        <FieldDescription>
          A unique identifier tied to your user profile.
        </FieldDescription>

        <FieldContent className="flex flex-row items-center gap-2 max-w-130">
          <P className="font-medium text-base">User ID</P>
          <P className="text-muted-foreground ml-auto text-xs font-medium">
            {user?._id}
          </P>

          <Button
            size="sm"
            variant="ghost"
            onClick={() => {
              if (user?._id) {
                copy(user._id);
              }
            }}
          >
            {copied ? <Check className="text-green-500" /> : <Copy />}
          </Button>
        </FieldContent>
      </FieldSet>

      <FieldSeparator />

      <FieldSet>
        <FieldLegend>Account Actions</FieldLegend>
        <FieldDescription>
          Quick actions to manage your profile data and session access.
        </FieldDescription>

        <Field orientation="horizontal">
          <FieldContent>
            <FieldTitle>Copy profile link</FieldTitle>
            <FieldDescription>
              Share a direct link to your user profile.
            </FieldDescription>
          </FieldContent>
          <Button size="sm" variant="outline" onClick={handleCopyProfileLink}>
            <Link2 />
            Copy link
          </Button>
        </Field>

        <Field orientation="horizontal">
          <FieldContent>
            <FieldTitle>Export profile data</FieldTitle>
            <FieldDescription>
              Download a local JSON file of your account profile details.
            </FieldDescription>
          </FieldContent>
          <Button size="sm" variant="outline" onClick={handleExportProfileData}>
            <Download />
            Export
          </Button>
        </Field>

        <Field orientation="horizontal">
          <FieldContent>
            <FieldTitle>Sign out from all sessions</FieldTitle>
            <FieldDescription>
              End active sessions on all other devices.
            </FieldDescription>
          </FieldContent>
          <Button
            size="sm"
            variant="outline"
            onClick={handleSignOutAllSessions}
          >
            <LogOut />
            Sign out all
          </Button>
        </Field>

        <Field orientation="horizontal">
          <FieldContent>
            <FieldTitle>Request account deletion</FieldTitle>
            <FieldDescription>
              Permanently remove your profile and personal account data.
            </FieldDescription>
          </FieldContent>
          <Button
            size="sm"
            variant="destructive"
            onClick={handleRequestDeletion}
          >
            <Trash2 />
            Delete account
          </Button>
        </Field>
      </FieldSet>

      <FieldSeparator />

      <FieldSet>
        <FieldLegend>Agent Preferences</FieldLegend>
        <FieldDescription>
          Control how project-management agents support you in daily work.
        </FieldDescription>

        <Field orientation="horizontal">
          <FieldContent>
            <FieldTitle>Enable agent copilot</FieldTitle>
            <FieldDescription>
              Allow your assistant to suggest plans, priorities, and timelines.
            </FieldDescription>
          </FieldContent>
          <Switch
            checked={agentPreferences.copilotEnabled}
            onCheckedChange={(checked) =>
              setAgentPreferences((prev) => ({
                ...prev,
                copilotEnabled: checked,
              }))
            }
          />
        </Field>

        <Field orientation="horizontal">
          <FieldContent>
            <FieldTitle>Enable auto-scheduling</FieldTitle>
            <FieldDescription>
              Let agents auto-place tasks in your timeline.
            </FieldDescription>
          </FieldContent>
          <Switch
            checked={agentPreferences.autoScheduleEnabled}
            onCheckedChange={(checked) =>
              setAgentPreferences((prev) => ({
                ...prev,
                autoScheduleEnabled: checked,
              }))
            }
          />
        </Field>

        <Field orientation="horizontal">
          <FieldContent>
            <FieldTitle>Daily AI summary</FieldTitle>
            <FieldDescription>
              Receive a daily status digest from your active projects.
            </FieldDescription>
          </FieldContent>
          <Switch
            checked={agentPreferences.dailySummaryEnabled}
            onCheckedChange={(checked) =>
              setAgentPreferences((prev) => ({
                ...prev,
                dailySummaryEnabled: checked,
              }))
            }
          />
        </Field>

        <Field orientation="horizontal">
          <FieldContent>
            <FieldTitle>Planning depth</FieldTitle>
            <FieldDescription>
              How detailed agent-generated plans should be.
            </FieldDescription>
          </FieldContent>
          <Select
            value={agentPreferences.planningDepth}
            onValueChange={(value) =>
              setAgentPreferences((prev) => ({
                ...prev,
                planningDepth: value as AgentPreferencesState["planningDepth"],
              }))
            }
          >
            <SelectTrigger className="w-40">
              <SelectValue placeholder="Select depth" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="light">Light</SelectItem>
              <SelectItem value="balanced">Balanced</SelectItem>
              <SelectItem value="deep">Deep</SelectItem>
            </SelectContent>
          </Select>
        </Field>

        <Field orientation="horizontal">
          <FieldContent>
            <FieldTitle>Risk sensitivity</FieldTitle>
            <FieldDescription>
              How early agents should flag delivery risks.
            </FieldDescription>
          </FieldContent>
          <Select
            value={agentPreferences.riskSensitivity}
            onValueChange={(value) =>
              setAgentPreferences((prev) => ({
                ...prev,
                riskSensitivity:
                  value as AgentPreferencesState["riskSensitivity"],
              }))
            }
          >
            <SelectTrigger className="w-40">
              <SelectValue placeholder="Select sensitivity" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="low">Low</SelectItem>
              <SelectItem value="medium">Medium</SelectItem>
              <SelectItem value="high">High</SelectItem>
            </SelectContent>
          </Select>
        </Field>

        <div className="flex items-center gap-2 mt-8">
          <Button
            className="max-w-20"
            size="sm"
            disabled={!agentPreferencesChanged}
            onClick={handleSaveAgentPreferences}
          >
            Save
          </Button>
          <Button
            className="max-w-20"
            size="sm"
            variant="ghost"
            disabled={!agentPreferencesChanged}
            onClick={handleResetAgentPreferences}
          >
            Reset
          </Button>
        </div>
      </FieldSet>
    </FieldGroup>
  );
};

export default SettingsProfile;
