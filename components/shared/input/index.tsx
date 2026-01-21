import { Field, FieldDescription, FieldLabel } from "@/components/ui/field";
import { Input as I } from "@/components/ui/input";
import { ComponentProps } from "react";

interface Props extends ComponentProps<"input"> {
  label: string;
  tip?: string;
}

export function Input({ label, tip, ...props }: Props) {
  return (
    <Field>
      <FieldLabel htmlFor={`input-field-${label}`}>
        {props?.id ?? label}
      </FieldLabel>
      <I
        id={`input-field-${props.id ?? label}`}
        type="text"
        placeholder={props?.placeholder}
        {...props}
      />
      {tip && <FieldDescription>{tip}</FieldDescription>}
    </Field>
  );
}
