import React, { useState } from "react";
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
import { Check, Copy, Trash2 } from "lucide-react";
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
import { useDebounce } from "@/hooks/use-debounce";
import { useCopyToClipboard } from "@/hooks/use-copy";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

const SettingsWorkspaceOverview = () => {
  // Stores
  const { workspaceId } = useWorkspaceStore();

  // Query
  const queryClient = useQueryClient();

  // Hooks
  const { useWorkspaceById } = useWorkspace();
  const { isPending, data } = useWorkspaceById(workspaceId!);
  const { copy, copied } = useCopyToClipboard();
  const { useUpdateWorkspace } = useWorkspace();
  const { isPending: isUpdatingWorkspace, mutate: updateWorkspace } =
    useUpdateWorkspace({
      onSuccess(data) {
        queryClient.invalidateQueries({
          queryKey: ["get-workspace-detail"],
        });
        toast.success(data?.data?.message, {
          description: data?.data?.description,
        });
      },
    });

  const workspace = data?.data?.workspace;

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

  console.log(
    JSON.stringify(formValues?.allowedDomains) ===
      JSON.stringify(workspace?.allowedDomains),
    formValues?.allowedDomains,
    workspace?.allowedDomains,
  );

  return (
    <form onSubmit={handleSubmit(onSubmit)}>
      <FieldGroup>
        <FieldSet>
          <FieldLegend>Workspace Basics</FieldLegend>
          <FieldDescription>
            These details identify your workspace and are visible to members.
          </FieldDescription>
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
              formValues?.allowedDomains ===
                workspace?.allowedDomains?.join(",") || !isValid
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

            <Button size="sm" variant="ghost">
              <Copy />
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
            <Button variant="outline" className="w-50 text-destructive">
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
