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
  FieldLabel,
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
  Info,
  Link2,
  Loader2,
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
import useUser from "@/hooks/use-user";
import useFile from "@/hooks/use-file";
import { UpdateUserBody } from "@/types/auth";
import { getMissingProfileCompletionFields } from "@/lib/helpers/profile-completion";
import { Country, State } from "country-state-city";

type ProfileFormState = {
  firstName: string;
  lastName: string;
  email: string;
  phoneNumber: string;
  githubUsername: string;
  addressLine1: string;
  addressLine2: string;
  city: string;
  state: string;
  postalCode: string;
  country: string;
  avatarId: string;
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
  phoneNumber: user?.phoneNumber ?? "",
  githubUsername: user?.githubUsername ?? "",
  addressLine1: user?.addressLine1 ?? "",
  addressLine2: user?.addressLine2 ?? "",
  city: user?.city ?? "",
  state: user?.state ?? "",
  postalCode: user?.postalCode ?? "",
  country: user?.country ?? "",
  avatarId: user?.profilePhoto?._id ?? "",
  avatarUrl: user?.profilePhoto?.url ?? "",
});

const SettingsProfile = () => {
  // Store
  const { user, setUser } = useAuthStore();

  // Refs
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Hooks
  const { copy, copied } = useCopyToClipboard();
  const { useUpdateUser } = useUser();
  const { useUploadAsset } = useFile();

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

  // Mutations
  const { mutate: updateProfile, isPending: isSavingProfile } = useUpdateUser({
    onSuccess: (data) => {
      const updatedUser = data?.data?.user;
      if (updatedUser) {
        setUser(updatedUser);
      }
      const nextProfile = buildInitialProfile(updatedUser ?? user);
      setProfile(nextProfile);
      setSavedProfile(nextProfile);
      toast.success("Profile updated", {
        description: "Your profile details have been saved.",
      });
    },
  });

  const { mutate: uploadProfileImage, isPending: isUploadingProfileImage } =
    useUploadAsset({
      onSuccess: (data) => {
        const asset = data?.data?.asset;
        if (!asset) {
          return;
        }

        setProfile((prev) => ({
          ...prev,
          avatarId: asset._id,
          avatarUrl: asset.url,
        }));

        toast.success("Photo uploaded", {
          description: "Save profile to persist this change.",
        });
      },
    });

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

  const missingProfileFields = useMemo(
    () => getMissingProfileCompletionFields(profile),
    [profile],
  );

  const countryOptions = useMemo(
    () =>
      Country.getAllCountries()
        .map((country) => ({
          code: country.isoCode,
          label: country.name,
        }))
        .sort((a, b) => a.label.localeCompare(b.label)),
    [],
  );

  const countryCodeByName = useMemo(
    () =>
      new Map(countryOptions.map((country) => [country.label, country.code])),
    [countryOptions],
  );

  const selectedCountryCode = useMemo(
    () => countryCodeByName.get(profile.country) ?? "",
    [countryCodeByName, profile.country],
  );

  const stateOptions = useMemo(() => {
    if (!selectedCountryCode) {
      return [];
    }

    return State.getStatesOfCountry(selectedCountryCode)
      .map((state) => ({
        code: state.isoCode,
        label: state.name,
      }))
      .sort((a, b) => a.label.localeCompare(b.label));
  }, [selectedCountryCode]);

  const countryValue = useMemo(
    () => (countryCodeByName.has(profile.country) ? profile.country : ""),
    [countryCodeByName, profile.country],
  );

  const stateValue = useMemo(
    () =>
      stateOptions.some((state) => state.label === profile.state)
        ? profile.state
        : "",
    [profile.state, stateOptions],
  );

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

    if (!user?._id) {
      toast.error("Unable to upload image", {
        description: "No user session is available.",
      });
      return;
    }

    const formData = new FormData();
    formData.append("file", file);
    formData.append("folder", "profile");
    formData.append("ownerId", String(user._id));
    uploadProfileImage(formData);
    event.target.value = "";
  };

  const handleRemoveAvatar = () => {
    setProfile((prev) => ({
      ...prev,
      avatarId: "",
      avatarUrl: "",
    }));
  };

  const handleSaveProfile = () => {
    const payload: UpdateUserBody = {
      firstName: profile.firstName.trim(),
      lastName: profile.lastName.trim(),
      profilePhoto: profile.avatarId || null,
      phoneNumber: profile.phoneNumber.trim(),
      githubUsername: profile.githubUsername.trim(),
      addressLine1: profile.addressLine1.trim(),
      addressLine2: profile.addressLine2.trim(),
      city: profile.city.trim(),
      state: profile.state.trim(),
      postalCode: profile.postalCode.trim(),
      country: profile.country.trim(),
    };

    updateProfile(payload);
  };

  const handleResetProfile = () => {
    setProfile(savedProfile);
  };

  const handleCountryChange = (countryName: string) => {
    const code = countryCodeByName.get(countryName);
    const nextStateOptions = code
      ? State.getStatesOfCountry(code).map((state) => state.name)
      : [];

    setProfile((prev) => ({
      ...prev,
      country: countryName,
      state: nextStateOptions.includes(prev.state) ? prev.state : "",
    }));
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
        phoneNumber: profile.phoneNumber,
        githubUsername: profile.githubUsername,
        addressLine1: profile.addressLine1,
        addressLine2: profile.addressLine2,
        city: profile.city,
        state: profile.state,
        postalCode: profile.postalCode,
        country: profile.country,
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

        {missingProfileFields.length > 0 ? (
          <div className="mb-2 rounded-md border border-primary/25 bg-primary/8 px-3 py-2 text-xs text-foreground">
            <div className="flex items-start gap-2">
              <Info className="mt-0.5 size-3.5 shrink-0 text-primary" />
              <div className="space-y-1">
                <p className="font-medium">Complete your profile</p>
                <p className="text-muted-foreground">
                  Add{" "}
                  {missingProfileFields.map((item) => item.label).join(", ")} to
                  finish your account setup.
                </p>
              </div>
            </div>
          </div>
        ) : null}

        <div className="rounded-lg">
          <div className="flex flex-wrap items-center gap-4">
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
                {getInitials(
                  profile.firstName,
                  profile.lastName,
                  profile.email,
                )}
              </AvatarFallback>
            </Avatar>

            <FieldContent className="min-w-0 flex-1">
              <FieldTitle>Profile Photo</FieldTitle>
              <FieldDescription>
                Shown in comments, mentions, and member lists.
              </FieldDescription>
            </FieldContent>

            <div className="ml-auto flex items-center gap-2">
              <Button
                size="sm"
                variant="outline"
                loading={isUploadingProfileImage}
                onClick={handlePickAvatar}
              >
                {isUploadingProfileImage ? (
                  <Loader2 className="animate-spin" />
                ) : (
                  <Upload />
                )}
                Upload
              </Button>
              <Button
                size="sm"
                variant="ghost"
                onClick={handleRemoveAvatar}
                disabled={!profile.avatarUrl || isUploadingProfileImage}
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

          <div className="mt-4 grid gap-4 md:grid-cols-2">
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

            <Input
              label="Phone number"
              id="settings-phone-number"
              className="max-w-none"
              value={profile.phoneNumber}
              onChange={(event) =>
                updateProfileField("phoneNumber", event.target.value)
              }
              placeholder="+234 800 000 0000"
              tip="Phone verification will be enabled in a later pass."
            />

            <Input
              label="GitHub username"
              id="settings-github-username"
              className="max-w-none"
              value={profile.githubUsername}
              onChange={(event) =>
                updateProfileField("githubUsername", event.target.value)
              }
              placeholder="@octocat"
              tip="Used for GitHub assignee sync when projects are linked to GitHub."
            />

            <Input
              label="City"
              id="settings-city"
              className="max-w-none"
              value={profile.city}
              onChange={(event) =>
                updateProfileField("city", event.target.value)
              }
              placeholder="Enter your city"
            />

            <Input
              label="Address line 1"
              id="settings-address-line-1"
              className="max-w-none md:col-span-2"
              value={profile.addressLine1}
              onChange={(event) =>
                updateProfileField("addressLine1", event.target.value)
              }
              placeholder="Street address"
            />

            <Input
              label="Address line 2"
              id="settings-address-line-2"
              className="max-w-none md:col-span-2"
              value={profile.addressLine2}
              onChange={(event) =>
                updateProfileField("addressLine2", event.target.value)
              }
              placeholder="Apartment, suite, landmark (optional)"
            />

            <Field className="md:col-span-1">
              <FieldLabel htmlFor="settings-country-select">Country</FieldLabel>
              <Select value={countryValue} onValueChange={handleCountryChange}>
                <SelectTrigger
                  id="settings-country-select"
                  className="w-full max-w-none"
                >
                  <SelectValue placeholder="Select country" />
                </SelectTrigger>
                <SelectContent className="max-h-80">
                  {countryOptions.map((country) => (
                    <SelectItem key={country.code} value={country.label}>
                      {country.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>

            <Field>
              <FieldLabel htmlFor="settings-state-select">
                State / Region
              </FieldLabel>
              <Select
                value={stateValue}
                onValueChange={(value) => updateProfileField("state", value)}
                disabled={!selectedCountryCode || stateOptions.length === 0}
              >
                <SelectTrigger
                  id="settings-state-select"
                  className="w-full max-w-none"
                >
                  <SelectValue
                    placeholder={
                      selectedCountryCode
                        ? "Select state / region"
                        : "Select country first"
                    }
                  />
                </SelectTrigger>
                <SelectContent className="max-h-80">
                  {stateOptions.map((state) => (
                    <SelectItem key={state.code} value={state.label}>
                      {state.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {!selectedCountryCode || stateOptions.length === 0 ? (
                <FieldDescription>
                  This country does not have mapped states, or no country is
                  selected yet.
                </FieldDescription>
              ) : null}
            </Field>

            <Input
              label="Postal code"
              id="settings-postal-code"
              value={profile.postalCode}
              onChange={(event) =>
                updateProfileField("postalCode", event.target.value)
              }
              placeholder="Postal code"
            />
          </div>
        </div>

        <Input
          label="Email address"
          id="settings-email"
          value={profile.email}
          readOnly
          tip="Email changes are managed through authentication settings."
        />

        <div className="flex items-center gap-2">
          <Button
            className="max-w-20"
            size="sm"
            disabled={
              !profileChanged || isSavingProfile || isUploadingProfileImage
            }
            loading={isSavingProfile}
            onClick={handleSaveProfile}
          >
            Save
          </Button>
          <Button
            className="max-w-20"
            size="sm"
            variant="ghost"
            disabled={
              !profileChanged || isSavingProfile || isUploadingProfileImage
            }
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
