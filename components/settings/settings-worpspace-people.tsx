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
import SettingsWorkspacePropleInvitesTable from "./settings-workspace-people-invite-table";
import SettingsWorkspacePeopleTable from "./settings-workspace-prople-table";
import { WorkspaceTeamsTable } from "./settings-worpspace-teams-table";

const SettingsWorkspacePeople = () => {
  return (
    <div>
      <FieldGroup>
        <FieldSet>
          <FieldLegend>Workspace People</FieldLegend>
          <FieldDescription>
            These details identify your workspace and are visible to members.
          </FieldDescription>
          <SettingsWorkspacePeopleTable />
        </FieldSet>

        <FieldSeparator />

        <FieldSet>
          <FieldLegend>Workspace Invites</FieldLegend>
          <FieldDescription>
            These details identify your workspace and are visible to members.
          </FieldDescription>
          <SettingsWorkspacePropleInvitesTable />
        </FieldSet>
      </FieldGroup>
    </div>
  );
};

export default SettingsWorkspacePeople;
