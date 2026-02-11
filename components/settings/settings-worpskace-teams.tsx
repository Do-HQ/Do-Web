import {
  Field,
  FieldContent,
  FieldDescription,
  FieldGroup,
  FieldLabel,
  FieldLegend,
  FieldSeparator,
  FieldSet,
} from "../ui/field";
import { Switch } from "../ui/switch";
import { WorkspaceTeamsTable } from "./settings-worpspace-teams-table";

const SettingsWorkspaceTeams = () => {
  return (
    <div>
      <FieldGroup>
        <FieldSet>
          <FieldLegend>Workspace Teams</FieldLegend>
          <FieldDescription>
            These details identify your workspace and are visible to members.
          </FieldDescription>
        </FieldSet>

        <FieldSeparator />
        <FieldSet>
          <Field orientation="horizontal">
            <FieldContent>
              <FieldLabel htmlFor="switch-focus-mode">
                Restrict teams creation
              </FieldLabel>
              <FieldDescription>
                Only workspace owners can create teams
              </FieldDescription>
            </FieldContent>
            <Switch id="switch-focus-mode" />
          </Field>
        </FieldSet>

        <FieldSeparator />

        <WorkspaceTeamsTable />
      </FieldGroup>
    </div>
  );
};

export default SettingsWorkspaceTeams;
