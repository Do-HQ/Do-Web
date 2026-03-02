import { Lightbulb } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { cn } from "@/lib/utils";
import type { Message } from "../types";

type ChatThreadProps = {
  messages: Message[];
  isThinking: boolean;
  userAvatarUrl?: string;
  userEmail?: string;
  userInitials: string;
  starterPrompts: string[];
  onPickStarterPrompt: (prompt: string) => void;
};

const ChatThread = ({
  messages,
  isThinking,
  userAvatarUrl,
  userEmail,
  userInitials,
  starterPrompts,
  onPickStarterPrompt,
}: ChatThreadProps) => {
  return (
    <>
      {messages.map((message) => {
        const isAssistant = message.role === "assistant";

        return (
          <div
            key={message.id}
            className={cn(
              "animate-in fade-in slide-in-from-bottom-2 duration-500 flex w-full items-end gap-2",
              isAssistant ? "justify-start" : "justify-end",
            )}
          >
            {isAssistant && (
              <Avatar size="sm" className="shrink-0">
                <AvatarFallback className="bg-primary text-primary-foreground text-[10px]">
                  SQ
                </AvatarFallback>
              </Avatar>
            )}

            <div
              className={cn(
                "max-w-[92%] rounded-md border px-3 py-2.5 shadow-xs sm:max-w-[86%]",
                isAssistant
                  ? "bg-card/90 border-border"
                  : "bg-secondary text-secondary-foreground border-border",
              )}
            >
              <p className="text-[13px] leading-5 whitespace-pre-wrap">
                {message.content}
              </p>
            </div>

            {!isAssistant && (
              <Avatar size="sm" className="shrink-0">
                <AvatarImage src={userAvatarUrl} alt={userEmail} />
                <AvatarFallback className="text-[10px]">
                  {userInitials}
                </AvatarFallback>
              </Avatar>
            )}
          </div>
        );
      })}

      {isThinking && (
        <div className="flex justify-start animate-in fade-in slide-in-from-bottom-2 duration-300">
          <div className="flex items-end gap-2">
            <Avatar size="sm" className="shrink-0">
              <AvatarFallback className="bg-primary text-primary-foreground text-[10px]">
                SQ
              </AvatarFallback>
            </Avatar>
            <div className="bg-card/90 border-border flex items-center gap-1.5 rounded-md border px-2.5 py-2">
              <span className="ask-typing-dot size-1.5 rounded-full bg-foreground/60" />
              <span className="ask-typing-dot size-1.5 rounded-full bg-foreground/60" />
              <span className="ask-typing-dot size-1.5 rounded-full bg-foreground/60" />
            </div>
          </div>
        </div>
      )}

      {messages.length <= 1 && (
        <div className="grid gap-2 pt-1 md:grid-cols-5">
          {starterPrompts.map((suggestion) => (
            <button
              key={suggestion}
              className="bg-background/80 hover:bg-accent/40 border-border flex items-start gap-2 rounded-md border px-3 py-2.5 text-left text-xs transition-colors"
              onClick={() => onPickStarterPrompt(suggestion)}
            >
              <Lightbulb className="text-muted-foreground mt-0.5 size-3.5 shrink-0" />
              <span>{suggestion}</span>
            </button>
          ))}
        </div>
      )}
    </>
  );
};

export default ChatThread;
