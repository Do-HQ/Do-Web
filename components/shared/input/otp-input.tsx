"use client";

import {
  InputOTP,
  InputOTPGroup,
  InputOTPSeparator,
  InputOTPSlot,
} from "@/components/ui/input-otp";
import { REGEXP_ONLY_DIGITS_AND_CHARS } from "input-otp";

interface Props {
  count: number;
  value: string;
  onChange: (value: string) => void;
}

export function OTPInput({ count, value, onChange }: Props) {
  const half = Math.floor(count / 2);

  return (
    <InputOTP
      maxLength={count}
      value={value}
      onChange={(v) => onChange(v.toUpperCase())}
      inputMode="text"
      pattern={REGEXP_ONLY_DIGITS_AND_CHARS}
    >
      <InputOTPGroup>
        {Array.from({ length: half }).map((_, index) => (
          <InputOTPSlot key={index} index={index} autoFocus={index === 0} />
        ))}
      </InputOTPGroup>

      <InputOTPSeparator />

      <InputOTPGroup>
        {Array.from({ length: half }).map((_, index) => (
          <InputOTPSlot key={index + half} index={index + half} />
        ))}
      </InputOTPGroup>
    </InputOTP>
  );
}
