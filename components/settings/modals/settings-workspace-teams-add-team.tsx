"use client";

import { FormEvent, useMemo, useState } from "react";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/shared/input";
import {
  FieldDescription,
  FieldGroup,
  FieldLabel,
  FieldSet,
} from "@/components/ui/field";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";

export type CreateTeamFormValue = {
  teamName: string;
  teamKey: string;
  teamLead: string;
  visibility: "open" | "private";
  description: string;
};

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  existingTeamKeys: string[];
  leadOptions: string[];
  onCreateTeam: (payload: CreateTeamFormValue) => void;
}

const defaultFormValues: CreateTeamFormValue = {
  teamName: "",
  teamKey: "",
  teamLead: "",
  visibility: "open",
  description: "",
};

const normalizeTeamKey = (value: string) => {
  return value
    .toUpperCase()
    .replace(/[^A-Z0-9-_ ]/g, "")
    .replace(/\s+/g, "-")
    .slice(0, 12);
};

const SettingsWorkspaceTeamsAddTeamModal = ({
  open,
  onOpenChange,
  existingTeamKeys,
  leadOptions,
  onCreateTeam,
}: Props) => {
  const [form, setForm] = useState<CreateTeamFormValue>(defaultFormValues);

  const normalizedKey = useMemo(
    () => normalizeTeamKey(form.teamKey),
    [form.teamKey],
  );
  const teamKeyExists = useMemo(() => {
    return existingTeamKeys.some(
      (key) => key.toUpperCase() === normalizedKey.toUpperCase(),
    );
  }, [existingTeamKeys, normalizedKey]);

  const canSubmit =
    !!form.teamName.trim() &&
    !!normalizedKey.trim() &&
    !!form.teamLead.trim() &&
    !teamKeyExists;

  const resetForm = () => {
    setForm(defaultFormValues);
  };

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!canSubmit) {
      return;
    }

    onCreateTeam({
      ...form,
      teamName: form.teamName.trim(),
      teamKey: normalizedKey,
      teamLead: form.teamLead.trim(),
      description: form.description.trim(),
    });

    toast.success("Team created", {
      description: "Team details are saved locally for now.",
    });
    resetForm();
    onOpenChange(false);
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(nextOpen) => {
        onOpenChange(nextOpen);
        if (!nextOpen) {
          resetForm();
        }
      }}
    >
      <DialogContent className="p-6 sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Create a team</DialogTitle>
          <DialogDescription>
            Start with the required identity fields. Team structure and rules
            can be refined later.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit}>
          <FieldSet className="w-full">
            <FieldGroup className="gap-4">
              <Input
                label="Team name"
                placeholder="Design Systems"
                value={form.teamName}
                onChange={(event) =>
                  setForm((prev) => ({
                    ...prev,
                    teamName: event.target.value,
                  }))
                }
              />

              <Input
                label="Team key"
                placeholder="DSYS"
                value={form.teamKey}
                onChange={(event) =>
                  setForm((prev) => ({
                    ...prev,
                    teamKey: normalizeTeamKey(event.target.value),
                  }))
                }
                tip="Use 2-12 letters, numbers, or hyphens."
              />
              {teamKeyExists && (
                <FieldDescription className="text-destructive -mt-2">
                  A team with this key already exists.
                </FieldDescription>
              )}

              <div className="flex flex-col gap-2">
                <FieldLabel>Team lead</FieldLabel>
                <Select
                  value={form.teamLead}
                  onValueChange={(value) =>
                    setForm((prev) => ({
                      ...prev,
                      teamLead: value,
                    }))
                  }
                >
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Select team lead" />
                  </SelectTrigger>
                  <SelectContent>
                    {leadOptions.map((lead) => (
                      <SelectItem key={lead} value={lead}>
                        {lead}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="flex flex-col gap-2">
                <FieldLabel>Visibility</FieldLabel>
                <Select
                  value={form.visibility}
                  onValueChange={(value) =>
                    setForm((prev) => ({
                      ...prev,
                      visibility: value as CreateTeamFormValue["visibility"],
                    }))
                  }
                >
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Select visibility" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="open">Open in workspace</SelectItem>
                    <SelectItem value="private">Private team</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="flex flex-col gap-2">
                <FieldLabel>Team description</FieldLabel>
                <Textarea
                  placeholder="What this team owns across projects and workflows..."
                  value={form.description}
                  onChange={(event) =>
                    setForm((prev) => ({
                      ...prev,
                      description: event.target.value,
                    }))
                  }
                />
              </div>
            </FieldGroup>

            <div className="flex items-center gap-2 pt-2">
              <Button type="submit" size="sm" disabled={!canSubmit}>
                Create team
              </Button>
              <Button
                type="button"
                size="sm"
                variant="ghost"
                onClick={() => {
                  resetForm();
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

export default SettingsWorkspaceTeamsAddTeamModal;
