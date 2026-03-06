import { ComponentProps } from "react";
import { FieldError } from "react-hook-form";

import { Field, FieldDescription, FieldLabel } from "@/components/ui/field";
import { Input as I } from "@/components/ui/input";

interface Props extends ComponentProps<"input"> {
  label?: string;
  tip?: string;
  error?: string | FieldError;
}

export function Input({ label, tip, error, ...props }: Props) {
  const errorMessage =
    typeof error === "string" ? error : error?.message ?? "Invalid value";

  return (
    <Field>
      {label && (
        <FieldLabel htmlFor={`input-field-${label}`}>
          {label ?? props?.id}
        </FieldLabel>
      )}
      <I
        id={`input-field-${props.id ?? label}`}
        type="text"
        placeholder={props?.placeholder}
        {...props}
      />
      {error ? (
        <FieldDescription className="text-destructive">
          {errorMessage}
        </FieldDescription>
      ) : null}
      {tip ? <FieldDescription>{tip}</FieldDescription> : null}
    </Field>
  );
}
