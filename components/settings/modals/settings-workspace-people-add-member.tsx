import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import React, { Dispatch, SetStateAction, useMemo } from "react";
import {
  Field,
  FieldDescription,
  FieldGroup,
  FieldLabel,
  FieldSet,
} from "@/components/ui/field";
import { Input } from "@/components/shared/input";
import { Dropdown } from "@/components/shared/drop-down";
import { Button } from "@/components/ui/button";
import { Controller, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { WorkspaceInviteRequestBody } from "@/types/workspace";
import useWorkspaceStore from "@/stores/workspace";
import { createInviteMemberSchema } from "@/lib/schemas/workspace";
import useWorkspace from "@/hooks/use-workspace";
import {
  Combobox,
  ComboboxChip,
  ComboboxChips,
  ComboboxChipsInput,
  ComboboxContent,
  ComboboxEmpty,
  ComboboxItem,
  ComboboxList,
  ComboboxValue,
  useComboboxAnchor,
} from "@/components/ui/combobox";

interface Props {
  open: boolean;
  onOpenChange: Dispatch<SetStateAction<boolean>>;
}

const roles = ["Owner", "Admin", "Member", "Product Manager"];

const SettingsWorkspacePeopleAddMembers = ({ open, onOpenChange }: Props) => {
  // Store
  const { useActiveWorkspace, useWorkspaceRoles } = useWorkspace();
  const { workspaceId } = useWorkspaceStore();

  const activeWorkspace = useActiveWorkspace();
  const { isPending, data } = useWorkspaceRoles(workspaceId!);

  //   Memo
  const roles = useMemo(() => {
    return data?.data?.roles;
  }, [data]);

  //   Hooks
  const anchor = useComboboxAnchor();

  // Validation
  const {
    register,
    control,
    handleSubmit,
    formState: { errors, isValid },
  } = useForm<WorkspaceInviteRequestBody>({
    resolver: zodResolver(
      createInviteMemberSchema(
        activeWorkspace?.workspaceId?.allowedDomains as string[],
      ),
    ),
    defaultValues: {
      roles: [roles?.[0]?.name],
    },
    mode: "onChange",
  });

  const onSubmit = (data: WorkspaceInviteRequestBody) => {
    console.log(data);
  };

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
                  <Field>
                    <FieldLabel>Role(s)</FieldLabel>
                    <Combobox
                      multiple
                      autoHighlight
                      items={roles?.map((r) => r?.name)}
                      value={field.value}
                      onValueChange={(newValue) => {
                        field.onChange(newValue);
                      }}
                    >
                      <ComboboxChips ref={anchor} className="w-full max-w-xs">
                        <ComboboxValue>
                          {(values: string[]) => (
                            <>
                              {values.map((value) => (
                                <ComboboxChip
                                  key={value}
                                  className="capitalize"
                                >
                                  {value}
                                </ComboboxChip>
                              ))}
                              <ComboboxChipsInput />
                            </>
                          )}
                        </ComboboxValue>
                      </ComboboxChips>
                      <ComboboxContent anchor={anchor}>
                        <ComboboxEmpty>No items found.</ComboboxEmpty>
                        <ComboboxList>
                          {(item: string) => (
                            <ComboboxItem
                              key={item}
                              value={item}
                              onPointerDown={(e) => e.stopPropagation()}
                              className="capitalize"
                            >
                              {item}
                            </ComboboxItem>
                          )}
                        </ComboboxList>
                      </ComboboxContent>
                    </Combobox>
                    {errors?.roles?.message && (
                      <FieldDescription className="text-red-500">
                        {errors.roles.message}
                      </FieldDescription>
                    )}
                  </Field>
                )}
              />
            </FieldGroup>
          </FieldSet>

          <Button
            className="border max-w-30 mt-6"
            // size="sm"
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
