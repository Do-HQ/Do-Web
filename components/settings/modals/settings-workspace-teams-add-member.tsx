"use client";

import { FormEvent, useState } from "react";
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

export type TeamMemberInviteValue = {
  fullName: string;
  email: string;
  role: "member" | "lead" | "observer";
};

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  teamName?: string;
  onSubmit: (payload: TeamMemberInviteValue) => void;
}

const defaultValues: TeamMemberInviteValue = {
  fullName: "",
  email: "",
  role: "member",
};

const SettingsWorkspaceTeamsAddMemberModal = ({
  open,
  onOpenChange,
  teamName,
  onSubmit,
}: Props) => {
  const [form, setForm] = useState<TeamMemberInviteValue>(defaultValues);

  const canSubmit = !!form.email.trim() && !!form.role;

  const resetState = () => {
    setForm(defaultValues);
  };

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!canSubmit) {
      return;
    }

    onSubmit({
      fullName: form.fullName.trim(),
      email: form.email.trim(),
      role: form.role,
    });

    resetState();
    onOpenChange(false);
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
      <DialogContent className="p-6 sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Add member</DialogTitle>
          <DialogDescription>
            Add a member to {teamName ?? "this team"}. These changes are local
            for now.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit}>
          <FieldSet>
            <FieldGroup className="gap-4">
              <Input
                label="Full name"
                placeholder="Jane Doe"
                value={form.fullName}
                onChange={(event) =>
                  setForm((prev) => ({
                    ...prev,
                    fullName: event.target.value,
                  }))
                }
              />

              <Input
                label="Work email"
                type="email"
                placeholder="jane@company.com"
                value={form.email}
                onChange={(event) =>
                  setForm((prev) => ({
                    ...prev,
                    email: event.target.value,
                  }))
                }
              />

              <div className="flex flex-col gap-2">
                <FieldLabel>Team role</FieldLabel>
                <Select
                  value={form.role}
                  onValueChange={(value) =>
                    setForm((prev) => ({
                      ...prev,
                      role: value as TeamMemberInviteValue["role"],
                    }))
                  }
                >
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
            </FieldGroup>

            <div className="flex items-center gap-2 pt-2">
              <Button type="submit" size="sm" disabled={!canSubmit}>
                Add member
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
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default SettingsWorkspaceTeamsAddMemberModal;
