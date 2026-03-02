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

type AccessSecuritySettings = {
  enforceSso: boolean;
  enforceTwoFactor: boolean;
  restrictByIpAllowlist: boolean;
  blockPublicShareLinks: boolean;
  sessionTimeout: "30m" | "1h" | "8h" | "24h";
};

type DataProtectionSettings = {
  allowDataExport: boolean;
  maskSensitiveFields: boolean;
  watermarkExports: boolean;
  requireExportApproval: boolean;
  dataRetention: "90" | "180" | "365";
};

type IncidentAuditSettings = {
  sendSecurityAlerts: boolean;
  autoLockSuspiciousSessions: boolean;
  notifyOnRoleEscalation: boolean;
  allowSelfServiceRecovery: boolean;
  auditLogLevel: "standard" | "detailed";
};

const DEFAULT_ACCESS_SECURITY: AccessSecuritySettings = {
  enforceSso: false,
  enforceTwoFactor: true,
  restrictByIpAllowlist: false,
  blockPublicShareLinks: true,
  sessionTimeout: "8h",
};

const DEFAULT_DATA_PROTECTION: DataProtectionSettings = {
  allowDataExport: true,
  maskSensitiveFields: true,
  watermarkExports: true,
  requireExportApproval: false,
  dataRetention: "365",
};

const DEFAULT_INCIDENT_AUDIT: IncidentAuditSettings = {
  sendSecurityAlerts: true,
  autoLockSuspiciousSessions: true,
  notifyOnRoleEscalation: true,
  allowSelfServiceRecovery: false,
  auditLogLevel: "detailed",
};

const hasChanges = <T extends Record<string, string | boolean>>(
  value: T,
  saved: T,
) => {
  return (Object.keys(value) as Array<keyof T>).some(
    (key) => value[key] !== saved[key],
  );
};

const SettingsWorkspaceSecurity = () => {
  const [accessSecurity, setAccessSecurity] = useState<AccessSecuritySettings>(
    DEFAULT_ACCESS_SECURITY,
  );
  const [savedAccessSecurity, setSavedAccessSecurity] =
    useState<AccessSecuritySettings>(DEFAULT_ACCESS_SECURITY);

  const [dataProtection, setDataProtection] = useState<DataProtectionSettings>(
    DEFAULT_DATA_PROTECTION,
  );
  const [savedDataProtection, setSavedDataProtection] =
    useState<DataProtectionSettings>(DEFAULT_DATA_PROTECTION);

  const [incidentAudit, setIncidentAudit] = useState<IncidentAuditSettings>(
    DEFAULT_INCIDENT_AUDIT,
  );
  const [savedIncidentAudit, setSavedIncidentAudit] =
    useState<IncidentAuditSettings>(DEFAULT_INCIDENT_AUDIT);

  const accessChanged = useMemo(
    () => hasChanges(accessSecurity, savedAccessSecurity),
    [accessSecurity, savedAccessSecurity],
  );
  const dataProtectionChanged = useMemo(
    () => hasChanges(dataProtection, savedDataProtection),
    [dataProtection, savedDataProtection],
  );
  const incidentAuditChanged = useMemo(
    () => hasChanges(incidentAudit, savedIncidentAudit),
    [incidentAudit, savedIncidentAudit],
  );

  const handleSaveAccess = () => {
    setSavedAccessSecurity(accessSecurity);
    toast.success("Access security updated", {
      description: "Security access controls are saved locally for now.",
    });
  };

  const handleSaveDataProtection = () => {
    setSavedDataProtection(dataProtection);
    toast.success("Data protection updated", {
      description: "Data protection rules are saved locally for now.",
    });
  };

  const handleSaveIncidentAudit = () => {
    setSavedIncidentAudit(incidentAudit);
    toast.success("Audit settings updated", {
      description: "Security monitoring rules are saved locally for now.",
    });
  };

  return (
    <FieldGroup className="gap-8">
      <FieldSet>
        <FieldLegend>Access Security</FieldLegend>
        <FieldDescription>
          Control authentication strength and workspace session behavior.
        </FieldDescription>

        <Field orientation="horizontal">
          <FieldContent>
            <FieldTitle>Enforce SSO</FieldTitle>
            <FieldDescription>
              Require sign-in through your identity provider.
            </FieldDescription>
          </FieldContent>
          <Switch
            checked={accessSecurity.enforceSso}
            onCheckedChange={(checked) =>
              setAccessSecurity((prev) => ({ ...prev, enforceSso: checked }))
            }
          />
        </Field>

        <Field orientation="horizontal">
          <FieldContent>
            <FieldTitle>Require two-factor authentication</FieldTitle>
            <FieldDescription>
              Enforce 2FA for all members in this workspace.
            </FieldDescription>
          </FieldContent>
          <Switch
            checked={accessSecurity.enforceTwoFactor}
            onCheckedChange={(checked) =>
              setAccessSecurity((prev) => ({ ...prev, enforceTwoFactor: checked }))
            }
          />
        </Field>

        <Field orientation="horizontal">
          <FieldContent>
            <FieldTitle>Restrict by IP allowlist</FieldTitle>
            <FieldDescription>
              Allow access only from approved network ranges.
            </FieldDescription>
          </FieldContent>
          <Switch
            checked={accessSecurity.restrictByIpAllowlist}
            onCheckedChange={(checked) =>
              setAccessSecurity((prev) => ({ ...prev, restrictByIpAllowlist: checked }))
            }
          />
        </Field>

        <Field orientation="horizontal">
          <FieldContent>
            <FieldTitle>Block public share links</FieldTitle>
            <FieldDescription>
              Prevent access through publicly accessible project links.
            </FieldDescription>
          </FieldContent>
          <Switch
            checked={accessSecurity.blockPublicShareLinks}
            onCheckedChange={(checked) =>
              setAccessSecurity((prev) => ({ ...prev, blockPublicShareLinks: checked }))
            }
          />
        </Field>

        <Field orientation="horizontal">
          <FieldContent>
            <FieldTitle>Session timeout</FieldTitle>
            <FieldDescription>
              Choose inactivity timeout for authenticated sessions.
            </FieldDescription>
          </FieldContent>
          <Select
            value={accessSecurity.sessionTimeout}
            onValueChange={(value) =>
              setAccessSecurity((prev) => ({
                ...prev,
                sessionTimeout: value as AccessSecuritySettings["sessionTimeout"],
              }))
            }
          >
            <SelectTrigger className="w-40">
              <SelectValue placeholder="Timeout" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="30m">30 minutes</SelectItem>
              <SelectItem value="1h">1 hour</SelectItem>
              <SelectItem value="8h">8 hours</SelectItem>
              <SelectItem value="24h">24 hours</SelectItem>
            </SelectContent>
          </Select>
        </Field>

        <div className="flex items-center gap-2">
          <Button size="sm" className="max-w-20" disabled={!accessChanged} onClick={handleSaveAccess}>
            Save
          </Button>
          <Button
            size="sm"
            className="max-w-20"
            variant="ghost"
            disabled={!accessChanged}
            onClick={() => setAccessSecurity(savedAccessSecurity)}
          >
            Reset
          </Button>
        </div>
      </FieldSet>

      <FieldSeparator />

      <FieldSet>
        <FieldLegend>Data Protection</FieldLegend>
        <FieldDescription>
          Set export permissions and controls for sensitive workspace data.
        </FieldDescription>

        <Field orientation="horizontal">
          <FieldContent>
            <FieldTitle>Allow data exports</FieldTitle>
            <FieldDescription>
              Permit CSV and report exports from workspace entities.
            </FieldDescription>
          </FieldContent>
          <Switch
            checked={dataProtection.allowDataExport}
            onCheckedChange={(checked) =>
              setDataProtection((prev) => ({ ...prev, allowDataExport: checked }))
            }
          />
        </Field>

        <Field orientation="horizontal">
          <FieldContent>
            <FieldTitle>Mask sensitive fields in exports</FieldTitle>
            <FieldDescription>
              Redact critical data in generated reports and files.
            </FieldDescription>
          </FieldContent>
          <Switch
            checked={dataProtection.maskSensitiveFields}
            onCheckedChange={(checked) =>
              setDataProtection((prev) => ({ ...prev, maskSensitiveFields: checked }))
            }
          />
        </Field>

        <Field orientation="horizontal">
          <FieldContent>
            <FieldTitle>Watermark exported files</FieldTitle>
            <FieldDescription>
              Include workspace identity watermark on exported documents.
            </FieldDescription>
          </FieldContent>
          <Switch
            checked={dataProtection.watermarkExports}
            onCheckedChange={(checked) =>
              setDataProtection((prev) => ({ ...prev, watermarkExports: checked }))
            }
          />
        </Field>

        <Field orientation="horizontal">
          <FieldContent>
            <FieldTitle>Require export approval</FieldTitle>
            <FieldDescription>
              Route export requests through admin review workflow.
            </FieldDescription>
          </FieldContent>
          <Switch
            checked={dataProtection.requireExportApproval}
            onCheckedChange={(checked) =>
              setDataProtection((prev) => ({
                ...prev,
                requireExportApproval: checked,
              }))
            }
          />
        </Field>

        <Field orientation="horizontal">
          <FieldContent>
            <FieldTitle>Data retention</FieldTitle>
            <FieldDescription>
              Define log and audit data retention duration.
            </FieldDescription>
          </FieldContent>
          <Select
            value={dataProtection.dataRetention}
            onValueChange={(value) =>
              setDataProtection((prev) => ({
                ...prev,
                dataRetention: value as DataProtectionSettings["dataRetention"],
              }))
            }
          >
            <SelectTrigger className="w-40">
              <SelectValue placeholder="Retention" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="90">90 days</SelectItem>
              <SelectItem value="180">180 days</SelectItem>
              <SelectItem value="365">365 days</SelectItem>
            </SelectContent>
          </Select>
        </Field>

        <div className="flex items-center gap-2">
          <Button
            size="sm"
            className="max-w-20"
            disabled={!dataProtectionChanged}
            onClick={handleSaveDataProtection}
          >
            Save
          </Button>
          <Button
            size="sm"
            className="max-w-20"
            variant="ghost"
            disabled={!dataProtectionChanged}
            onClick={() => setDataProtection(savedDataProtection)}
          >
            Reset
          </Button>
        </div>
      </FieldSet>

      <FieldSeparator />

      <FieldSet>
        <FieldLegend>Incident &amp; Audit</FieldLegend>
        <FieldDescription>
          Configure monitoring signals and incident response defaults.
        </FieldDescription>

        <Field orientation="horizontal">
          <FieldContent>
            <FieldTitle>Send security alerts</FieldTitle>
            <FieldDescription>
              Notify workspace admins about risky account behavior.
            </FieldDescription>
          </FieldContent>
          <Switch
            checked={incidentAudit.sendSecurityAlerts}
            onCheckedChange={(checked) =>
              setIncidentAudit((prev) => ({ ...prev, sendSecurityAlerts: checked }))
            }
          />
        </Field>

        <Field orientation="horizontal">
          <FieldContent>
            <FieldTitle>Auto-lock suspicious sessions</FieldTitle>
            <FieldDescription>
              Immediately suspend sessions with suspicious activity patterns.
            </FieldDescription>
          </FieldContent>
          <Switch
            checked={incidentAudit.autoLockSuspiciousSessions}
            onCheckedChange={(checked) =>
              setIncidentAudit((prev) => ({
                ...prev,
                autoLockSuspiciousSessions: checked,
              }))
            }
          />
        </Field>

        <Field orientation="horizontal">
          <FieldContent>
            <FieldTitle>Notify on role escalation</FieldTitle>
            <FieldDescription>
              Alert owners when high-privilege roles are assigned.
            </FieldDescription>
          </FieldContent>
          <Switch
            checked={incidentAudit.notifyOnRoleEscalation}
            onCheckedChange={(checked) =>
              setIncidentAudit((prev) => ({ ...prev, notifyOnRoleEscalation: checked }))
            }
          />
        </Field>

        <Field orientation="horizontal">
          <FieldContent>
            <FieldTitle>Allow self-service recovery</FieldTitle>
            <FieldDescription>
              Permit members to recover locked sessions without admin support.
            </FieldDescription>
          </FieldContent>
          <Switch
            checked={incidentAudit.allowSelfServiceRecovery}
            onCheckedChange={(checked) =>
              setIncidentAudit((prev) => ({
                ...prev,
                allowSelfServiceRecovery: checked,
              }))
            }
          />
        </Field>

        <Field orientation="horizontal">
          <FieldContent>
            <FieldTitle>Audit log detail level</FieldTitle>
            <FieldDescription>
              Choose how detailed security event trails should be.
            </FieldDescription>
          </FieldContent>
          <Select
            value={incidentAudit.auditLogLevel}
            onValueChange={(value) =>
              setIncidentAudit((prev) => ({
                ...prev,
                auditLogLevel: value as IncidentAuditSettings["auditLogLevel"],
              }))
            }
          >
            <SelectTrigger className="w-40">
              <SelectValue placeholder="Log level" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="standard">Standard</SelectItem>
              <SelectItem value="detailed">Detailed</SelectItem>
            </SelectContent>
          </Select>
        </Field>

        <div className="flex items-center gap-2">
          <Button
            size="sm"
            className="max-w-20"
            disabled={!incidentAuditChanged}
            onClick={handleSaveIncidentAudit}
          >
            Save
          </Button>
          <Button
            size="sm"
            className="max-w-20"
            variant="ghost"
            disabled={!incidentAuditChanged}
            onClick={() => setIncidentAudit(savedIncidentAudit)}
          >
            Reset
          </Button>
        </div>
      </FieldSet>
    </FieldGroup>
  );
};

export default SettingsWorkspaceSecurity;
