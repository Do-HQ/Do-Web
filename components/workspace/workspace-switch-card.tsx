import React from "react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import {
  Item,
  ItemActions,
  ItemContent,
  ItemDescription,
  ItemMedia,
  ItemTitle,
} from "@/components/ui/item";
import { returnFullName } from "@/lib/helpers/return-full-name";
import { WorkspaceType } from "@/types/workspace";
import { ArrowRightLeft } from "lucide-react";

interface Props extends React.HtmlHTMLAttributes<HTMLDivElement> {
  className?: string;
  onRequestJoin?: (id?: string) => void;
  data: WorkspaceType;
  loading?: boolean;
  disabled?: boolean;
}

const WorkspaceSwitchCard = ({
  onRequestJoin,
  data,
  loading,
  disabled,
}: Props) => {
  return (
    <Item variant="outline">
      <ItemMedia>
        <div className="flex -space-x-2 *:data-[slot=avatar]:ring-1 *:data-[slot=avatar]:ring-border/40">
          {data?.members?.map((d) => {
            return (
              <Avatar
                className="hidden sm:flex"
                key={d?._id}
                userCard={{
                  name:
                    `${d?.firstName || ""} ${d?.lastName || ""}`.trim() ||
                    d?.email ||
                    "Workspace member",
                  email: d?.email,
                  role: "Workspace member",
                  team: data?.name,
                }}
              >
                <AvatarImage src={d?.profilePhoto?.url} alt="@shadcn" />
                <AvatarFallback>
                  {d?.firstName?.[0]}
                  {d?.lastName?.[0]}{" "}
                </AvatarFallback>
              </Avatar>
            );
          })}
        </div>
      </ItemMedia>
      <ItemContent>
        <ItemTitle>{data?.name}</ItemTitle>
        <ItemDescription>By {returnFullName(data?.ownerId)}</ItemDescription>
      </ItemContent>
      <ItemActions>
        <Button
          size="sm"
          variant="outline"
          onClick={() => onRequestJoin?.(data?._id)}
          loading={loading}
          disabled={disabled}
        >
          <ArrowRightLeft />
          Switch
        </Button>
      </ItemActions>
    </Item>
  );
};

export default WorkspaceSwitchCard;
