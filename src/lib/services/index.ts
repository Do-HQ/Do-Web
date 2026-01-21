import axios from "axios";
import { LOCAL_USER_TOKEN_KEY } from "../utils/constants";
import config from "../config";

const getToken = () => {
  if (typeof window !== "undefined") {
    return localStorage.getItem(LOCAL_USER_TOKEN_KEY);
  }
};

const axiosInstance = axios.create({
  baseURL: config.BASE_API_URL,
  withCredentials: true,
  headers: {
    "Content-Type": "application/json",
  },
});

axiosInstance.interceptors.request.use((axiosConfig) => {
  if (!navigator.onLine) {
    throw new Error("Please check your internet connection");
  }

  axiosConfig.headers.Authorization = `Bearer ${getToken()}`;

  return axiosConfig;
});

axiosInstance.interceptors.response.use(
  (response) => {
    if (response?.status === 200 || response?.status === 201) {
      return response;
    } else {
      throw new Error(response?.data?.error?.message);
    }
  },
  async (err) => {
    return Promise.reject(err);
  },
);

export default axiosInstance;
