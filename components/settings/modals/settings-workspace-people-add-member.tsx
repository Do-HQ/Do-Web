import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import React, { Dispatch, SetStateAction, useEffect, useMemo } from "react";
import { Field, FieldGroup, FieldSet } from "@/components/ui/field";
import { Input } from "@/components/shared/input";
import { MultiSelect } from "@/components/shared/drop-down";
import { Button } from "@/components/ui/button";
import { Controller, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { WorkspaceInviteRequestBody } from "@/types/workspace";
import useWorkspaceStore from "@/stores/workspace";
import { createInviteMemberSchema } from "@/lib/schemas/workspace";
import useWorkspace from "@/hooks/use-workspace";

import { toast } from "sonner";
import { useQueryClient } from "@tanstack/react-query";

interface Props {
  open: boolean;
  onOpenChange: Dispatch<SetStateAction<boolean>>;
}

const SettingsWorkspacePeopleAddMembers = ({ open, onOpenChange }: Props) => {
  // Store
  const { useActiveWorkspace, useWorkspaceRoles, useCreateWorkspaceInvite } =
    useWorkspace();
  const { workspaceId } = useWorkspaceStore();

  const activeWorkspace = useActiveWorkspace();
  const { isPending: isGettingWorkspaceRoles, data } = useWorkspaceRoles(
    workspaceId!,
  );

  // Query
  const queryClient = useQueryClient();

  //   Memo
  const roles = useMemo(() => {
    return data?.data?.roles || [];
  }, [data]);

  //   Utils
  const defaultRole = roles.find((r) => r.name.toLowerCase() === "member");

  // Validation
  const {
    register,
    control,
    handleSubmit,
    reset,
    formState: { errors, isValid },
  } = useForm<WorkspaceInviteRequestBody>({
    resolver: zodResolver(
      createInviteMemberSchema(
        (activeWorkspace?.workspaceId?.allowedDomains as string[]) || [],
      ),
    ),
    mode: "onChange",
  });

  const { isPending: isCreatingWorkspaceRole, mutateAsync: createRole } =
    useCreateWorkspaceInvite({
      onSuccess() {
        reset({
          email: "",
          roles: [defaultRole?._id],
        });

        queryClient.invalidateQueries({ queryKey: ["get-workspaces-invites"] });
      },
    });

  const onSubmit = (formData: WorkspaceInviteRequestBody) => {
    const request = createRole({
      workspaceId: workspaceId!,
      data: [
        {
          email: formData?.email,
          roleIds: formData?.roles,
        },
      ],
    });

    toast.promise(request, {
      loading: "Sending workspace invite...",
      success: (data) => data?.data?.message || "Workspace invite sent",
      error: "Could not send workspace invite",
    });
  };

  //   Effects
  useEffect(() => {
    if (roles?.length) {
      if (defaultRole) {
        reset({
          email: "",
          roles: [defaultRole._id],
        });
      }
    }
  }, [defaultRole, roles, reset]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className="p-6"
        onInteractOutside={(e) => {
          e.preventDefault();
        }}
        onPointerDownOutside={(e) => {
          e.preventDefault();
        }}
      >
        <DialogHeader>
          <DialogTitle>Invite a new team member</DialogTitle>
          <DialogDescription>
            Send an invitation to join your workspace and assign their role.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)}>
          <FieldSet className="w-full max-w-xs">
            <FieldGroup>
              <Field>
                <Input
                  id="email"
                  type="text"
                  placeholder="name@company.com"
                  label="Email Address"
                  {...register("email")}
                  error={errors?.email?.message}
                />
              </Field>

              <Controller
                name="roles"
                control={control}
                render={({ field }) => (
                  <MultiSelect
                    options={roles.map((r) => ({
                      label: r.name,
                      value: r._id,
                    }))}
                    value={field.value || []}
                    onChange={field.onChange}
                    placeholder="Select roles"
                    loading={isGettingWorkspaceRoles}
                  />
                )}
              />
            </FieldGroup>
          </FieldSet>

          <Button
            className="border max-w-30 mt-6"
            loading={isCreatingWorkspaceRole}
            disabled={!isValid}
          >
            Submit
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default SettingsWorkspacePeopleAddMembers;
