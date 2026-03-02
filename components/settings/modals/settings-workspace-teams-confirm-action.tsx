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
import { Button } from "@/components/ui/button";
import { FieldGroup, FieldSet } from "@/components/ui/field";

type ActionType = "archive" | "dissolve";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  action: ActionType;
  teamName?: string;
  teamKey?: string;
  onConfirm: () => void;
}

const SettingsWorkspaceTeamsConfirmActionModal = ({
  open,
  onOpenChange,
  action,
  teamName,
  teamKey,
  onConfirm,
}: Props) => {
  const [confirmText, setConfirmText] = useState("");

  const requiresTypedConfirmation = action === "dissolve";

  const canConfirm = useMemo(() => {
    if (!requiresTypedConfirmation) {
      return true;
    }

    return confirmText.trim().toUpperCase() === (teamKey ?? "").toUpperCase();
  }, [confirmText, requiresTypedConfirmation, teamKey]);

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!canConfirm) {
      return;
    }

    onConfirm();
    setConfirmText("");
    onOpenChange(false);
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(nextOpen) => {
        onOpenChange(nextOpen);
        if (!nextOpen) {
          setConfirmText("");
        }
      }}
    >
      <DialogContent className="p-6 sm:max-w-md">
        <DialogHeader>
          <DialogTitle>
            {action === "archive" ? "Archive team" : "Dissolve team"}
          </DialogTitle>
          <DialogDescription>
            {action === "archive"
              ? `Archive ${teamName ?? "this team"}. It will be removed from the active teams list.`
              : `Dissolve ${teamName ?? "this team"}. This action is destructive and should be deliberate.`}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit}>
          <FieldSet>
            <FieldGroup className="gap-4">
              {requiresTypedConfirmation && (
                <Input
                  label={`Type ${teamKey ?? "team key"} to confirm`}
                  value={confirmText}
                  onChange={(event) => setConfirmText(event.target.value)}
                />
              )}
            </FieldGroup>

            <div className="flex items-center gap-2 pt-4">
              <Button size="sm" variant="destructive" disabled={!canConfirm}>
                {action === "archive" ? "Archive" : "Dissolve"}
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

export default SettingsWorkspaceTeamsConfirmActionModal;
