"use client";

import { useEffect, useMemo, useState } from "react";
import { Check, ChevronsUpDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
} from "@/components/ui/command";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import {
  Field,
  FieldContent,
  FieldDescription,
  FieldLabel,
  FieldTitle,
} from "@/components/ui/field";
import { cn } from "@/lib/utils";
import {
  REPORT_DELIVERY_OPTIONS,
  REPORT_FREQUENCY_OPTIONS,
  REPORT_TYPE_OPTIONS,
} from "./report-config";
import type {
  CreateWorkspaceReportScheduleRequestBody,
  WorkspaceReportSchedule,
} from "@/types/reports";

type RecipientOption = {
  id: string;
  email: string;
  label: string;
};

type WorkspaceReportScheduleFormProps = {
  mode: "create" | "edit";
  initialValue?: Partial<WorkspaceReportSchedule>;
  projectOptions: Array<{
    id: string;
    name: string;
  }>;
  recipientOptions: RecipientOption[];
  isSubmitting?: boolean;
  onSubmit: (payload: CreateWorkspaceReportScheduleRequestBody) => Promise<void> | void;
};

const normalizeIds = (value: unknown) =>
  Array.from(
    new Set(
      (Array.isArray(value) ? value : [])
        .map((entry) => String(entry || "").trim())
        .filter(Boolean),
    ),
  );

const WorkspaceReportScheduleForm = ({
  mode,
  initialValue,
  projectOptions,
  recipientOptions,
  isSubmitting,
  onSubmit,
}: WorkspaceReportScheduleFormProps) => {
  const [reportName, setReportName] = useState(initialValue?.reportName || "");
  const [reportType, setReportType] = useState<string>(
    initialValue?.reportType || REPORT_TYPE_OPTIONS[0].value,
  );
  const [frequency, setFrequency] = useState<string>(
    initialValue?.frequency || REPORT_FREQUENCY_OPTIONS[0].value,
  );
  const [timeOfDay, setTimeOfDay] = useState(initialValue?.timeOfDay || "09:00");
  const [timezone, setTimezone] = useState(initialValue?.timezone || "Africa/Lagos");
  const [projectId, setProjectId] = useState(initialValue?.projectId || "");
  const [customIntervalMinutes, setCustomIntervalMinutes] = useState(
    Number(initialValue?.customIntervalMinutes || 720),
  );
  const [isActive, setIsActive] = useState(
    typeof initialValue?.isActive === "boolean" ? initialValue.isActive : true,
  );
  const [deliveryChannels, setDeliveryChannels] = useState<string[]>(
    Array.isArray(initialValue?.deliveryChannels) && initialValue.deliveryChannels.length
      ? initialValue.deliveryChannels
      : ["DASHBOARD"],
  );
  const [recipientPickerOpen, setRecipientPickerOpen] = useState(false);
  const [recipientUserIds, setRecipientUserIds] = useState<string[]>(
    normalizeIds(initialValue?.recipientUserIds),
  );

  const recipientOptionMap = useMemo(
    () => new Map(recipientOptions.map((entry) => [entry.id, entry])),
    [recipientOptions],
  );

  useEffect(() => {
    if (recipientUserIds.length) {
      return;
    }

    const idsFromInitial = normalizeIds(initialValue?.recipientUserIds);
    if (idsFromInitial.length) {
      setRecipientUserIds(idsFromInitial);
      return;
    }

    const initialEmails = new Set(
      (Array.isArray(initialValue?.recipients) ? initialValue.recipients : [])
        .map((entry) => String(entry || "").trim().toLowerCase())
        .filter(Boolean),
    );

    if (!initialEmails.size || !recipientOptions.length) {
      return;
    }

    const matchedIds = recipientOptions
      .filter((entry) => initialEmails.has(entry.email))
      .map((entry) => entry.id);

    if (matchedIds.length) {
      setRecipientUserIds(Array.from(new Set(matchedIds)));
    }
  }, [initialValue?.recipientUserIds, initialValue?.recipients, recipientOptions, recipientUserIds.length]);

  const selectedRecipients = useMemo(
    () =>
      recipientUserIds
        .map((id) => recipientOptionMap.get(id))
        .filter((entry): entry is RecipientOption => Boolean(entry)),
    [recipientOptionMap, recipientUserIds],
  );

  const canSubmit = useMemo(() => {
    return (
      reportName.trim().length > 0 &&
      reportType &&
      frequency &&
      timeOfDay.trim().length > 0 &&
      timezone.trim().length > 0 &&
      deliveryChannels.length > 0
    );
  }, [deliveryChannels.length, frequency, reportName, reportType, timeOfDay, timezone]);

  const toggleDeliveryChannel = (channel: string, checked: boolean) => {
    if (checked) {
      setDeliveryChannels((current) => Array.from(new Set([...current, channel])));
      return;
    }

    setDeliveryChannels((current) => {
      const next = current.filter((entry) => entry !== channel);
      return next.length ? next : ["DASHBOARD"];
    });
  };

  const toggleRecipient = (recipientId: string) => {
    setRecipientUserIds((current) =>
      current.includes(recipientId)
        ? current.filter((entry) => entry !== recipientId)
        : [...current, recipientId],
    );
  };

  return (
    <form
      className="space-y-5"
      onSubmit={async (event) => {
        event.preventDefault();

        const payload: CreateWorkspaceReportScheduleRequestBody = {
          reportName: reportName.trim(),
          reportType: reportType as CreateWorkspaceReportScheduleRequestBody["reportType"],
          frequency: frequency as CreateWorkspaceReportScheduleRequestBody["frequency"],
          timeOfDay: timeOfDay.trim(),
          timezone: timezone.trim(),
          projectId: projectId.trim() || undefined,
          recipients: selectedRecipients.map((entry) => entry.email),
          recipientUserIds: recipientUserIds,
          deliveryChannels:
            deliveryChannels as CreateWorkspaceReportScheduleRequestBody["deliveryChannels"],
          customIntervalMinutes:
            frequency === "CUSTOM" ? Math.max(15, Number(customIntervalMinutes || 720)) : undefined,
          isActive,
        };

        await onSubmit(payload);
      }}
    >
      <div className="grid gap-4 md:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="reportName">Report name</Label>
          <Input
            id="reportName"
            value={reportName}
            onChange={(event) => setReportName(event.target.value)}
            placeholder="Weekly project health"
            maxLength={140}
            required
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="reportType">Report type</Label>
          <Select value={reportType} onValueChange={(value) => setReportType(value)}>
            <SelectTrigger id="reportType">
              <SelectValue placeholder="Select report type" />
            </SelectTrigger>
            <SelectContent>
              {REPORT_TYPE_OPTIONS.map((option) => (
                <SelectItem key={option.value} value={option.value}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label htmlFor="frequency">Frequency</Label>
          <Select value={frequency} onValueChange={(value) => setFrequency(value)}>
            <SelectTrigger id="frequency">
              <SelectValue placeholder="Select frequency" />
            </SelectTrigger>
            <SelectContent>
              {REPORT_FREQUENCY_OPTIONS.map((option) => (
                <SelectItem key={option.value} value={option.value}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label htmlFor="project">Project scope</Label>
          <Select
            value={projectId || "__workspace__"}
            onValueChange={(value) => setProjectId(value === "__workspace__" ? "" : value)}
          >
            <SelectTrigger id="project">
              <SelectValue placeholder="Workspace-wide" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="__workspace__">Workspace-wide</SelectItem>
              {projectOptions.map((project) => (
                <SelectItem key={project.id} value={project.id}>
                  {project.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label htmlFor="timeOfDay">Time of day</Label>
          <Input
            id="timeOfDay"
            type="time"
            value={timeOfDay}
            onChange={(event) => setTimeOfDay(event.target.value)}
            required
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="timezone">Timezone</Label>
          <Input
            id="timezone"
            value={timezone}
            onChange={(event) => setTimezone(event.target.value)}
            placeholder="Africa/Lagos"
            required
          />
        </div>

        {frequency === "CUSTOM" ? (
          <div className="space-y-2">
            <Label htmlFor="customInterval">Custom interval (minutes)</Label>
            <Input
              id="customInterval"
              type="number"
              min={15}
              max={43200}
              value={customIntervalMinutes}
              onChange={(event) => setCustomIntervalMinutes(Number(event.target.value || 720))}
            />
          </div>
        ) : null}
      </div>

      <div className="space-y-2">
        <Label>Recipients</Label>
        <Popover open={recipientPickerOpen} onOpenChange={setRecipientPickerOpen}>
          <PopoverTrigger asChild>
            <Button
              type="button"
              variant="outline"
              role="combobox"
              className="h-auto min-h-10 w-full justify-between px-3 py-2"
            >
              <span
                className={cn(
                  "truncate text-left text-sm",
                  selectedRecipients.length ? "text-foreground" : "text-muted-foreground",
                )}
              >
                {selectedRecipients.length
                  ? `${selectedRecipients.length} member${selectedRecipients.length === 1 ? "" : "s"} selected`
                  : "Select members who should receive this report"}
              </span>
              <ChevronsUpDown className="ml-2 size-4 shrink-0 opacity-60" />
            </Button>
          </PopoverTrigger>
          <PopoverContent align="start" className="w-[var(--radix-popover-trigger-width)] p-0">
            <Command>
              <CommandInput placeholder="Search members..." />
              <CommandEmpty>No members found.</CommandEmpty>
              <CommandGroup className="max-h-56 overflow-auto">
                {recipientOptions.map((option) => {
                  const checked = recipientUserIds.includes(option.id);

                  return (
                    <CommandItem
                      key={option.id}
                      onSelect={() => toggleRecipient(option.id)}
                      className="gap-2"
                    >
                      <Check className={cn("size-4", checked ? "opacity-100" : "opacity-0")} />
                      <div className="min-w-0">
                        <p className="truncate text-sm">{option.label}</p>
                        <p className="text-muted-foreground truncate text-xs">
                          {option.email}
                        </p>
                      </div>
                    </CommandItem>
                  );
                })}
              </CommandGroup>
            </Command>
          </PopoverContent>
        </Popover>
      </div>

      <div className="space-y-2">
        <Label>Delivery channels</Label>
        <div className="space-y-2">
          {REPORT_DELIVERY_OPTIONS.map((option) => {
            const checked = deliveryChannels.includes(option.value);

            return (
              <FieldLabel key={option.value} htmlFor={`delivery-${option.value}`}>
                <Field orientation="horizontal">
                  <FieldContent>
                    <FieldTitle>{option.label}</FieldTitle>
                    <FieldDescription>{option.description}</FieldDescription>
                  </FieldContent>
                  <Checkbox
                    id={`delivery-${option.value}`}
                    checked={checked}
                    onCheckedChange={(next) =>
                      toggleDeliveryChannel(option.value, Boolean(next))
                    }
                  />
                </Field>
              </FieldLabel>
            );
          })}
        </div>
      </div>

      <div className="border-border/70 flex items-center justify-between rounded-md border px-3 py-2.5">
        <div>
          <p className="text-sm font-medium">Schedule active</p>
          <p className="text-muted-foreground text-xs">
            {isActive ? "Reports will run automatically" : "Schedule is paused"}
          </p>
        </div>
        <Switch checked={isActive} onCheckedChange={setIsActive} />
      </div>

      <div className="flex justify-end gap-2">
        <Button type="submit" disabled={!canSubmit || isSubmitting}>
          {isSubmitting
            ? mode === "create"
              ? "Creating..."
              : "Saving..."
            : mode === "create"
            ? "Create schedule"
            : "Save schedule"}
        </Button>
      </div>
    </form>
  );
};

export default WorkspaceReportScheduleForm;

