import { Field, FieldDescription, FieldLabel } from "@/components/ui/field";
import { Input as I } from "@/components/ui/input";
import { ComponentProps } from "react";

interface Props extends ComponentProps<"input"> {
  label?: string;
  tip?: string;
  error?: string;
}

export function Input({ label, tip, error, ...props }: Props) {
  return (
    <Field>
      <FieldLabel htmlFor={`input-field-${props.id}`}>
        {label ?? props?.id}
      </FieldLabel>
      <I
        id={`input-field-${props.id ?? label}`}
        type="text"
        placeholder={props?.placeholder}
        {...props}
      />
      {error && (
        <FieldDescription className="text-destructive">
          {error}
        </FieldDescription>
      )}
      {tip && <FieldDescription>{tip}</FieldDescription>}
    </Field>
  );
}
