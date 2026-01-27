"use client";

import {
  InputOTP,
  InputOTPGroup,
  InputOTPSeparator,
  InputOTPSlot,
} from "@/components/ui/input-otp";

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
      onChange={onChange}
      inputMode="numeric"
    >
      <InputOTPGroup>
        {Array.from({ length: half }).map((_, index) => (
          <InputOTPSlot key={index} index={index} />
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
