import { NextRequest } from "next/server";

import {
  decodeSecretsEnvelope,
  encodeSecretsEnvelope,
} from "@/lib/server/secrets-transport";

type ProxyMethod = "GET" | "POST" | "PATCH" | "DELETE";

const getBackendBaseUrl = () => {
  const base = String(process.env.NEXT_PUBLIC_API_BASE_URL || "").trim();

  if (!base) {
    throw new Error("NEXT_PUBLIC_API_BASE_URL is not configured");
  }

  return base.replace(/\/$/, "");
};

const getAuthHeader = (request: NextRequest) => {
  const value = String(request.headers.get("authorization") || "").trim();

  if (!value) {
    throw new Error("Unauthorized");
  }

  return value;
};

const decodeBackendPayload = async (response: Response) => {
  const payload = await response.json().catch(() => ({}));

  if (payload && typeof payload === "object" && typeof payload.envelope === "string") {
    return decodeSecretsEnvelope<Record<string, unknown>>(payload.envelope);
  }

  return payload;
};

const proxyWorkspaceProjectSecretsRequest = async ({
  request,
  workspaceId,
  projectId,
  endpointSuffix = "",
  method = "GET",
  searchParams,
  body,
}: {
  request: NextRequest;
  workspaceId: string;
  projectId: string;
  endpointSuffix?: string;
  method?: ProxyMethod;
  searchParams?: URLSearchParams;
  body?: Record<string, unknown>;
}) => {
  const authorization = getAuthHeader(request);
  const queryString = searchParams?.toString();
  const basePath = `${getBackendBaseUrl()}/workspace/${workspaceId}/projects/${projectId}/secrets`;
  const url =
    `${basePath}${endpointSuffix}` + (queryString ? `?${queryString}` : "");
  const shouldSendBody = method !== "GET" && typeof body !== "undefined";
  const response = await fetch(url, {
    method,
    headers: {
      authorization,
      "content-type": "application/json",
      "x-secrets-transport": "v1",
    },
    cache: "no-store",
    body: shouldSendBody
      ? JSON.stringify({
          envelope: encodeSecretsEnvelope(body),
        })
      : undefined,
  });
  const decodedPayload = await decodeBackendPayload(response);

  return {
    status: response.status,
    payload: decodedPayload,
  };
};

export { proxyWorkspaceProjectSecretsRequest };
