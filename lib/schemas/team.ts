import { z } from "zod";

export const createTeamSchema = z.object({
  name: z.string().min(2, "Team name is too short").max(80),
  key: z.string().min(2, "Team key is too short").max(12),
  leadUserId: z.string().optional().nullable(),
  visibility: z.enum(["open", "private"]),
  description: z.string().optional(),
});

export const updateTeamSchema = createTeamSchema.partial().extend({
  name: z.string().min(2, "Team name is too short").max(80),
  key: z.string().min(2, "Team key is too short").max(12),
});

export const addTeamMembersSchema = z.object({
  members: z
    .array(
      z.object({
        userId: z.string().min(1),
        role: z.enum(["lead", "member", "observer"]),
      }),
    )
    .min(1, "Select at least one workspace member"),
});

export const updateTeamMemberRoleSchema = z.object({
  role: z.enum(["lead", "member", "observer"]),
});

export const teamPolicySchema = z.object({
  restrictTeamCreation: z.boolean(),
  requireLeadBeforeActivation: z.boolean(),
  allowMultiTeamMembership: z.boolean(),
  autoAssignInvitedMembers: z.boolean(),
  defaultVisibility: z.enum(["open", "private"]),
  defaultWorkloadMode: z.enum(["balanced", "lead-driven", "self-managed"]),
});
