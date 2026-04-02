import React, { ChangeEvent, useEffect, useRef, useState } from "react";
import {
  Field,
  FieldContent,
  FieldDescription,
  FieldGroup,
  FieldLabel,
  FieldLegend,
  FieldSeparator,
  FieldSet,
  FieldTitle,
} from "../ui/field";
import { Input } from "../shared/input";
import { Button } from "../ui/button";
import { Check, Copy, MoreHorizontal, Trash2, Upload, X } from "lucide-react";
import { P } from "../ui/typography";
import { RadioGroup, RadioGroupItem } from "../ui/radio-group";
import {
  InputGroup,
  InputGroupAddon,
  InputGroupButton,
  InputGroupInput,
  InputGroupText,
} from "../ui/input-group";
import useWorkspace from "@/hooks/use-workspace";
import useWorkspaceStore from "@/stores/workspace";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { workspaceSettingsSchema } from "@/lib/schemas/workspace";
import { WorkspaceSettingsForm } from "@/types/workspace";
import { useCopyToClipboard } from "@/hooks/use-copy";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import useFile from "@/hooks/use-file";
import useAuthStore from "@/stores/auth";
import { Avatar, AvatarFallback, AvatarImage } from "../ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "../ui/dropdown-menu";

const SettingsWorkspaceOverview = () => {
  // Stores
  const { workspaceId } = useWorkspaceStore();
  const { user } = useAuthStore();

  // Refs
  const workspaceLogoInputRef = useRef<HTMLInputElement>(null);

  // Query
  const queryClient = useQueryClient();

  // Hooks
  const { useWorkspaceById } = useWorkspace();
  const { isPending, data } = useWorkspaceById(workspaceId!);
  const { copy, copied } = useCopyToClipboard();
  const { useUpdateWorkspace } = useWorkspace();
  const { useUploadAsset } = useFile();

  const { isPending: isUpdatingWorkspace, mutate: updateWorkspace } =
    useUpdateWorkspace({
      onSuccess(data) {
        queryClient.invalidateQueries({
          queryKey: ["get-workspace-detail"],
        });
        queryClient.invalidateQueries({
          queryKey: ["user"],
        });
        toast.success(data?.data?.message, {
          description: data?.data?.description,
        });
      },
    });

  const workspace = data?.data?.workspace;

  // States
  const [workspaceLogo, setWorkspaceLogo] = useState({
    id: "",
    url: "",
  });

  // Mutations
  const {
    mutateAsync: uploadWorkspaceLogo,
    isPending: isUploadingWorkspaceLogo,
  } = useUploadAsset();

  //
  const form = useForm<WorkspaceSettingsForm>({
    resolver: zodResolver(workspaceSettingsSchema),
    values: workspace
      ? {
          name: workspace?.name,
          type: workspace?.type,
          allowedDomains: workspace?.allowedDomains?.join(",") ?? "",
        }
      : undefined,
    mode: "onChange",
  });

  const {
    register,
    handleSubmit,
    formState: { errors, isValid },
    reset,
    watch,
  } = form;

  const onSubmit = async (values: WorkspaceSettingsForm) => {
    updateWorkspace({
      workspaceId: workspace?._id as string,
      data: {
        name: values?.name,
        type: values?.type,
        allowedDomains: values?.allowedDomains,
      },
    });

    reset(values);
  };

  const formValues = form.getValues();
  const allowedDomainsValue = watch("allowedDomains");
  const workspaceInitials =
    String(formValues?.name || workspace?.name || "")
      .trim()
      .split(/\s+/)
      .filter(Boolean)
      .slice(0, 2)
      .map((segment) => segment[0]?.toUpperCase())
      .join("") || "WS";

  useEffect(() => {
    const nextId = String(workspace?.logo?._id || "").trim();
    const nextUrl = String(workspace?.logo?.url || "").trim();

    setWorkspaceLogo({
      id: nextId,
      url: nextUrl,
    });
  }, [workspace?.logo?._id, workspace?.logo?.url]);

  const handlePickWorkspaceLogo = () => {
    workspaceLogoInputRef.current?.click();
  };

  const handleWorkspaceLogoUpload = async (
    event: ChangeEvent<HTMLInputElement>,
  ) => {
    const file = event.target.files?.[0];
    if (!file) {
      return;
    }

    if (!user?._id || !workspace?._id) {
      toast.error("Unable to upload workspace logo", {
        description: "Workspace session is not ready. Refresh and try again.",
      });
      event.target.value = "";
      return;
    }

    const formData = new FormData();
    formData.append("file", file);
    formData.append("folder", "organization");
    formData.append("ownerId", String(user._id));
    formData.append("workspaceId", String(workspace._id));
    const loadingToastId = toast.loading("Uploading workspace image...");
    try {
      const response = await uploadWorkspaceLogo(formData);
      const asset = response?.data?.asset;
      const logoId = String(asset?._id || "").trim();
      const logoUrl = String(asset?.url || "").trim();
      if (!logoId) {
        toast.error("Unable to upload workspace image", {
          id: loadingToastId,
        });
        return;
      }

      setWorkspaceLogo({
        id: logoId,
        url: logoUrl,
      });

      toast.success("Workspace image uploaded", {
        id: loadingToastId,
      });

      updateWorkspace({
        workspaceId: workspace._id,
        data: {
          logo: logoId,
        },
      });
    } catch {
      toast.error("Unable to upload workspace image", {
        id: loadingToastId,
      });
    } finally {
      event.target.value = "";
    }
  };

  const handleRemoveWorkspaceLogo = () => {
    if (!workspace?._id) {
      return;
    }
    setWorkspaceLogo({
      id: "",
      url: "",
    });
    updateWorkspace({
      workspaceId: workspace._id,
      data: {
        logo: null,
      },
    });
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)}>
      <FieldGroup>
        <FieldSet>
          <FieldLegend>Workspace Basics</FieldLegend>
          <FieldDescription>
            These details identify your workspace and are visible to members.
          </FieldDescription>
          <FieldContent className="flex  flex-row border items-center gap-4 rounded-xl border-border/35 bg-muted/20 px-3 py-3">
            <div className="relative shrink-0">
              <button
                type="button"
                onClick={handlePickWorkspaceLogo}
                className="group rounded-full focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/60"
                disabled={isUploadingWorkspaceLogo || isUpdatingWorkspace}
              >
                <Avatar className="size-16 rounded-full border border-border/45">
                  <AvatarImage
                    src={workspaceLogo.url || undefined}
                    alt={workspace?.name || "Workspace"}
                  />
                  <AvatarFallback className="rounded-full">
                    {workspaceInitials}
                  </AvatarFallback>
                </Avatar>
                <span className="absolute -bottom-1 -right-1 inline-flex h-6 w-6 items-center justify-center rounded-full border border-border bg-background text-muted-foreground shadow-sm transition-colors group-hover:text-foreground">
                  <Upload className="size-3.5" />
                </span>
              </button>
            </div>

            <div className="min-w-0 space-y-0.5">
              <p className="text-[12px] font-medium">Workspace image</p>
              <p className="text-muted-foreground text-[11px]">
                Upload a logo for this workspace. It appears in switchers,
                invites, and headers.
              </p>
            </div>

            <div className="ml-auto">
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    type="button"
                    size="icon"
                    variant="ghost"
                    className="size-8"
                    disabled={isUploadingWorkspaceLogo || isUpdatingWorkspace}
                  >
                    <MoreHorizontal className="size-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-44">
                  <DropdownMenuItem onClick={handlePickWorkspaceLogo}>
                    <Upload className="size-4" />
                    {workspaceLogo.url ? "Change image" : "Upload image"}
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    disabled={!workspaceLogo.url}
                    onClick={handleRemoveWorkspaceLogo}
                    className="text-destructive focus:text-destructive"
                  >
                    <X className="size-4" />
                    Remove image
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>

            <input
              ref={workspaceLogoInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={handleWorkspaceLogoUpload}
            />
          </FieldContent>
          <Input
            label="Workspace name"
            className="max-w-80"
            placeholder="Squircle Corp"
            {...register("name")}
            error={errors?.name?.message}
          />

          <FieldLabel>Workspace URL</FieldLabel>
          <InputGroup className="max-w-80">
            <InputGroupInput
              placeholder="squircle-corp"
              readOnly
              value={workspace?.slug}
            />
            <InputGroupAddon align="inline-end" className="px-4">
              <InputGroupText>.squircle.live</InputGroupText>

              <InputGroupButton
                aria-label="Copy"
                title="Copy"
                size="icon-xs"
                onClick={() => {
                  copy(`https://${workspace?.slug}.squircle.live`);
                }}
              >
                {copied ? <Check className="text-green-500" /> : <Copy />}
              </InputGroupButton>
            </InputGroupAddon>
          </InputGroup>
          <FieldDescription>
            Auto-generated from your workspace name
          </FieldDescription>
          <Button
            className="max-w-20"
            disabled={formValues?.name === workspace?.name || !isValid}
            size="sm"
            type="submit"
            loading={isUpdatingWorkspace || isPending}
          >
            Save
          </Button>
          <FieldSeparator />
        </FieldSet>

        <FieldSet>
          <FieldGroup className="w-full">
            <FieldSet>
              <FieldLegend variant="label">Workspace Visibility</FieldLegend>

              <FieldDescription>
                Control who can discover this workspace and how new members are
                allowed to join.
              </FieldDescription>

              <RadioGroup
                value={watch("type")}
                onValueChange={(val) =>
                  form.setValue("type", val as "public" | "private", {
                    shouldDirty: true,
                  })
                }
                className="max-w-130"
              >
                <FieldLabel>
                  <Field orientation="horizontal">
                    <FieldContent>
                      <FieldTitle>Public Workspace</FieldTitle>
                      <FieldDescription>
                        Discoverable. Users can request access.
                      </FieldDescription>
                    </FieldContent>
                    <RadioGroupItem value="public" />
                  </Field>
                </FieldLabel>

                <FieldLabel>
                  <Field orientation="horizontal">
                    <FieldContent>
                      <FieldTitle>Private Workspace</FieldTitle>
                      <FieldDescription>
                        Invite-only workspace.
                      </FieldDescription>
                    </FieldContent>
                    <RadioGroupItem value="private" />
                  </Field>
                </FieldLabel>
              </RadioGroup>

              {workspace?.type !== formValues?.type && (
                <FieldDescription className="text-destructive max-w-130">
                  {workspace?.type === "private" &&
                    formValues?.type === "public" &&
                    `Changing this workspace to public will make it discoverable to
                anyone. People will be able to find it and request access.
                Existing private access rules will no longer apply.`}

                  {workspace?.type === "public" &&
                    formValues?.type === "private" &&
                    ` Changing this workspace to private will hide it from public discovery.
  New members will only be able to join by direct invitation from an owner
  or administrator.`}
                </FieldDescription>
              )}

              <Button
                className="max-w-20"
                disabled={formValues?.type === workspace?.type || !isValid}
                size="sm"
                type="submit"
                loading={isUpdatingWorkspace || isPending}
              >
                Save
              </Button>
            </FieldSet>
          </FieldGroup>
          <FieldSeparator />
        </FieldSet>

        <FieldSet>
          <FieldLegend>Allowed Domains</FieldLegend>
          <FieldDescription>
            Restrict sign-ups to specific email domains.
          </FieldDescription>
          <Input
            label="Email domains"
            tip="Workspace domains must be comma separated"
            className="max-w-80"
            placeholder="squircle.live, squircle.co"
            {...register("allowedDomains")}
            error={errors?.allowedDomains?.message}
          />
          <Button
            className="max-w-20"
            disabled={
              allowedDomainsValue === workspace?.allowedDomains?.join(",") ||
              !isValid
            }
            size="sm"
            type="submit"
            loading={isUpdatingWorkspace || isPending}
          >
            Save
          </Button>
          <FieldSeparator />
        </FieldSet>

        <FieldSet>
          <FieldLegend>Workspace Credentials</FieldLegend>
          <FieldDescription>
            A unique identifier for this workspace. Used for API access and
            support.
          </FieldDescription>
          <FieldContent className="flex flex-row items-center gap-2">
            <P className="font-medium text-base">Workspace ID</P>
            <P className="text-muted-foreground ml-auto text-xs font-medium">
              {workspace?._id}
            </P>

            <Button
              size="sm"
              variant="ghost"
              onClick={(e) => {
                e.preventDefault();
                copy(workspace?._id as string);
              }}
            >
              {copied ? <Check className="text-green-500" /> : <Copy />}
            </Button>
          </FieldContent>
          <FieldSeparator />
        </FieldSet>

        <FieldSet>
          <FieldLegend>Danger Zone</FieldLegend>
          <FieldDescription>
            This will permanently delete the workspace and all its data.
          </FieldDescription>
          <FieldContent className="flex flex-col gap-2 max-w-120 justify-start">
            <Button
              variant="outline"
              className="w-50 text-destructive"
              onClick={(e) => e.preventDefault()}
            >
              <Trash2 />
              Delete Workspace
            </Button>
          </FieldContent>
        </FieldSet>
      </FieldGroup>
    </form>
  );
};

export default SettingsWorkspaceOverview;
