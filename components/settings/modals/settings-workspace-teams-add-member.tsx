"use client";

import { useMemo, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/shared/input";
import { FieldGroup, FieldLabel, FieldSet } from "@/components/ui/field";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { TeamMemberRole } from "@/types/team";
import useWorkspace from "@/hooks/use-workspace";
import useWorkspaceStore from "@/stores/workspace";

export type TeamMemberInviteValue = {
  members: Array<{
    userId: string;
    role: TeamMemberRole;
  }>;
};

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  teamName?: string;
  existingMemberIds: string[];
  loading?: boolean;
  onSubmit: (payload: TeamMemberInviteValue) => Promise<void>;
}

type AvailableMember = {
  id: string;
  label: string;
  email: string;
  searchText: string;
  initials: string;
  roleLabel: string;
  teamLabel: string;
};

const SettingsWorkspaceTeamsAddMemberModal = ({
  open,
  onOpenChange,
  teamName,
  existingMemberIds,
  loading = false,
  onSubmit,
}: Props) => {
  const { workspaceId } = useWorkspaceStore();
  const { useWorkspacePeople } = useWorkspace();
  const [search, setSearch] = useState("");
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [role, setRole] = useState<TeamMemberRole>("member");

  const workspacePeopleQuery = useWorkspacePeople(workspaceId || "", {
    page: 1,
    limit: 500,
    search,
  });

  const normalizedMembers = useMemo<AvailableMember[]>(() => {
    const seen = new Set<string>();

    return (workspacePeopleQuery.data?.data?.members || [])
      .map((member) => {
        const user =
          member && typeof member.userId === "object" && member.userId
            ? member.userId
            : null;

        const id = String(user?._id || "");
        if (!id || seen.has(id)) {
          return null;
        }

        seen.add(id);

        const label =
          [
            user?.firstName ?? (user as { firstname?: string } | null)?.firstname,
            user?.lastName ?? (user as { lastnale?: string } | null)?.lastnale,
          ]
            .filter(Boolean)
            .join(" ")
            .trim() ||
          user?.email ||
          "Unknown member";

        const email = String(user?.email || "");
        const searchText = [label, email].filter(Boolean).join(" ").toLowerCase();
        const initials = label
          .split(" ")
          .slice(0, 2)
          .map((chunk) => chunk[0]?.toUpperCase())
          .join("");
        const roleLabel = (Array.isArray(member?.roles) ? member.roles : [])
          .map((role) =>
            String((role && typeof role === "object" ? role.name : role) || "")
              .trim()
              .replace(/[-_]/g, " "),
          )
          .filter(Boolean)
          .join(", ");
        const teamLabel = (Array.isArray(member?.teams) ? member.teams : [])
          .filter((team) => team?.status === "active")
          .map((team) => String(team?.name || "").trim())
          .filter(Boolean)
          .join(", ");

        return {
          id,
          label,
          email,
          searchText,
          initials,
          roleLabel: roleLabel || "Workspace member",
          teamLabel: teamLabel || "No active team",
        };
      })
      .filter(Boolean) as AvailableMember[];
  }, [workspacePeopleQuery.data]);

  const availableMembers = useMemo(() => {
    const usedIds = new Set(existingMemberIds.map(String));

    return normalizedMembers.filter((member) => !usedIds.has(member.id));
  }, [existingMemberIds, normalizedMembers]);

  const canSubmit = selectedIds.length > 0;
  const allMembersAssigned =
    normalizedMembers.length > 0 &&
    availableMembers.length === 0 &&
    !search.trim() &&
    !workspacePeopleQuery.isFetching;

  const resetState = () => {
    setSearch("");
    setSelectedIds([]);
    setRole("member");
  };

  const toggleMember = (userId: string) => {
    setSelectedIds((prev) =>
      prev.includes(userId)
        ? prev.filter((value) => value !== userId)
        : [...prev, userId],
    );
  };

  const handleSubmit = async () => {
    if (!canSubmit || loading) {
      return;
    }

    try {
      await onSubmit({
        members: selectedIds.map((userId) => ({ userId, role })),
      });
      resetState();
      onOpenChange(false);
    } catch {
      // handled by caller
    }
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(nextOpen) => {
        onOpenChange(nextOpen);
        if (!nextOpen) {
          resetState();
        }
      }}
    >
      <DialogContent className="p-6 sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Add members</DialogTitle>
          <DialogDescription>
            Assign existing workspace members to {teamName ?? "this team"}.
          </DialogDescription>
        </DialogHeader>

        <FieldSet>
          <FieldGroup className="gap-4">
            <Input
              label="Search workspace members"
              placeholder="Filter by name or email"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
            />

            <div className="flex flex-col gap-2">
              <FieldLabel>Role for selected members</FieldLabel>
              <Select value={role} onValueChange={(value) => setRole(value as TeamMemberRole)}>
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Select role" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="member">Member</SelectItem>
                  <SelectItem value="lead">Lead</SelectItem>
                  <SelectItem value="observer">Observer</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="rounded-md border">
              <ScrollArea className="h-64">
                <div className="flex flex-col divide-y">
                  {availableMembers.length ? (
                    availableMembers.map((member) => (
                      <label
                        key={member.id}
                        className="flex cursor-pointer items-center gap-3 px-3 py-2"
                      >
                        <Checkbox
                          checked={selectedIds.includes(member.id)}
                          onCheckedChange={() => toggleMember(member.id)}
                        />
                        <Avatar
                          size="sm"
                          userCard={{
                            name: member.label,
                            email: member.email,
                            role: member.roleLabel,
                            team: member.teamLabel,
                            status: selectedIds.includes(member.id)
                              ? "Selected"
                              : "Available",
                          }}
                        >
                          <AvatarFallback>{member.initials}</AvatarFallback>
                        </Avatar>
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-sm font-medium">{member.label}</p>
                          <p className="text-muted-foreground truncate text-xs">{member.email}</p>
                        </div>
                      </label>
                    ))
                  ) : (
                    <div className="text-muted-foreground px-3 py-6 text-center text-sm">
                      {workspacePeopleQuery.isFetching
                        ? "Loading workspace members..."
                        : allMembersAssigned
                          ? "All workspace members are already assigned to this team."
                          : "No available workspace members match this search."}
                    </div>
                  )}
                </div>
              </ScrollArea>
            </div>
          </FieldGroup>

          <div className="flex items-center gap-2 pt-2">
            <Button
              type="button"
              size="sm"
              loading={loading || workspacePeopleQuery.isFetching}
              disabled={!canSubmit}
              onClick={handleSubmit}
            >
              Add selected members
            </Button>
            <Button
              type="button"
              size="sm"
              variant="ghost"
              onClick={() => {
                resetState();
                onOpenChange(false);
              }}
            >
              Cancel
            </Button>
          </div>
        </FieldSet>
      </DialogContent>
    </Dialog>
  );
};

export default SettingsWorkspaceTeamsAddMemberModal;
