"use client";

import { Input } from "@/components/shared/input";
import { Button } from "@/components/ui/button";
import {
  Field,
  FieldContent,
  FieldDescription,
  FieldError,
  FieldGroup,
  FieldLabel,
  FieldLegend,
  FieldSet,
  FieldTitle,
} from "@/components/ui/field";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { H2, P } from "@/components/ui/typography";
import useWorkspace from "@/hooks/use-workspace";
import { triggerConfetti } from "@/lib/helpers/triggerConfetti";
import { createWorkspaceSchema } from "@/lib/schemas/workspace";
import { CreateWorkspaceRequestBody } from "@/types/workspace";
import { ROUTES } from "@/utils/constants";
import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter } from "next/navigation";
import { Controller, useForm } from "react-hook-form";

const CreateWorkspace = () => {
  const {
    register,
    handleSubmit,
    formState: { errors, isValid },
    control,
  } = useForm<CreateWorkspaceRequestBody>({
    resolver: zodResolver(createWorkspaceSchema),
    mode: "onChange",
  });

  // Router
  const router = useRouter();

  // Hooks
  const { useCreateWorkspace } = useWorkspace();
  const { isPending: isCreatingWorkspace, mutate: createWorkspace } =
    useCreateWorkspace({
      onSuccess() {
        triggerConfetti();
        router.replace(ROUTES.DASHBOARD);
      },
    });

  const onSubmit = (data: CreateWorkspaceRequestBody) => {
    createWorkspace(data);
  };

  return (
    <section className="max-w-300 mx-auto flex flex-col gap-6">
      <div>
        <H2>Create your Workspace</H2>
        <P className="text-muted-foreground">
          Build your workspace and bring your team together.
        </P>
      </div>
      <form
        id="form-rhf-demo"
        onSubmit={handleSubmit(onSubmit)}
        className="w-120"
      >
        <Field className="space-y-4">
          <Input
            type="text"
            label="Workspace Name"
            autoFocus
            {...register("name")}
            error={errors.name?.message}
          />

          <FieldGroup className="w-full">
            <Controller
              name="type"
              control={control}
              render={({ field, fieldState }) => (
                <FieldSet {...field}>
                  <FieldLegend variant="label">
                    Workspace Visibility
                  </FieldLegend>

                  <FieldDescription>
                    Control who can discover this workspace and how new members
                    are allowed to join.
                  </FieldDescription>

                  <RadioGroup>
                    <FieldLabel htmlFor="public-r2h">
                      <Field orientation="horizontal">
                        <FieldContent>
                          <FieldTitle>Public Workspace</FieldTitle>
                          <FieldDescription>
                            This workspace is discoverable by anyone. People can
                            request to join, but access is only granted after
                            approval from an owner or administrator.
                          </FieldDescription>
                        </FieldContent>
                        <RadioGroupItem value="public" id="public-r2h" />
                      </Field>
                    </FieldLabel>

                    <FieldLabel htmlFor="private-r2h">
                      <Field orientation="horizontal">
                        <FieldContent>
                          <FieldTitle>Private Workspace</FieldTitle>
                          <FieldDescription>
                            This workspace is hidden from public discovery. Only
                            people who are directly invited by an owner or
                            administrator can join.
                          </FieldDescription>
                        </FieldContent>
                        <RadioGroupItem value="private" id="private-r2h" />
                      </Field>
                    </FieldLabel>
                  </RadioGroup>

                  {fieldState.invalid && (
                    <FieldError errors={[fieldState.error]} />
                  )}
                </FieldSet>
              )}
            />
          </FieldGroup>

          <Button disabled={!isValid} loading={isCreatingWorkspace}>
            Create workspace
          </Button>
        </Field>
      </form>
    </section>
  );
};

export default CreateWorkspace;
