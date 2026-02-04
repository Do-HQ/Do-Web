import React from "react";
import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty";
import { Pencil } from "lucide-react";
import { Button } from "@/components/ui/button";
import Image from "next/image";

interface Props {
  image: string;
  header: string;
  description: string;
  button: {
    cta: string;
    action: () => void;
  };
}

const EmptyComp = ({ image, header, description, button }: Props) => {
  return (
    <Empty>
      <EmptyHeader>
        <EmptyMedia variant="default" className="w-55 h-50 ">
          <Image src={image} alt={header} width={220} height={200} />
        </EmptyMedia>
        <EmptyTitle>{header}</EmptyTitle>
        <EmptyDescription>{description}</EmptyDescription>
      </EmptyHeader>
      <EmptyContent>
        <Button onClick={button.action}>{button?.cta}</Button>
      </EmptyContent>
    </Empty>
  );
};

export default EmptyComp;
