import * as React from "react";
import * as AvatarPrimitive from "@radix-ui/react-avatar";

import { cn } from "@/lib/utils";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";

type AvatarUserDetailItem = {
  label: string;
  value?: React.ReactNode;
};

type AvatarUserCard = {
  name: string;
  email?: string;
  role?: string;
  team?: string;
  title?: string;
  status?: string;
  details?: AvatarUserDetailItem[];
};

const normalizeUserCardTeam = (value?: string) => {
  const normalized = String(value || "").trim();

  if (!normalized) {
    return "";
  }

  if (/^no team$/i.test(normalized)) {
    return "";
  }

  if (/^\d+\s+teams?$/i.test(normalized)) {
    return "";
  }

  return normalized;
};

function Avatar({
  className,
  size = "default",
  userCard,
  ...props
}: React.ComponentProps<typeof AvatarPrimitive.Root> & {
  size?: "default" | "sm" | "lg";
  userCard?: AvatarUserCard;
}) {
  const avatarNode = (
    <AvatarPrimitive.Root
      data-slot="avatar"
      data-size={size}
      className={cn(
        "group/avatar relative flex size-8 shrink-0 overflow-hidden rounded-full border border-border/35 bg-background select-none data-[size=lg]:size-10 data-[size=sm]:size-6",
        className,
      )}
      {...props}
    />
  );

  if (!userCard) {
    return avatarNode;
  }

  const detailItems: AvatarUserDetailItem[] = [
    { label: "Role", value: userCard.role },
    { label: "Team", value: normalizeUserCardTeam(userCard.team) },
    { label: "Title", value: userCard.title },
    ...(Array.isArray(userCard.details) ? userCard.details : []),
  ].filter((item) => Boolean(item.value));

  return (
    <Tooltip delayDuration={120}>
      <TooltipTrigger asChild>{avatarNode}</TooltipTrigger>
      <TooltipContent
        side="top"
        align="start"
        sideOffset={8}
        showArrow={false}
        className="w-72 rounded-xl border border-border/60 bg-popover p-3 text-popover-foreground shadow-lg"
      >
        <div className="space-y-2">
          <div className="space-y-0.5">
            <div className="truncate text-[13px] font-semibold">
              {userCard.name}
            </div>
            {userCard.email ? (
              <div className="truncate text-[11px] text-muted-foreground">
                {userCard.email}
              </div>
            ) : null}
          </div>

          {detailItems.length ? (
            <div className="space-y-1.5 pt-1">
              {detailItems.map((item) => (
                <div
                  key={`${item.label}-${String(item.value)}`}
                  className="flex items-center justify-between gap-3 text-[11px]"
                >
                  <span className="text-muted-foreground">{item.label}</span>
                  <span className="truncate text-right font-medium">
                    {item.value}
                  </span>
                </div>
              ))}
            </div>
          ) : null}
        </div>
      </TooltipContent>
    </Tooltip>
  );
}

function AvatarImage({
  className,
  ...props
}: React.ComponentProps<typeof AvatarPrimitive.Image>) {
  return (
    <AvatarPrimitive.Image
      data-slot="avatar-image"
      className={cn("aspect-square size-full rounded-full", className)}
      {...props}
    />
  );
}

function AvatarFallback({
  className,
  ...props
}: React.ComponentProps<typeof AvatarPrimitive.Fallback>) {
  return (
    <AvatarPrimitive.Fallback
      data-slot="avatar-fallback"
      className={cn(
        "bg-muted text-muted-foreground flex size-full items-center justify-center rounded-full text-sm group-data-[size=sm]/avatar:text-xs",
        className,
      )}
      {...props}
    />
  );
}

function AvatarBadge({ className, ...props }: React.ComponentProps<"span">) {
  return (
    <span
      data-slot="avatar-badge"
      className={cn(
        "bg-primary text-primary-foreground ring-background/60 absolute right-0 bottom-0 z-10 inline-flex items-center justify-center rounded-full ring-1 select-none",
        "group-data-[size=sm]/avatar:size-2 group-data-[size=sm]/avatar:[&>svg]:hidden",
        "group-data-[size=default]/avatar:size-2.5 group-data-[size=default]/avatar:[&>svg]:size-2",
        "group-data-[size=lg]/avatar:size-3 group-data-[size=lg]/avatar:[&>svg]:size-2",
        className,
      )}
      {...props}
    />
  );
}

function AvatarGroup({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="avatar-group"
      className={cn(
        "group/avatar-group flex -space-x-2 *:data-[slot=avatar]:ring-1 *:data-[slot=avatar]:ring-border/40",
        className,
      )}
      {...props}
    />
  );
}

function AvatarGroupCount({
  className,
  ...props
}: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="avatar-group-count"
      className={cn(
        "bg-muted text-muted-foreground ring-border/40 relative flex size-8 shrink-0 items-center justify-center rounded-full border border-border/30 text-sm ring-1 group-has-data-[size=lg]/avatar-group:size-10 group-has-data-[size=sm]/avatar-group:size-6 [&>svg]:size-4 group-has-data-[size=lg]/avatar-group:[&>svg]:size-5 group-has-data-[size=sm]/avatar-group:[&>svg]:size-3",
        className,
      )}
      {...props}
    />
  );
}

export {
  Avatar,
  AvatarImage,
  AvatarFallback,
  AvatarBadge,
  AvatarGroup,
  AvatarGroupCount,
};
