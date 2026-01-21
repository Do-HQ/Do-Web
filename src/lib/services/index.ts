import axios, { AxiosHeaders } from "axios";
import config from "../config";
import { generateHeaders } from "../helpers/generateHeaders";

const axiosInstance = axios.create({
  baseURL: config.BASE_API_URL,
  withCredentials: true,
  headers: {
    "Content-Type": "application/json",
  },
});

axiosInstance.interceptors.request.use(
  (axiosConfig) => {
    if (!navigator.onLine) {
      throw new Error("Please check your internet connection");
    }

    const token = config.BASE_API_URL;
    if (!token) {
      throw new Error("Authentication token missing");
    }

    const headers = generateHeaders({
      token,
      clientId: config.CLIENT_ID!,
      workspaceId: "1",
      profileToken: "1",
      projectId: "1",
      agentId: "1",
    });

    axiosConfig.headers = AxiosHeaders.from({
      ...axiosConfig.headers?.toJSON(),
      ...headers,
    });

    return axiosConfig;
  },
  (error) => Promise.reject(error),
);

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
