export type MeetingStatus = "scheduled" | "cancelled" | "completed";
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
}

export interface UpdateMeetingPayload {
  title?: string;
  description?: string;
  startAt?: string;
  endAt?: string;
  timezone?: string;
  location?: string;
  reminderMinutes?: number[];
}

export interface ListMeetingsParams {
  from?: string;
  to?: string;
  status?: MeetingStatus;
  page?: number;
  limit?: number;
}
