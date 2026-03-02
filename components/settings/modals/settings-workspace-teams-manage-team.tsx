"use client";

import { FormEvent, useMemo, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/shared/input";
import { FieldDescription, FieldGroup, FieldLabel, FieldSet } from "@/components/ui/field";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";

export type ManageTeamValue = {
  name: string;
  key: string;
  lead: string;
  visibility: "open" | "private";
  description: string;
};

type TeamIdentity = {
  id: string;
  name: string;
  key: string;
  lead: string;
  visibility: "open" | "private";
  description?: string;
};

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  team: TeamIdentity | null;
  leadOptions: string[];
  existingTeamKeys: string[];
  onSubmit: (payload: ManageTeamValue) => void;
}

const toKey = (value: string) => {
  return value
    .toUpperCase()
    .replace(/[^A-Z0-9-_ ]/g, "")
    .replace(/\s+/g, "-")
    .slice(0, 12);
};

const SettingsWorkspaceTeamsManageTeamModal = ({
  open,
  onOpenChange,
  team,
  leadOptions,
  existingTeamKeys,
  onSubmit,
}: Props) => {
  const initialValues: ManageTeamValue = {
    name: team?.name ?? "",
    key: team?.key ?? "",
    lead: team?.lead ?? "",
    visibility: team?.visibility ?? "open",
    description: team?.description ?? "",
  };

  const [form, setForm] = useState<ManageTeamValue>({
    ...initialValues,
  });

  const normalizedKey = useMemo(() => toKey(form.key), [form.key]);
  const keyTaken = useMemo(() => {
    if (!team) {
      return false;
    }

    return existingTeamKeys.some(
      (key) => key.toUpperCase() === normalizedKey.toUpperCase() && key !== team.key,
    );
  }, [existingTeamKeys, normalizedKey, team]);

  const canSubmit =
    !!form.name.trim() && !!normalizedKey.trim() && !!form.lead.trim() && !keyTaken;

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!canSubmit) {
      return;
    }

    onSubmit({
      ...form,
      name: form.name.trim(),
      key: normalizedKey,
      lead: form.lead.trim(),
      description: form.description.trim(),
    });

    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="p-6 sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Manage team</DialogTitle>
          <DialogDescription>
            Update team identity and ownership details.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit}>
          <FieldSet>
            <FieldGroup className="gap-4">
              <Input
                label="Team name"
                value={form.name}
                onChange={(event) =>
                  setForm((prev) => ({
                    ...prev,
                    name: event.target.value,
                  }))
                }
              />

              <Input
                label="Team key"
                value={form.key}
                onChange={(event) =>
                  setForm((prev) => ({
                    ...prev,
                    key: toKey(event.target.value),
                  }))
                }
              />
              {keyTaken && (
                <FieldDescription className="text-destructive -mt-2">
                  Another team already uses this key.
                </FieldDescription>
              )}

              <div className="flex flex-col gap-2">
                <FieldLabel>Team lead</FieldLabel>
                <Select
                  value={form.lead}
                  onValueChange={(value) =>
                    setForm((prev) => ({
                      ...prev,
                      lead: value,
                    }))
                  }
                >
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Select lead" />
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
                      visibility: value as ManageTeamValue["visibility"],
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
                <FieldLabel>Description</FieldLabel>
                <Textarea
                  value={form.description}
                  placeholder="Describe the team focus and ownership..."
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
              <Button size="sm" type="submit" disabled={!canSubmit}>
                Save
              </Button>
              <Button
                size="sm"
                type="button"
                variant="ghost"
                onClick={() => onOpenChange(false)}
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

export default SettingsWorkspaceTeamsManageTeamModal;
