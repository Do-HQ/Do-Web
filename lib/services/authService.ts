import { AuthResponse, GetOtpBody, ValidateOtpBpdy } from "@/types/auth";
import axiosInstance from ".";

const AUTH_ENDPOINTS = {
  GET_OTP: "/auth/sign-in",
  VALIDATE_OTP: "/auth/verify-otp",
};

export const getOtp = (data: GetOtpBody) => {
  const response = axiosInstance.post(AUTH_ENDPOINTS.GET_OTP, data);
  return response;
};

export const validateOtp = (data: ValidateOtpBpdy) => {
  const response = axiosInstance.post<AuthResponse>(
    AUTH_ENDPOINTS.VALIDATE_OTP,
    data,
  );
  return response;
};
