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
import { LockOpen } from "lucide-react";

interface Props extends React.HtmlHTMLAttributes<HTMLDivElement> {
  className?: string;
  onRequestJoin?: () => void;
}

const WorkspaceCard = ({ onRequestJoin }: Props) => {
  return (
    <Item variant="outline">
      <ItemMedia>
        <div className="*:data-[slot=avatar]:ring-background flex -space-x-2 *:data-[slot=avatar]:ring-2 ">
          <Avatar className="hidden sm:flex">
            <AvatarImage src="https://github.com/shadcn.png" alt="@shadcn" />
            <AvatarFallback>CN</AvatarFallback>
          </Avatar>
          <Avatar className="hidden sm:flex">
            <AvatarImage
              src="https://github.com/maxleiter.png"
              alt="@maxleiter"
            />
            <AvatarFallback>LR</AvatarFallback>
          </Avatar>
          <Avatar>
            <AvatarImage
              src="https://github.com/evilrabbit.png"
              alt="@evilrabbit"
            />
            <AvatarFallback>ER</AvatarFallback>
          </Avatar>
        </div>
      </ItemMedia>
      <ItemContent>
        <ItemTitle>No Team Members</ItemTitle>
        <ItemDescription>
          Invite your team to collaborate on this project.
        </ItemDescription>
      </ItemContent>
      <ItemActions>
        <Button size="sm" variant="outline" onClick={onRequestJoin}>
          <LockOpen />
          Request to join
        </Button>
      </ItemActions>
    </Item>
  );
};

export default WorkspaceCard;
