import axios, {
  AxiosError,
  AxiosHeaders,
  InternalAxiosRequestConfig,
} from "axios";
import config from "@/config";
import { generateHeaders } from "../helpers/generateHeaders";
import { LOCAL_KEYS } from "@/utils/constants";

const REFRESH_ENDPOINT = "/user/refresh";
const FALLBACK_REFRESH_ENDPOINT = "/refresh";
const AUTH_ROUTES = [
  "/auth/sign-in",
  "/auth/verify-otp",
  REFRESH_ENDPOINT,
  FALLBACK_REFRESH_ENDPOINT,
];

type RetryRequestConfig = InternalAxiosRequestConfig & {
  _retry?: boolean;
};

const getToken = () => {
  return localStorage.getItem(LOCAL_KEYS.TOKEN);
};

const getRefreshToken = () => {
  return localStorage.getItem(LOCAL_KEYS.REFRESH_TOKEN);
};

const clearAuthTokens = () => {
  localStorage.removeItem(LOCAL_KEYS.TOKEN);
  localStorage.removeItem(LOCAL_KEYS.REFRESH_TOKEN);
};

const shouldSkipRefresh = (url?: string) => {
  if (!url) return false;
  return AUTH_ROUTES.some((route) => url.includes(route));
};

let refreshTokenPromise: Promise<string> | null = null;

const refreshAccessToken = async () => {
  const refreshToken = getRefreshToken();

  if (!refreshToken) {
    throw new Error("No refresh token found");
  }

  let response: {
    data: {
      token: string;
      refreshToken?: string;
    };
  };

  try {
    response = await axiosInstance.post<{
      token: string;
      refreshToken?: string;
    }>(REFRESH_ENDPOINT, { refreshToken });
  } catch (error) {
    if (!axios.isAxiosError(error) || error.response?.status !== 404) {
      throw error;
    }

    response = await axiosInstance.post<{
      token: string;
      refreshToken?: string;
    }>(FALLBACK_REFRESH_ENDPOINT, { refreshToken });
  }

  const token = response?.data?.token;
  const nextRefreshToken = response?.data?.refreshToken ?? refreshToken;

  if (!token) {
    throw new Error("Unable to refresh access token");
  }

  localStorage.setItem(LOCAL_KEYS.TOKEN, token);
  localStorage.setItem(LOCAL_KEYS.REFRESH_TOKEN, nextRefreshToken);

  return token;
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
  async (err: AxiosError) => {
    const originalRequest = err.config as RetryRequestConfig | undefined;
    const isUnauthorized = err.response?.status === 401;

    if (
      !isUnauthorized ||
      !originalRequest ||
      originalRequest._retry ||
      shouldSkipRefresh(originalRequest.url)
    ) {
      return Promise.reject(err);
    }

    originalRequest._retry = true;

    try {
      if (!refreshTokenPromise) {
        refreshTokenPromise = refreshAccessToken();
      }

      const token = await refreshTokenPromise;
      const headers = AxiosHeaders.from(originalRequest.headers);
      headers.set("Authorization", `Bearer ${token}`);
      originalRequest.headers = headers;

      return axiosInstance(originalRequest);
    } catch (refreshErr) {
      clearAuthTokens();
      return Promise.reject(refreshErr);
    } finally {
      refreshTokenPromise = null;
    }
  },
);

export default axiosInstance;
