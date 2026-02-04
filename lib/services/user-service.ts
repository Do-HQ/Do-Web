import { AuthResponse, LogoutRequestBody, UpdateUserBody } from "@/types/auth";
import axiosInstance from ".";
import { ResponseObject } from "@/types/file";

const USER_ENDPOINTS = {
  GET_USER: "/user",
  LOGOUT: "/user/logout",
};

export const getUser = () => {
  const response = axiosInstance.get<AuthResponse>(USER_ENDPOINTS.GET_USER);
  return response;
};

export const updateUser = (data: UpdateUserBody) => {
  const response = axiosInstance.patch<AuthResponse>(
    USER_ENDPOINTS.GET_USER,
    data,
  );
  return response;
};

export const logoutUser = (data: LogoutRequestBody) => {
  const response = axiosInstance.post<ResponseObject>(
    USER_ENDPOINTS.LOGOUT,
    data,
  );
  return response;
};
