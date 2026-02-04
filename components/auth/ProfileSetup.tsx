"use client";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/shared/input";
import { H1, P } from "../ui/typography";
import { useRouter } from "next/navigation";
import { ROUTES } from "@/utils/constants";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { UpdateUserBody } from "@/types/auth";
import { updateUserSchema } from "@/lib/schemas/user";
import useAuthStore from "@/stores/auth";
import UserImageUpload from "../shared/user-image-upload";
import { CustomFile } from "@/types/file";
import { useState } from "react";
import useUser from "@/hooks/use-user";

const ProfileSetup = () => {
  // Store
  const { user, setUser } = useAuthStore();

  // States
  const [image, setImage] = useState<CustomFile | null>(null);

  // Hooks
  const { useUpdateUser } = useUser();
  const { mutate: updateUser, isPending: isUpdatingUser } = useUpdateUser({
    onSuccess(data) {
      setUser(data?.data?.user);
      if (data?.data?.user?.workspaces?.length === 0) {
        router.push(ROUTES.WORKSPACE);
      } else {
        router.replace(ROUTES.DASHBOARD);
      }
    },
  });

  // Route
  const router = useRouter();

  // Validators
  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors, isValid, isDirty },
  } = useForm<UpdateUserBody>({
    resolver: zodResolver(updateUserSchema),
    mode: "onChange",
    defaultValues: {
      firstName: user?.firstName,
      lastName: user?.lastName,
      profilePhoto: user?.profilePhoto?._id,
    },
  });

  const handleUpdateUser = (data: UpdateUserBody) => {
    updateUser(data);
  };

  return (
    <section className="mx-auto flex flex-col gap-7 w-120">
      <div className="space-y-1">
        <H1 className="font-semibold md:text-2xl text-foreground text-left">
          Create your profile
        </H1>
        <P className="text-muted-foreground font-medium">
          This is how you’ll appear in Squircle
        </P>
      </div>

      <UserImageUpload
        image={image}
        setImage={setImage}
        value={watch("profilePhoto")}
        onChange={(url) => {
          setValue("profilePhoto", url!, {
            shouldDirty: true,
            shouldValidate: true,
          });
        }}
      />

      <form className="space-y-4" onSubmit={handleSubmit(handleUpdateUser)}>
        <Input
          label="First name"
          id="firstName"
          placeholder="Enter your first name"
          {...register("firstName")}
          error={errors.firstName?.message}
        />

        <Input
          label="Last name"
          id="lastName"
          placeholder="Enter your last name"
          {...register("lastName")}
          error={errors.lastName?.message}
        />

        <Button
          className="max-w-30"
          disabled={!isDirty && !isValid}
          loading={isUpdatingUser}
        >
          Continue
        </Button>
      </form>
    </section>
  );
};

export default ProfileSetup;
