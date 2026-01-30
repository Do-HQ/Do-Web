import React from "react";
import {
  Field,
  FieldContent,
  FieldDescription,
  FieldGroup,
  FieldLabel,
  FieldLegend,
  FieldSeparator,
  FieldSet,
  FieldTitle,
} from "../ui/field";
import { Input } from "../shared/input";
import { Button } from "../ui/button";
import { Copy, Trash2 } from "lucide-react";
import { P } from "../ui/typography";
import { RadioGroup, RadioGroupItem } from "../ui/radio-group";

const SettingsWorkspaceOverview = () => {
  return (
    <form>
      <FieldGroup>
        <FieldSet>
          <FieldLegend>Workspace Basics</FieldLegend>
          <FieldDescription>
            These details identify your workspace and are visible to members.
          </FieldDescription>
          <Input
            label="Workspace name"
            tip="Up to 80 characters. You can change this later."
            className="max-w-80"
            placeholder="Squircle Corp"
          />

          <Input
            label="Workspace URL"
            tip="Auto-generated from your workspace name"
            className="max-w-80"
            placeholder="squircle-corp"
            readOnly
          />
          <FieldSeparator />
        </FieldSet>

        <FieldSet>
          <FieldGroup className="w-full">
            <FieldSet>
              <FieldLegend variant="label">Workspace Visibility</FieldLegend>

              <FieldDescription>
                Control who can discover this workspace and how new members are
                allowed to join.
              </FieldDescription>

              <RadioGroup className="max-w-130">
                <FieldLabel htmlFor="public-r2h">
                  <Field orientation="horizontal">
                    <FieldContent>
                      <FieldTitle>Public Workspace</FieldTitle>
                      <FieldDescription>
                        This workspace is discoverable by anyone. People can
                        request to join, but access is only granted after
                        approval from an owner or administrator.
                      </FieldDescription>
                    </FieldContent>
                    <RadioGroupItem value="public" id="public-r2h" />
                  </Field>
                </FieldLabel>

                <FieldLabel htmlFor="private-r2h">
                  <Field orientation="horizontal">
                    <FieldContent>
                      <FieldTitle>Private Workspace</FieldTitle>
                      <FieldDescription>
                        This workspace is hidden from public discovery. Only
                        people who are directly invited by an owner or
                        administrator can join.
                      </FieldDescription>
                    </FieldContent>
                    <RadioGroupItem value="private" id="private-r2h" />
                  </Field>
                </FieldLabel>
              </RadioGroup>
            </FieldSet>
          </FieldGroup>
          <FieldSeparator />
        </FieldSet>

        <FieldSet>
          <FieldLegend>Allowed Domains</FieldLegend>
          <FieldDescription>
            Restrict sign-ups to specific email domains.
          </FieldDescription>
          <Input
            label="Email domains"
            tip="Workspace name must be less than 80 characters"
            className="max-w-80"
            placeholder="squircle.com, squircle.co"
          />

          <FieldSeparator />
        </FieldSet>

        <FieldSet>
          <FieldLegend>Workspace Credentials</FieldLegend>
          <FieldDescription>
            A unique identifier for this workspace. Used for API access and
            support.
          </FieldDescription>
          <FieldContent className="flex flex-row items-center gap-2">
            <P className="font-medium text-base">Workspace ID</P>
            <P className="text-muted-foreground ml-auto text-xs font-medium">
              85a9e729-09d2-4524-908f-0990fbf72d28
            </P>

            <Button size="sm" variant="ghost">
              <Copy />
            </Button>
          </FieldContent>
          <FieldSeparator />
        </FieldSet>

        <FieldSet>
          <FieldLegend>Danger Zone</FieldLegend>
          <FieldDescription>
            This will permanently delete the workspace and all its data.
          </FieldDescription>
          <FieldContent className="flex flex-col gap-2 max-w-120 justify-start">
            <Button variant="outline" className="w-50 text-destructive">
              <Trash2 />
              Delete Workspace
            </Button>
          </FieldContent>
        </FieldSet>
      </FieldGroup>
    </form>
  );
};

export default SettingsWorkspaceOverview;
