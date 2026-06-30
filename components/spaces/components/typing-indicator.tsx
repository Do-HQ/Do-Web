"use client";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

export type TypingUser = {
  id: string;
  name: string;
  initials: string;
  avatarUrl?: string | null;
};

function buildTypingLabel(users: TypingUser[]): string {
  if (users.length === 1) return `${users[0].name} is typing`;
  if (users.length === 2) return `${users[0].name} and ${users[1].name} are typing`;
  return `${users[0].name} and ${users.length - 1} others are typing`;
}

export function TypingIndicator({ users }: { users: TypingUser[] }) {
  if (!users.length) return null;

  const displayUsers = users.slice(0, 3);

  return (
    <div className="flex items-center gap-2 border-t border-border/20 bg-muted/20 px-4 py-2">
      <div className="flex -space-x-1.5">
        {displayUsers.map((user) => (
          <Avatar
            key={user.id}
            className="size-5 shrink-0 border border-background"
          >
            <AvatarImage src={user.avatarUrl ?? undefined} alt={user.name} />
            <AvatarFallback className="text-[9px] font-medium">
              {user.initials}
            </AvatarFallback>
          </Avatar>
        ))}
      </div>
      <div className="flex items-center gap-1.5">
        <span className="text-[12px] text-muted-foreground">
          {buildTypingLabel(users)}
        </span>
        <span className="flex gap-0.5">
          <span className="size-1 animate-bounce rounded-full bg-muted-foreground/60 [animation-delay:0ms]" />
          <span className="size-1 animate-bounce rounded-full bg-muted-foreground/60 [animation-delay:150ms]" />
          <span className="size-1 animate-bounce rounded-full bg-muted-foreground/60 [animation-delay:300ms]" />
        </span>
      </div>
    </div>
  );
}
