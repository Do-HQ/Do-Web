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
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import type { CallChatMessage, PanelTab, Participant } from "../types";

type CallPanelProps = {
  mobile?: boolean;
  participants: Participant[];
  activePanelTab: PanelTab;
  callNote: string;
  chatInput: string;
  callMessages: CallChatMessage[];
  onActivePanelTabChange: (tab: PanelTab) => void;
  onCallNoteChange: (value: string) => void;
  onChatInputChange: (value: string) => void;
  onSendCallMessage: () => void;
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
  onActivePanelTabChange,
  onCallNoteChange,
  onChatInputChange,
  onSendCallMessage,
  onCloseMobile,
  renderAudioMeter,
}: CallPanelProps) => {
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
          <p className="text-muted-foreground mb-1 text-[11px] uppercase">Quick note</p>
          <Textarea
            value={callNote}
            onChange={(event) => onCallNoteChange(event.target.value)}
            placeholder="Capture decisions from this call..."
            className="min-h-32 max-h-[58vh] resize-none px-2.5 py-2 text-[13px]"
          />
        </div>
      );
    }

    return (
      <>
        <div className="min-h-0 flex-1 space-y-1.5 overflow-y-auto p-2.5">
          {callMessages.map((message) => (
            <article
              key={message.id}
              className="rounded-md border bg-background/70 px-2 py-1.5"
            >
              <div className="flex items-center gap-1 text-[11px]">
                <p className="font-medium">{message.author}</p>
                <span className="text-muted-foreground">{message.sentAt}</span>
              </div>
              <p className="mt-0.5 text-[12px] leading-5">{message.content}</p>
            </article>
          ))}
        </div>

        <div className="border-t p-2.5">
          <Input
            value={chatInput}
            onChange={(event) => onChatInputChange(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Enter") {
                event.preventDefault();
                onSendCallMessage();
              }
            }}
            placeholder="Message everyone"
            className="h-9 px-2.5 text-[12px]"
          />
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
          People, notes, and in-call messaging.
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
