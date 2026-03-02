"use client";

import { useMemo, useState } from "react";
import { toast } from "sonner";
import { Input as BaseInput } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Field,
  FieldContent,
  FieldDescription,
  FieldGroup,
  FieldLegend,
  FieldSeparator,
  FieldSet,
  FieldTitle,
} from "@/components/ui/field";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";

type DeliverySettings = {
  inApp: boolean;
  email: boolean;
  browserPush: boolean;
  mobilePush: boolean;
  digestFrequency: "instant" | "hourly" | "daily" | "weekly";
};

type ActivitySettings = {
  mentionsAndReplies: boolean;
  taskAssignments: boolean;
  commentsOnMyTasks: boolean;
  statusChanges: boolean;
  dueDateReminders: boolean;
  workspaceInvites: boolean;
  dueReminderWindow: "same-day" | "1-day" | "2-days";
};

type AgentNotificationSettings = {
  riskAlerts: boolean;
  scheduleConflictAlerts: boolean;
  replanningSuggestions: boolean;
  dailyAgentBrief: boolean;
  weeklyPlanningDigest: boolean;
  escalationOnlyMode: boolean;
};

type QuietHoursSettings = {
  enabled: boolean;
  startTime: string;
  endTime: string;
  applyOn: "weekdays" | "everyday";
  allowMentions: boolean;
};

const DEFAULT_DELIVERY_SETTINGS: DeliverySettings = {
  inApp: true,
  email: true,
  browserPush: true,
  mobilePush: false,
  digestFrequency: "instant",
};

const DEFAULT_ACTIVITY_SETTINGS: ActivitySettings = {
  mentionsAndReplies: true,
  taskAssignments: true,
  commentsOnMyTasks: true,
  statusChanges: false,
  dueDateReminders: true,
  workspaceInvites: true,
  dueReminderWindow: "1-day",
};

const DEFAULT_AGENT_SETTINGS: AgentNotificationSettings = {
  riskAlerts: true,
  scheduleConflictAlerts: true,
  replanningSuggestions: true,
  dailyAgentBrief: true,
  weeklyPlanningDigest: false,
  escalationOnlyMode: false,
};

const DEFAULT_QUIET_HOURS: QuietHoursSettings = {
  enabled: false,
  startTime: "22:00",
  endTime: "07:00",
  applyOn: "weekdays",
  allowMentions: true,
};

const hasChanges = <T extends Record<string, string | boolean>>(
  value: T,
  saved: T,
) => {
  return (Object.keys(value) as Array<keyof T>).some(
    (key) => value[key] !== saved[key],
  );
};

const SettingsNotifications = () => {
  // State
  const [delivery, setDelivery] = useState<DeliverySettings>(
    DEFAULT_DELIVERY_SETTINGS,
  );
  const [savedDelivery, setSavedDelivery] = useState<DeliverySettings>(
    DEFAULT_DELIVERY_SETTINGS,
  );

  const [activity, setActivity] = useState<ActivitySettings>(
    DEFAULT_ACTIVITY_SETTINGS,
  );
  const [savedActivity, setSavedActivity] = useState<ActivitySettings>(
    DEFAULT_ACTIVITY_SETTINGS,
  );

  const [agent, setAgent] = useState<AgentNotificationSettings>(
    DEFAULT_AGENT_SETTINGS,
  );
  const [savedAgent, setSavedAgent] = useState<AgentNotificationSettings>(
    DEFAULT_AGENT_SETTINGS,
  );

  const [quietHours, setQuietHours] =
    useState<QuietHoursSettings>(DEFAULT_QUIET_HOURS);
  const [savedQuietHours, setSavedQuietHours] =
    useState<QuietHoursSettings>(DEFAULT_QUIET_HOURS);

  // Derived
  const deliveryChanged = useMemo(
    () => hasChanges(delivery, savedDelivery),
    [delivery, savedDelivery],
  );
  const activityChanged = useMemo(
    () => hasChanges(activity, savedActivity),
    [activity, savedActivity],
  );
  const agentChanged = useMemo(
    () => hasChanges(agent, savedAgent),
    [agent, savedAgent],
  );
  const quietHoursChanged = useMemo(
    () => hasChanges(quietHours, savedQuietHours),
    [quietHours, savedQuietHours],
  );

  // Handlers
  const handleSaveDelivery = () => {
    setSavedDelivery(delivery);
    toast.success("Delivery settings updated", {
      description: "Notification channels are saved locally for now.",
    });
  };

  const handleResetDelivery = () => {
    setDelivery(savedDelivery);
  };

  const handleSaveActivity = () => {
    setSavedActivity(activity);
    toast.success("Activity notifications updated", {
      description: "Project event notifications are saved locally for now.",
    });
  };

  const handleResetActivity = () => {
    setActivity(savedActivity);
  };

  const handleSaveAgent = () => {
    setSavedAgent(agent);
    toast.success("Agent alerts updated", {
      description: "Agent notification behavior is saved locally for now.",
    });
  };

  const handleResetAgent = () => {
    setAgent(savedAgent);
  };

  const handleSaveQuietHours = () => {
    setSavedQuietHours(quietHours);
    toast.success("Quiet hours updated", {
      description: "Quiet-hour rules are saved locally for now.",
    });
  };

  const handleResetQuietHours = () => {
    setQuietHours(savedQuietHours);
  };

  return (
    <FieldGroup className="gap-8">
      <FieldSet>
        <FieldLegend>Delivery Channels</FieldLegend>
        <FieldDescription>
          Choose where notifications should reach you.
        </FieldDescription>

        <Field orientation="horizontal">
          <FieldContent>
            <FieldTitle>In-app notifications</FieldTitle>
            <FieldDescription>
              Show notifications in the app inbox.
            </FieldDescription>
          </FieldContent>
          <Switch
            checked={delivery.inApp}
            onCheckedChange={(checked) =>
              setDelivery((prev) => ({ ...prev, inApp: checked }))
            }
          />
        </Field>

        <Field orientation="horizontal">
          <FieldContent>
            <FieldTitle>Email notifications</FieldTitle>
            <FieldDescription>
              Receive updates in your email inbox.
            </FieldDescription>
          </FieldContent>
          <Switch
            checked={delivery.email}
            onCheckedChange={(checked) =>
              setDelivery((prev) => ({ ...prev, email: checked }))
            }
          />
        </Field>

        <Field orientation="horizontal">
          <FieldContent>
            <FieldTitle>Browser push notifications</FieldTitle>
            <FieldDescription>
              Show desktop/browser alerts for important events.
            </FieldDescription>
          </FieldContent>
          <Switch
            checked={delivery.browserPush}
            onCheckedChange={(checked) =>
              setDelivery((prev) => ({ ...prev, browserPush: checked }))
            }
          />
        </Field>

        <Field orientation="horizontal">
          <FieldContent>
            <FieldTitle>Mobile push notifications</FieldTitle>
            <FieldDescription>
              Send alerts to your mobile app when available.
            </FieldDescription>
          </FieldContent>
          <Switch
            checked={delivery.mobilePush}
            onCheckedChange={(checked) =>
              setDelivery((prev) => ({ ...prev, mobilePush: checked }))
            }
          />
        </Field>

        <Field orientation="horizontal">
          <FieldContent>
            <FieldTitle>Email digest frequency</FieldTitle>
            <FieldDescription>
              Pick how often grouped email notifications are sent.
            </FieldDescription>
          </FieldContent>
          <Select
            value={delivery.digestFrequency}
            onValueChange={(value) =>
              setDelivery((prev) => ({
                ...prev,
                digestFrequency: value as DeliverySettings["digestFrequency"],
              }))
            }
          >
            <SelectTrigger className="w-44">
              <SelectValue placeholder="Select digest frequency" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="instant">Instant</SelectItem>
              <SelectItem value="hourly">Hourly</SelectItem>
              <SelectItem value="daily">Daily</SelectItem>
              <SelectItem value="weekly">Weekly</SelectItem>
            </SelectContent>
          </Select>
        </Field>

        <div className="flex items-center gap-2">
          <Button
            className="max-w-20"
            size="sm"
            disabled={!deliveryChanged}
            onClick={handleSaveDelivery}
          >
            Save
          </Button>
          <Button
            className="max-w-20"
            size="sm"
            variant="ghost"
            disabled={!deliveryChanged}
            onClick={handleResetDelivery}
          >
            Reset
          </Button>
        </div>
      </FieldSet>

      <FieldSeparator />

      <FieldSet>
        <FieldLegend>Project Activity</FieldLegend>
        <FieldDescription>
          Control notifications for tasks, comments, and collaboration events.
        </FieldDescription>

        <Field orientation="horizontal">
          <FieldContent>
            <FieldTitle>Mentions and replies</FieldTitle>
            <FieldDescription>
              Notify when someone mentions you or replies to your thread.
            </FieldDescription>
          </FieldContent>
          <Switch
            checked={activity.mentionsAndReplies}
            onCheckedChange={(checked) =>
              setActivity((prev) => ({ ...prev, mentionsAndReplies: checked }))
            }
          />
        </Field>

        <Field orientation="horizontal">
          <FieldContent>
            <FieldTitle>Task assignments</FieldTitle>
            <FieldDescription>
              Notify when tasks are assigned or re-assigned to you.
            </FieldDescription>
          </FieldContent>
          <Switch
            checked={activity.taskAssignments}
            onCheckedChange={(checked) =>
              setActivity((prev) => ({ ...prev, taskAssignments: checked }))
            }
          />
        </Field>

        <Field orientation="horizontal">
          <FieldContent>
            <FieldTitle>Comments on my tasks</FieldTitle>
            <FieldDescription>
              Notify when others comment on tasks you own.
            </FieldDescription>
          </FieldContent>
          <Switch
            checked={activity.commentsOnMyTasks}
            onCheckedChange={(checked) =>
              setActivity((prev) => ({ ...prev, commentsOnMyTasks: checked }))
            }
          />
        </Field>

        <Field orientation="horizontal">
          <FieldContent>
            <FieldTitle>Status changes</FieldTitle>
            <FieldDescription>
              Notify when tracked tasks change state.
            </FieldDescription>
          </FieldContent>
          <Switch
            checked={activity.statusChanges}
            onCheckedChange={(checked) =>
              setActivity((prev) => ({ ...prev, statusChanges: checked }))
            }
          />
        </Field>

        <Field orientation="horizontal">
          <FieldContent>
            <FieldTitle>Due date reminders</FieldTitle>
            <FieldDescription>
              Receive reminders before deadlines.
            </FieldDescription>
          </FieldContent>
          <Switch
            checked={activity.dueDateReminders}
            onCheckedChange={(checked) =>
              setActivity((prev) => ({ ...prev, dueDateReminders: checked }))
            }
          />
        </Field>

        <Field orientation="horizontal">
          <FieldContent>
            <FieldTitle>Workspace invites</FieldTitle>
            <FieldDescription>
              Notify when you are invited to workspaces, teams, or projects.
            </FieldDescription>
          </FieldContent>
          <Switch
            checked={activity.workspaceInvites}
            onCheckedChange={(checked) =>
              setActivity((prev) => ({ ...prev, workspaceInvites: checked }))
            }
          />
        </Field>

        <Field orientation="horizontal">
          <FieldContent>
            <FieldTitle>Due reminder window</FieldTitle>
            <FieldDescription>
              Choose how early you should be reminded before due time.
            </FieldDescription>
          </FieldContent>
          <Select
            value={activity.dueReminderWindow}
            onValueChange={(value) =>
              setActivity((prev) => ({
                ...prev,
                dueReminderWindow:
                  value as ActivitySettings["dueReminderWindow"],
              }))
            }
          >
            <SelectTrigger className="w-44">
              <SelectValue placeholder="Select reminder window" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="same-day">Same day</SelectItem>
              <SelectItem value="1-day">1 day before</SelectItem>
              <SelectItem value="2-days">2 days before</SelectItem>
            </SelectContent>
          </Select>
        </Field>

        <div className="flex items-center gap-2">
          <Button
            className="max-w-20"
            size="sm"
            disabled={!activityChanged}
            onClick={handleSaveActivity}
          >
            Save
          </Button>
          <Button
            className="max-w-20"
            size="sm"
            variant="ghost"
            disabled={!activityChanged}
            onClick={handleResetActivity}
          >
            Reset
          </Button>
        </div>
      </FieldSet>

      <FieldSeparator />

      <FieldSet>
        <FieldLegend>Agent Alerts</FieldLegend>
        <FieldDescription>
          Decide when PM agents should notify you about risks and planning.
        </FieldDescription>

        <Field orientation="horizontal">
          <FieldContent>
            <FieldTitle>Risk alerts</FieldTitle>
            <FieldDescription>
              Notify when agents detect delivery, dependency, or scope risks.
            </FieldDescription>
          </FieldContent>
          <Switch
            checked={agent.riskAlerts}
            onCheckedChange={(checked) =>
              setAgent((prev) => ({ ...prev, riskAlerts: checked }))
            }
          />
        </Field>

        <Field orientation="horizontal">
          <FieldContent>
            <FieldTitle>Schedule conflict alerts</FieldTitle>
            <FieldDescription>
              Notify when timelines overlap or milestone feasibility drops.
            </FieldDescription>
          </FieldContent>
          <Switch
            checked={agent.scheduleConflictAlerts}
            onCheckedChange={(checked) =>
              setAgent((prev) => ({ ...prev, scheduleConflictAlerts: checked }))
            }
          />
        </Field>

        <Field orientation="horizontal">
          <FieldContent>
            <FieldTitle>Replanning suggestions</FieldTitle>
            <FieldDescription>
              Notify when agents recommend reprioritization or scope changes.
            </FieldDescription>
          </FieldContent>
          <Switch
            checked={agent.replanningSuggestions}
            onCheckedChange={(checked) =>
              setAgent((prev) => ({ ...prev, replanningSuggestions: checked }))
            }
          />
        </Field>

        <Field orientation="horizontal">
          <FieldContent>
            <FieldTitle>Daily agent brief</FieldTitle>
            <FieldDescription>
              Receive a summary of progress, blockers, and next-best actions.
            </FieldDescription>
          </FieldContent>
          <Switch
            checked={agent.dailyAgentBrief}
            onCheckedChange={(checked) =>
              setAgent((prev) => ({ ...prev, dailyAgentBrief: checked }))
            }
          />
        </Field>

        <Field orientation="horizontal">
          <FieldContent>
            <FieldTitle>Weekly planning digest</FieldTitle>
            <FieldDescription>
              Receive a weekly execution and planning summary from agents.
            </FieldDescription>
          </FieldContent>
          <Switch
            checked={agent.weeklyPlanningDigest}
            onCheckedChange={(checked) =>
              setAgent((prev) => ({ ...prev, weeklyPlanningDigest: checked }))
            }
          />
        </Field>

        <Field orientation="horizontal">
          <FieldContent>
            <FieldTitle>Escalation-only mode</FieldTitle>
            <FieldDescription>
              Suppress informational alerts and notify only on critical events.
            </FieldDescription>
          </FieldContent>
          <Switch
            checked={agent.escalationOnlyMode}
            onCheckedChange={(checked) =>
              setAgent((prev) => ({ ...prev, escalationOnlyMode: checked }))
            }
          />
        </Field>

        <div className="flex items-center gap-2">
          <Button
            className="max-w-20"
            size="sm"
            disabled={!agentChanged}
            onClick={handleSaveAgent}
          >
            Save
          </Button>
          <Button
            className="max-w-20"
            size="sm"
            variant="ghost"
            disabled={!agentChanged}
            onClick={handleResetAgent}
          >
            Reset
          </Button>
        </div>
      </FieldSet>

      <FieldSeparator />

      <FieldSet>
        <FieldLegend>Quiet Hours</FieldLegend>
        <FieldDescription>
          Pause non-critical notifications during focused or off-work periods.
        </FieldDescription>

        <Field orientation="horizontal">
          <FieldContent>
            <FieldTitle>Enable quiet hours</FieldTitle>
            <FieldDescription>
              Silence routine notifications during your defined period.
            </FieldDescription>
          </FieldContent>
          <Switch
            checked={quietHours.enabled}
            onCheckedChange={(checked) =>
              setQuietHours((prev) => ({ ...prev, enabled: checked }))
            }
          />
        </Field>

        <div className="grid gap-4 md:grid-cols-2 max-w-130">
          <Field>
            <FieldTitle>Start time</FieldTitle>
            <FieldDescription>When quiet mode should begin.</FieldDescription>
            <BaseInput
              type="time"
              value={quietHours.startTime}
              disabled={!quietHours.enabled}
              onChange={(event) =>
                setQuietHours((prev) => ({
                  ...prev,
                  startTime: event.target.value,
                }))
              }
            />
          </Field>

          <Field>
            <FieldTitle>End time</FieldTitle>
            <FieldDescription>
              When notifications should resume.
            </FieldDescription>
            <BaseInput
              type="time"
              value={quietHours.endTime}
              disabled={!quietHours.enabled}
              onChange={(event) =>
                setQuietHours((prev) => ({
                  ...prev,
                  endTime: event.target.value,
                }))
              }
            />
          </Field>
        </div>

        <Field orientation="horizontal">
          <FieldContent>
            <FieldTitle>Apply quiet hours</FieldTitle>
            <FieldDescription>
              Choose when these rules should apply.
            </FieldDescription>
          </FieldContent>
          <Select
            disabled={!quietHours.enabled}
            value={quietHours.applyOn}
            onValueChange={(value) =>
              setQuietHours((prev) => ({
                ...prev,
                applyOn: value as QuietHoursSettings["applyOn"],
              }))
            }
          >
            <SelectTrigger className="w-44">
              <SelectValue placeholder="Select quiet-hour schedule" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="weekdays">Weekdays only</SelectItem>
              <SelectItem value="everyday">Every day</SelectItem>
            </SelectContent>
          </Select>
        </Field>

        <Field orientation="horizontal">
          <FieldContent>
            <FieldTitle>Allow direct mentions</FieldTitle>
            <FieldDescription>
              Continue alerting for direct mentions during quiet hours.
            </FieldDescription>
          </FieldContent>
          <Switch
            disabled={!quietHours.enabled}
            checked={quietHours.allowMentions}
            onCheckedChange={(checked) =>
              setQuietHours((prev) => ({ ...prev, allowMentions: checked }))
            }
          />
        </Field>

        <div className="flex items-center gap-2">
          <Button
            className="max-w-20"
            size="sm"
            disabled={!quietHoursChanged}
            onClick={handleSaveQuietHours}
          >
            Save
          </Button>
          <Button
            className="max-w-20"
            size="sm"
            variant="ghost"
            disabled={!quietHoursChanged}
            onClick={handleResetQuietHours}
          >
            Reset
          </Button>
        </div>
      </FieldSet>
    </FieldGroup>
  );
};

export default SettingsNotifications;
