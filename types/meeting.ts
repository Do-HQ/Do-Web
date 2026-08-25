export type MeetingStatus = "scheduled" | "cancelled" | "completed";

/**
 * Events and meetings are the same record. A meeting is a time people meet; an
 * event is a date things must be ready for, and may carry a task checklist.
 */
export type MeetingKind = "meeting" | "event";

/** A task or subtask tied to an event, stored as project coordinates. */
export interface EventChecklistLink {
  linkId: string;
  projectId: string;
  workflowId: string;
  taskId: string;
  subtaskId: string;
}

/** A checklist link resolved against live project data. */
export interface EventChecklistItem extends EventChecklistLink {
  projectName: string;
  workflowName: string;
  /** Present only when the link points at a subtask. */
  parentTaskTitle: string;
  title: string;
  status: string;
  isDone: boolean;
  priority: string;
  assigneeId: string;
  dueDate: string;
  /** Its workflow or project was archived, so it cannot be completed. */
  isArchived: boolean;
  addedAt: string | null;
  addedByUserId: string;
}

export interface EventChecklistProgress {
  total: number;
  done: number;
  remaining: number;
  percent: number;
  isComplete: boolean;
}

/** What the task editor needs to show "this task is tied to …". */
export interface TaskLinkedEvent {
  meetingId: string;
  title: string;
  kind: MeetingKind;
  startAt: string | null;
  endAt: string | null;
  allDay: boolean;
  status: MeetingStatus;
  /** The checklist link, so callers can unlink without a second round trip. */
  linkId: string;
  subtaskId: string;
}

/** Coordinates identifying a task to link. */
export interface EventChecklistTarget {
  projectId: string;
  workflowId: string;
  taskId: string;
  subtaskId?: string;
}
export type MeetingRsvpStatus = "pending" | "accepted" | "declined";

export interface MeetingMember {
  userId: string;
  name: string;
  initials: string;
  avatarUrl: string;
  email: string;
  status: MeetingRsvpStatus;
  respondedAt: string | null;
}

export interface MeetingOrganizer {
  id: string;
  name: string;
  initials: string;
  avatarUrl: string;
  email: string;
}

export interface WorkspaceMeeting {
  id: string;
  meetingId: string;
  workspaceId: string;
  title: string;
  description: string;
  startAt: string;
  endAt: string;
  timezone: string;
  location: string;
  status: MeetingStatus;
  kind: MeetingKind;
  allDay: boolean;
  checklist: EventChecklistLink[];
  checklistCount: number;
  /** Only returned by the single-event endpoint, resolved against live tasks. */
  checklistItems?: EventChecklistItem[];
  checklistProgress?: EventChecklistProgress;
  reminderMinutes: number[];
  spaceRoomId: string;
  googleCalendarEventId: string;
  organizer: MeetingOrganizer;
  invitees: MeetingMember[];
  createdAt: string | null;
  updatedAt: string | null;
}

export interface ListMeetingsResponse {
  meetings: WorkspaceMeeting[];
  total: number;
  page: number;
  limit: number;
}

export interface GetMeetingResponse {
  meeting: WorkspaceMeeting;
}

export interface CreateMeetingPayload {
  title: string;
  description?: string;
  startAt: string;
  endAt: string;
  timezone?: string;
  location?: string;
  inviteeUserIds: string[];
  reminderMinutes?: number[];
  kind?: MeetingKind;
  allDay?: boolean;
  checklist?: EventChecklistTarget[];
}

export interface UpdateMeetingPayload {
  title?: string;
  description?: string;
  startAt?: string;
  endAt?: string;
  timezone?: string;
  location?: string;
  reminderMinutes?: number[];
  allDay?: boolean;
}

export interface ListMeetingsParams {
  from?: string;
  to?: string;
  status?: MeetingStatus;
  kind?: MeetingKind;
  page?: number;
  limit?: number;
}

export interface EventChecklistResponse {
  items: EventChecklistItem[];
  progress: EventChecklistProgress;
  added?: number;
  skipped?: number;
}

export interface ListEventsForTaskResponse {
  events: TaskLinkedEvent[];
}
