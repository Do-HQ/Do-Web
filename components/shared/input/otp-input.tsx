"use client";

import {
  InputOTP,
  InputOTPGroup,
  InputOTPSeparator,
  InputOTPSlot,
} from "@/components/ui/input-otp";

interface Props {
  count: number;
}

export function OTPInput({ count }: Props) {
  const half = Math.floor(count / 2);
  const placeholder_numbers = [...Array(count)]?.map((_, i) => String(i + 1));

  return (
    <InputOTP
      id="disabled"
      maxLength={count}
      //   disabled
      //   value={placeholder_numbers}
      //   onChange={}
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
