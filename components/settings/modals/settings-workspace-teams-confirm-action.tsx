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

type ActionType = "archive" | "restore" | "dissolve";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  action: ActionType;
  teamName?: string;
  teamKey?: string;
  onConfirm: () => void | Promise<void>;
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

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!canConfirm) {
      return;
    }

    await onConfirm();
    setConfirmText("");
    onOpenChange(false);
  };

  const title =
    action === "archive"
      ? "Archive team"
      : action === "restore"
        ? "Restore team"
        : "Dissolve team";

  const description =
    action === "archive"
      ? `Archive ${teamName ?? "this team"}. It will be removed from the active teams list.`
      : action === "restore"
        ? `Restore ${teamName ?? "this team"}. It will return to the active teams list.`
        : `Dissolve ${teamName ?? "this team"}. This action is destructive and should be deliberate.`;

  const confirmLabel =
    action === "archive"
      ? "Archive"
      : action === "restore"
        ? "Restore"
        : "Dissolve";

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
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>{description}</DialogDescription>
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
              <Button
                size="sm"
                variant={action === "dissolve" ? "destructive" : "default"}
                disabled={!canConfirm}
              >
                {confirmLabel}
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
