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
import { LockOpen } from "lucide-react";

interface Props extends React.HtmlHTMLAttributes<HTMLDivElement> {
  className?: string;
  onRequestJoin?: (id?: string) => void;
  data: WorkspaceType;
  loading?: boolean;
  buttonCta?: string;
  icon?: React.ReactNode;
  disabled?: boolean;
}

const WorkspaceCard = ({
  onRequestJoin,
  data,
  loading,
  buttonCta,
  icon,
  disabled,
}: Props) => {
  return (
    <Item variant="outline">
      <ItemMedia className="hidden sm:flex">
        <div className="*:data-[slot=avatar]:ring-background flex -space-x-2 *:data-[slot=avatar]:ring-2 ">
          {data?.members?.map((d) => {
            return (
              <Avatar key={d?._id}>
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
          {icon ? icon : <LockOpen />}
          {buttonCta ? buttonCta : "Request to join"}
        </Button>
      </ItemActions>
    </Item>
  );
};

export default WorkspaceCard;
