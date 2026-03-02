"use client";

import { useMemo, useState } from "react";
import { toast } from "sonner";
import { Button } from "../ui/button";
import {
  Field,
  FieldContent,
  FieldDescription,
  FieldGroup,
  FieldLegend,
  FieldSeparator,
  FieldSet,
  FieldTitle,
} from "../ui/field";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../ui/select";
import { Switch } from "../ui/switch";

type ImportAccessSettings = {
  allowOwnersAndAdmins: boolean;
  allowMembers: boolean;
  autoCreateTeams: boolean;
  autoCreateWorkflowPhases: boolean;
  deduplicateImportedTasks: boolean;
  ownerStrategy: "importer" | "workspace-owner" | "unassigned";
};

type MappingDefaultsSettings = {
  statusMappingMode: "strict" | "smart" | "manual-review";
  dateParsingMode: "iso" | "locale" | "mixed";
  labelConflictMode: "merge" | "keep-source" | "overwrite";
  preserveSourceIds: boolean;
  attachImportReports: boolean;
};

const DEFAULT_IMPORT_ACCESS: ImportAccessSettings = {
  allowOwnersAndAdmins: true,
  allowMembers: false,
  autoCreateTeams: false,
  autoCreateWorkflowPhases: true,
  deduplicateImportedTasks: true,
  ownerStrategy: "importer",
};

const DEFAULT_MAPPING_DEFAULTS: MappingDefaultsSettings = {
  statusMappingMode: "smart",
  dateParsingMode: "mixed",
  labelConflictMode: "merge",
  preserveSourceIds: true,
  attachImportReports: true,
};

const IMPORT_SOURCES = [
  {
    id: "csv",
    name: "CSV / Spreadsheet",
    description: "Bulk import tasks and workflows from CSV exports.",
  },
  {
    id: "trello",
    name: "Trello",
    description: "Map boards, lists, and cards into projects and workflows.",
  },
  {
    id: "notion",
    name: "Notion",
    description: "Import pages and task databases into project structures.",
  },
  {
    id: "clickup",
    name: "ClickUp",
    description: "Bring lists, assignees, and status flows into your workspace.",
  },
];

const hasChanges = <T extends Record<string, string | boolean>>(
  value: T,
  saved: T,
) => {
  return (Object.keys(value) as Array<keyof T>).some(
    (key) => value[key] !== saved[key],
  );
};

const SettingsWorkspaceImport = () => {
  const [importAccess, setImportAccess] = useState<ImportAccessSettings>(
    DEFAULT_IMPORT_ACCESS,
  );
  const [savedImportAccess, setSavedImportAccess] =
    useState<ImportAccessSettings>(DEFAULT_IMPORT_ACCESS);

  const [mappingDefaults, setMappingDefaults] =
    useState<MappingDefaultsSettings>(DEFAULT_MAPPING_DEFAULTS);
  const [savedMappingDefaults, setSavedMappingDefaults] =
    useState<MappingDefaultsSettings>(DEFAULT_MAPPING_DEFAULTS);

  const importAccessChanged = useMemo(
    () => hasChanges(importAccess, savedImportAccess),
    [importAccess, savedImportAccess],
  );
  const mappingDefaultsChanged = useMemo(
    () => hasChanges(mappingDefaults, savedMappingDefaults),
    [mappingDefaults, savedMappingDefaults],
  );

  const handleSaveImportAccess = () => {
    setSavedImportAccess(importAccess);
    toast.success("Import access updated", {
      description: "Import permissions are saved locally for now.",
    });
  };

  const handleSaveMappingDefaults = () => {
    setSavedMappingDefaults(mappingDefaults);
    toast.success("Import mapping defaults updated", {
      description: "Import mapping behavior is saved locally for now.",
    });
  };

  const handleSourceImport = (sourceName: string) => {
    toast.success("Import flow not connected yet", {
      description: `${sourceName} importer UI is ready for backend wiring.`,
    });
  };

  return (
    <FieldGroup className="gap-8">
      <FieldSet>
        <FieldLegend>Import Access</FieldLegend>
        <FieldDescription>
          Control who can run imports and how imported structures are created.
        </FieldDescription>

        <Field orientation="horizontal">
          <FieldContent>
            <FieldTitle>Allow owners/admins to import</FieldTitle>
            <FieldDescription>
              Enable import tools for workspace owners and admins.
            </FieldDescription>
          </FieldContent>
          <Switch
            checked={importAccess.allowOwnersAndAdmins}
            onCheckedChange={(checked) =>
              setImportAccess((prev) => ({
                ...prev,
                allowOwnersAndAdmins: checked,
              }))
            }
          />
        </Field>

        <Field orientation="horizontal">
          <FieldContent>
            <FieldTitle>Allow members to import</FieldTitle>
            <FieldDescription>
              Permit non-admin members to run import operations.
            </FieldDescription>
          </FieldContent>
          <Switch
            checked={importAccess.allowMembers}
            onCheckedChange={(checked) =>
              setImportAccess((prev) => ({ ...prev, allowMembers: checked }))
            }
          />
        </Field>

        <Field orientation="horizontal">
          <FieldContent>
            <FieldTitle>Auto-create teams from import data</FieldTitle>
            <FieldDescription>
              Create missing teams if source data includes team groups.
            </FieldDescription>
          </FieldContent>
          <Switch
            checked={importAccess.autoCreateTeams}
            onCheckedChange={(checked) =>
              setImportAccess((prev) => ({ ...prev, autoCreateTeams: checked }))
            }
          />
        </Field>

        <Field orientation="horizontal">
          <FieldContent>
            <FieldTitle>Auto-create workflow phases</FieldTitle>
            <FieldDescription>
              Create phase structures when source statuses are detected.
            </FieldDescription>
          </FieldContent>
          <Switch
            checked={importAccess.autoCreateWorkflowPhases}
            onCheckedChange={(checked) =>
              setImportAccess((prev) => ({
                ...prev,
                autoCreateWorkflowPhases: checked,
              }))
            }
          />
        </Field>

        <Field orientation="horizontal">
          <FieldContent>
            <FieldTitle>Deduplicate imported tasks</FieldTitle>
            <FieldDescription>
              Detect and merge probable duplicate tasks during import.
            </FieldDescription>
          </FieldContent>
          <Switch
            checked={importAccess.deduplicateImportedTasks}
            onCheckedChange={(checked) =>
              setImportAccess((prev) => ({
                ...prev,
                deduplicateImportedTasks: checked,
              }))
            }
          />
        </Field>

        <Field orientation="horizontal">
          <FieldContent>
            <FieldTitle>Imported task owner strategy</FieldTitle>
            <FieldDescription>
              Decide ownership when source assignees cannot be resolved.
            </FieldDescription>
          </FieldContent>
          <Select
            value={importAccess.ownerStrategy}
            onValueChange={(value) =>
              setImportAccess((prev) => ({
                ...prev,
                ownerStrategy: value as ImportAccessSettings["ownerStrategy"],
              }))
            }
          >
            <SelectTrigger className="w-44">
              <SelectValue placeholder="Owner strategy" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="importer">Use importer</SelectItem>
              <SelectItem value="workspace-owner">Use workspace owner</SelectItem>
              <SelectItem value="unassigned">Leave unassigned</SelectItem>
            </SelectContent>
          </Select>
        </Field>

        <div className="flex items-center gap-2">
          <Button size="sm" className="max-w-20" disabled={!importAccessChanged} onClick={handleSaveImportAccess}>
            Save
          </Button>
          <Button
            size="sm"
            className="max-w-20"
            variant="ghost"
            disabled={!importAccessChanged}
            onClick={() => setImportAccess(savedImportAccess)}
          >
            Reset
          </Button>
        </div>
      </FieldSet>

      <FieldSeparator />

      <FieldSet>
        <FieldLegend>Import Sources</FieldLegend>
        <FieldDescription>
          Start import flows from supported external tools and file formats.
        </FieldDescription>

        {IMPORT_SOURCES.map((source) => (
          <Field key={source.id} orientation="horizontal">
            <FieldContent>
              <FieldTitle>{source.name}</FieldTitle>
              <FieldDescription>{source.description}</FieldDescription>
            </FieldContent>
            <Button
              size="sm"
              variant="outline"
              onClick={() => handleSourceImport(source.name)}
            >
              Start import
            </Button>
          </Field>
        ))}
      </FieldSet>

      <FieldSeparator />

      <FieldSet>
        <FieldLegend>Mapping Defaults</FieldLegend>
        <FieldDescription>
          Set default mapping behavior for status, dates, labels, and reporting.
        </FieldDescription>

        <Field orientation="horizontal">
          <FieldContent>
            <FieldTitle>Status mapping mode</FieldTitle>
            <FieldDescription>
              Choose how source statuses map to workflow phases.
            </FieldDescription>
          </FieldContent>
          <Select
            value={mappingDefaults.statusMappingMode}
            onValueChange={(value) =>
              setMappingDefaults((prev) => ({
                ...prev,
                statusMappingMode:
                  value as MappingDefaultsSettings["statusMappingMode"],
              }))
            }
          >
            <SelectTrigger className="w-44">
              <SelectValue placeholder="Status mapping" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="strict">Strict</SelectItem>
              <SelectItem value="smart">Smart</SelectItem>
              <SelectItem value="manual-review">Manual review</SelectItem>
            </SelectContent>
          </Select>
        </Field>

        <Field orientation="horizontal">
          <FieldContent>
            <FieldTitle>Date parsing mode</FieldTitle>
            <FieldDescription>
              Decide how imported date values should be parsed.
            </FieldDescription>
          </FieldContent>
          <Select
            value={mappingDefaults.dateParsingMode}
            onValueChange={(value) =>
              setMappingDefaults((prev) => ({
                ...prev,
                dateParsingMode: value as MappingDefaultsSettings["dateParsingMode"],
              }))
            }
          >
            <SelectTrigger className="w-40">
              <SelectValue placeholder="Date parsing" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="iso">ISO only</SelectItem>
              <SelectItem value="locale">Locale-based</SelectItem>
              <SelectItem value="mixed">Mixed formats</SelectItem>
            </SelectContent>
          </Select>
        </Field>

        <Field orientation="horizontal">
          <FieldContent>
            <FieldTitle>Label conflict strategy</FieldTitle>
            <FieldDescription>
              Resolve label clashes when source and destination differ.
            </FieldDescription>
          </FieldContent>
          <Select
            value={mappingDefaults.labelConflictMode}
            onValueChange={(value) =>
              setMappingDefaults((prev) => ({
                ...prev,
                labelConflictMode:
                  value as MappingDefaultsSettings["labelConflictMode"],
              }))
            }
          >
            <SelectTrigger className="w-44">
              <SelectValue placeholder="Label strategy" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="merge">Merge labels</SelectItem>
              <SelectItem value="keep-source">Keep source labels</SelectItem>
              <SelectItem value="overwrite">Overwrite destination</SelectItem>
            </SelectContent>
          </Select>
        </Field>

        <Field orientation="horizontal">
          <FieldContent>
            <FieldTitle>Preserve source IDs</FieldTitle>
            <FieldDescription>
              Store original IDs for cross-system traceability.
            </FieldDescription>
          </FieldContent>
          <Switch
            checked={mappingDefaults.preserveSourceIds}
            onCheckedChange={(checked) =>
              setMappingDefaults((prev) => ({
                ...prev,
                preserveSourceIds: checked,
              }))
            }
          />
        </Field>

        <Field orientation="horizontal">
          <FieldContent>
            <FieldTitle>Attach import reports</FieldTitle>
            <FieldDescription>
              Generate summary reports after every import run.
            </FieldDescription>
          </FieldContent>
          <Switch
            checked={mappingDefaults.attachImportReports}
            onCheckedChange={(checked) =>
              setMappingDefaults((prev) => ({
                ...prev,
                attachImportReports: checked,
              }))
            }
          />
        </Field>

        <div className="flex items-center gap-2">
          <Button
            size="sm"
            className="max-w-20"
            disabled={!mappingDefaultsChanged}
            onClick={handleSaveMappingDefaults}
          >
            Save
          </Button>
          <Button
            size="sm"
            className="max-w-20"
            variant="ghost"
            disabled={!mappingDefaultsChanged}
            onClick={() => setMappingDefaults(savedMappingDefaults)}
          >
            Reset
          </Button>
        </div>
      </FieldSet>
    </FieldGroup>
  );
};

export default SettingsWorkspaceImport;
