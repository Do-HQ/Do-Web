import axios, { AxiosHeaders } from "axios";
import config from "@/config";
import { generateHeaders } from "../helpers/generateHeaders";
import { LOCAL_KEYS } from "@/utils/constants";

const getToken = () => {
  return localStorage.getItem(LOCAL_KEYS.TOKEN);
};

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

    if (axiosConfig.data instanceof FormData) {
      delete axiosConfig.headers?.["Content-Type"];
    }

    const headers = generateHeaders({
      token: getToken()!,
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
