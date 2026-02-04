import { AuthUser } from "@/types/auth";

export const returnFullName = (user: AuthUser) => {
  if (!user?.firstName && !user?.lastName) {
    return;
  }

  return `${user?.lastName} ${user?.firstName}`;
};
