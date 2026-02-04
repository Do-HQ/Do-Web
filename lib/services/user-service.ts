import { AuthResponse, UpdateUserBody } from "@/types/auth";
import axiosInstance from ".";

const USER_ENDPOINTS = {
  GET_USER: "/user",
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
