import type React from "react";
import type { ReactNode } from "react";
import {
  FileText,
  MessageSquare,
  Mic,
  MicOff,
  PanelRightClose,
  SendHorizontal,
  Users,
} from "lucide-react";
import { Mention, MentionsInput } from "react-mentions";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { MentionSuggestionRow } from "@/components/shared/mention-suggestion-row";
import { Textarea } from "@/components/ui/textarea";
import type { CallChatMessage, PanelTab, Participant } from "../types";

type CallPanelProps = {
  mobile?: boolean;
  participants: Participant[];
  activePanelTab: PanelTab;
  callNote: string;
  chatInput: string;
  callMessages: CallChatMessage[];
  callMentionSuggestions: Array<{
    id: string;
    display: string;
    kind?: "user" | "team" | "project";
    avatarUrl?: string;
    avatarFallback?: string;
    subtitle?: string;
  }>;
  onActivePanelTabChange: (tab: PanelTab) => void;
  onCallNoteChange: (value: string) => void;
  onChatInputChange: (value: string) => void;
  onSendCallMessage: () => void;
  onSaveCallNote: () => void;
  isSavingCallNote?: boolean;
  onCloseMobile?: () => void;
  renderAudioMeter: (participantId: string, muted: boolean) => ReactNode;
};

const panelTabs: Array<{ id: PanelTab; label: string; icon: typeof Users }> = [
  { id: "people", label: "People", icon: Users },
  { id: "notes", label: "Notes", icon: FileText },
  { id: "chat", label: "Chat", icon: MessageSquare },
];

const CallPanel = ({
  mobile = false,
  participants,
  activePanelTab,
  callNote,
  chatInput,
  callMessages,
  callMentionSuggestions,
  onActivePanelTabChange,
  onCallNoteChange,
  onChatInputChange,
  onSendCallMessage,
  onSaveCallNote,
  isSavingCallNote = false,
  onCloseMobile,
  renderAudioMeter,
}: CallPanelProps) => {
  const suggestionsPortalHost =
    typeof document === "undefined" ? undefined : document.body;

  const mentionInputStyle = {
    control: {
      backgroundColor: "transparent",
      fontSize: 12,
      fontWeight: 500,
      minHeight: 36,
      lineHeight: "18px",
    },
    highlighter: {
      overflow: "hidden",
      padding: "8px 10px",
      borderRadius: "0.375rem",
      color: "inherit",
    },
    input: {
      margin: 0,
      border: "1px solid hsl(var(--border) / 0.65)",
      borderRadius: "0.375rem",
      padding: "8px 10px",
      outline: "none",
      color: "inherit",
      backgroundColor: "hsl(var(--background))",
    },
    suggestions: {
      list: {
        backgroundColor: "hsl(var(--popover))",
        color: "hsl(var(--popover-foreground))",
        border: "1px solid hsl(var(--border))",
        borderRadius: "0.375rem",
        fontSize: 12,
        marginTop: 6,
        maxHeight: 160,
        overflowY: "auto",
        boxShadow:
          "0 10px 25px -10px hsl(var(--foreground) / 0.35), 0 4px 10px -8px hsl(var(--foreground) / 0.25)",
        zIndex: 60,
      },
      item: {
        padding: "6px 10px",
      },
    },
  } as const;

  const toTitleCase = (value: string) =>
    value
      .split(" ")
      .filter(Boolean)
      .map((part) => part[0]?.toUpperCase() + part.slice(1))
      .join(" ");

  const getFallbackMentionLabel = (token: string) =>
    toTitleCase(
      String(token || "")
        .trim()
        .replace(/[_-]+/g, " ")
        .replace(/\./g, " "),
    );

  const callMentionMetaByToken = new Map(
    callMentionSuggestions.map((entry) => [String(entry.id || ""), entry]),
  );

  const renderMentionSuggestion = (
    suggestion: {
      id: string | number;
      display?: string;
      kind?: "user" | "team" | "project";
      avatarUrl?: string;
      avatarFallback?: string;
      subtitle?: string;
    },
    _search: string,
    highlightedDisplay: React.ReactNode,
    _index: number,
    focused: boolean,
  ) => (
    <MentionSuggestionRow
      label={String(suggestion.display || "")}
      highlightedLabel={highlightedDisplay}
      kind={suggestion.kind}
      avatarUrl={suggestion.avatarUrl}
      avatarFallback={suggestion.avatarFallback}
      subtitle={suggestion.subtitle}
      focused={focused}
    />
  );

  const renderContentWithMentions = (content: string) => {
    const input = String(content || "");
    const mentionPattern = /@([a-zA-Z0-9][a-zA-Z0-9._-]*)/g;
    const chunks: React.ReactNode[] = [];
    let lastIndex = 0;
    let match: RegExpExecArray | null = mentionPattern.exec(input);

    while (match) {
      const mentionStart = match.index;
      const mentionEnd = mentionStart + match[0].length;
      const token = String(match[1] || "").toLowerCase();

      if (mentionStart > lastIndex) {
        chunks.push(input.slice(lastIndex, mentionStart));
      }

      const meta = callMentionMetaByToken.get(token);
      const label = String(meta?.display || getFallbackMentionLabel(token)).trim();

      chunks.push(
        <span
          key={`${token}-${mentionStart}`}
          className="inline-flex items-center rounded-full bg-primary/14 px-1.5 py-0.5 text-[11px] font-medium text-primary"
        >
          @{label}
        </span>,
      );

      lastIndex = mentionEnd;
      match = mentionPattern.exec(input);
    }

    if (lastIndex < input.length) {
      chunks.push(input.slice(lastIndex));
    }

    return chunks;
  };

  const renderPanelBody = () => {
    if (activePanelTab === "people") {
      return (
        <div className="min-h-0 flex-1 space-y-1 overflow-y-auto p-2.5">
          {participants.map((participant) => (
            <div key={participant.id} className="flex items-center gap-2 rounded-sm px-1.5 py-1">
              <Avatar
                size="sm"
                userCard={{
                  name: participant.name,
                  role: participant.role ?? "Member",
                  status: participant.isMuted ? "Muted" : "Speaking",
                }}
              >
                <AvatarImage src={participant.avatarUrl} alt={participant.name} />
                <AvatarFallback className="text-[11px]">
                  {participant.initials}
                </AvatarFallback>
              </Avatar>

              <div className="min-w-0">
                <p className="truncate text-[12px] font-medium">{participant.name}</p>
                <p className="text-muted-foreground text-[11px]">
                  {participant.role ?? "Member"}
                </p>
              </div>

              <div className="ml-auto inline-flex items-end gap-1.5">
                <span className="text-muted-foreground inline-flex items-center">
                  {participant.isMuted ? (
                    <MicOff className="size-3.5" />
                  ) : (
                    <Mic className="size-3.5" />
                  )}
                </span>
                {renderAudioMeter(participant.id, participant.isMuted)}
              </div>
            </div>
          ))}
        </div>
      );
    }

    if (activePanelTab === "notes") {
      return (
        <div className="min-h-0 flex-1 p-2.5">
          <p className="text-muted-foreground mb-1 text-[11px] uppercase">
            Shared call note
          </p>
          <Textarea
            value={callNote}
            onChange={(event) => onCallNoteChange(event.target.value)}
            placeholder="Capture decisions and save to this space chat..."
            className="min-h-32 max-h-[58vh] resize-none rounded-md border-border/65 px-2.5 py-2 text-[13px]"
          />

          <div className="mt-2 flex items-center justify-end gap-1.5">
            <Button
              size="sm"
              variant="secondary"
              className="h-8 px-2.5 text-[12px]"
              onClick={onSaveCallNote}
              disabled={callNote.trim().length < 1 || isSavingCallNote}
            >
              {isSavingCallNote ? "Saving..." : "Save to Call Thread"}
            </Button>
          </div>
        </div>
      );
    }

    return (
      <>
        <div className="min-h-0 flex-1 space-y-1.5 overflow-y-auto p-2.5">
          {callMessages.map((message) => (
            <article
              key={message.id}
              className="rounded-md border border-border/60 bg-background/70 px-2 py-1.5"
            >
              <div className="flex items-center gap-1.5 text-[11px]">
                <Avatar
                  size="sm"
                  className="size-5"
                  userCard={{
                    name: message.author,
                    role: "Member",
                    status: "In call",
                  }}
                >
                  <AvatarImage
                    src={message.authorAvatarUrl}
                    alt={message.author}
                  />
                  <AvatarFallback className="text-[9px]">
                    {message.authorInitials ||
                      message.author
                        .split(/\s+/)
                        .filter(Boolean)
                        .slice(0, 2)
                        .map((part) => part[0]?.toUpperCase())
                        .join("") ||
                      "U"}
                  </AvatarFallback>
                </Avatar>
                <p className="font-medium">{message.author}</p>
                <span className="text-muted-foreground">{message.sentAt}</span>
              </div>
              <p className="mt-0.5 text-[12px] leading-5 whitespace-pre-wrap">
                {renderContentWithMentions(message.content)}
              </p>
            </article>
          ))}
        </div>

        <div className="border-t p-2.5">
          <MentionsInput
            value={chatInput}
            onChange={(event) => onChatInputChange(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Enter") {
                event.preventDefault();
                onSendCallMessage();
              }
            }}
            placeholder="Message everyone in this call"
            style={mentionInputStyle}
            className="text-[12px]"
            a11ySuggestionsListLabel="Call mentions"
            suggestionsPortalHost={suggestionsPortalHost}
            forceSuggestionsAboveCursor
          >
            <Mention
              trigger="@"
              data={callMentionSuggestions}
              markup="@__id__"
              displayTransform={(_id, display) => display || _id}
              appendSpaceOnAdd
              renderSuggestion={renderMentionSuggestion}
            />
          </MentionsInput>
          <div className="mt-1.5 flex items-center justify-end">
            <Button
              size="sm"
              className="h-8 px-2.5 text-[12px]"
              onClick={onSendCallMessage}
              disabled={chatInput.trim().length < 1}
            >
              <SendHorizontal className="size-3.5" />
              Send
            </Button>
          </div>
        </div>
      </>
    );
  };

  return (
    <div className="flex h-full min-h-0 flex-col overflow-hidden bg-card">
      <div className="border-b px-3 py-2.5">
        <div className="flex items-center gap-1.5">
          <p className="text-[13px] font-semibold">Call Panel</p>
          <Badge variant="secondary" className="text-[11px]">
            {participants.length} people
          </Badge>

          {mobile && (
            <Button
              size="icon-sm"
              variant="ghost"
              className="ml-auto size-7"
              onClick={onCloseMobile}
            >
              <PanelRightClose className="size-4" />
            </Button>
          )}
        </div>
        <p className="text-muted-foreground mt-1 text-[11px]">
          People, shared notes, and in-call chat.
        </p>

        <div className="mt-2 grid grid-cols-3 gap-1">
          {panelTabs.map(({ id, label, icon: Icon }) => (
            <Button
              key={id}
              size="sm"
              variant={activePanelTab === id ? "secondary" : "ghost"}
              className="h-8 px-2.5 text-[12px]"
              onClick={() => onActivePanelTabChange(id)}
            >
              <Icon className="size-4" />
              {label}
            </Button>
          ))}
        </div>
      </div>

      {renderPanelBody()}
    </div>
  );
};

export default CallPanel;
