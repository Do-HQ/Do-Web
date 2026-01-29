import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { P } from "../ui/typography";
import {
  Field,
  FieldContent,
  FieldDescription,
  FieldGroup,
  FieldLabel,
} from "../ui/field";
import { Checkbox } from "../ui/checkbox";
import { useState } from "react";
import Link from "next/link";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const JoinWorkspaceModal = ({ open, onOpenChange }: Props) => {
  // States
  const [isChecked, setIsChecked] = useState(false);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-130">
        <DialogHeader>
          <DialogTitle>Request to Join “workspace-name”</DialogTitle>
          <DialogDescription>
            You’re about to request access to this workspace.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <P>
            Joining a workspace lets you collaborate with its members, access
            shared resources, and take part in ongoing projects.
          </P>

          <P>
            When you submit this request, the workspace administrators will
            review it. Once your request is approved, you’ll automatically gain
            access and be notified.
          </P>

          <P className="text-muted-foreground">
            Before sending your request, make sure your profile information is
            up to date so admins can better understand who you are and how
            you’ll contribute.
          </P>

          <FieldGroup className="w-full">
            <Field orientation="horizontal">
              <Checkbox
                id="terms-checkbox-desc"
                name="terms-checkbox-desc"
                checked={isChecked}
                onCheckedChange={(e: boolean) => setIsChecked(e)}
              />
              <FieldContent>
                <FieldLabel htmlFor="terms-checkbox-desc">
                  Accept terms and conditions
                </FieldLabel>
                <FieldDescription>
                  By clicking this checkbox, you agree to this workspace&apos;s{" "}
                  <Link href="#">terms and conditions.</Link>
                </FieldDescription>
              </FieldContent>
            </Field>
          </FieldGroup>
        </div>

        <DialogFooter>
          <DialogClose asChild>
            <Button variant="outline">Cancel</Button>
          </DialogClose>

          <DialogClose asChild>
            <Button type="submit" disabled={!isChecked}>
              Request to Join
            </Button>
          </DialogClose>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default JoinWorkspaceModal;
