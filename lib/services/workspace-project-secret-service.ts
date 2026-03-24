import { LOCAL_KEYS } from "@/utils/constants";
import {
  decodeClientSecretsEnvelope,
  encodeClientSecretsEnvelope,
} from "@/lib/client/secrets-transport";
import {
  CreateWorkspaceProjectSecretRequestBody,
  UpdateWorkspaceProjectSecretPolicyRequestBody,
  UpdateWorkspaceProjectSecretRequestBody,
  WorkspaceProjectSecretPolicy,
  WorkspaceProjectSecretRecord,
} from "@/types/project";
import { Pagination } from "@/types";

type SecretsQueryParams = {
  page?: number;
  limit?: number;
  search?: string;
  archived?: boolean;
};

type SecretServiceErrorPayload = {
  message?: string;
  description?: string;
  code?: string;
  approvalRequest?: unknown;
};

class WorkspaceProjectSecretServiceError extends Error {
  status: number;

  code?: string;

  approvalRequest?: unknown;

  response: {
    data: SecretServiceErrorPayload;
  };

  constructor(status: number, payload: SecretServiceErrorPayload = {}) {
    super(
      String(payload?.description || payload?.message || "Request failed"),
    );
    this.name = "WorkspaceProjectSecretServiceError";
    this.status = status;
    this.code =
      typeof payload?.code === "string" ? payload.code : undefined;
    this.approvalRequest = payload?.approvalRequest;
    this.response = {
      data: {
        message: payload?.message,
        description: payload?.description,
        code: this.code,
        approvalRequest: payload?.approvalRequest,
      },
    };
  }
}

const CLIENT_TRANSPORT_VERSION = "v1";

const buildHeaders = () => {
  const headers: Record<string, string> = {
    "content-type": "application/json",
    "x-secrets-client-transport": CLIENT_TRANSPORT_VERSION,
  };

  if (typeof window === "undefined") {
    return headers;
  }

  const token = localStorage.getItem(LOCAL_KEYS.TOKEN);

  if (token) {
    headers.authorization = `Bearer ${token}`;
  }

  return headers;
};

const parseResponse = async <T>(response: Response): Promise<T> => {
  const payload = (await response.json().catch(() => ({}))) as
    | Record<string, unknown>
    | undefined;
  const decodedPayload =
    payload && typeof payload?.envelope === "string"
      ? await decodeClientSecretsEnvelope<Record<string, unknown>>(
          String(payload.envelope),
        )
      : payload;

  if (!response.ok) {
    throw new WorkspaceProjectSecretServiceError(
      response.status,
      (decodedPayload || {}) as SecretServiceErrorPayload,
    );
  }

  return decodedPayload as T;
};

const buildEncryptedBody = async (payload: unknown) =>
  JSON.stringify({
    envelope: await encodeClientSecretsEnvelope(payload),
  });

const buildBasePath = (workspaceId: string, projectId: string) =>
  `/api/secure/workspaces/${workspaceId}/projects/${projectId}/secrets`;

const getWorkspaceProjectSecrets = async (
  workspaceId: string,
  projectId: string,
  params: SecretsQueryParams = {},
) => {
  const search = new URLSearchParams();

  if (params.page) {
    search.set("page", String(params.page));
  }

  if (params.limit) {
    search.set("limit", String(params.limit));
  }

  if (params.search) {
    search.set("search", params.search);
  }

  if (typeof params.archived !== "undefined") {
    search.set("archived", String(params.archived));
  }

  const response = await fetch(
    `${buildBasePath(workspaceId, projectId)}${search.size ? `?${search}` : ""}`,
    {
      method: "GET",
      headers: buildHeaders(),
      cache: "no-store",
    },
  );

  return parseResponse<{
    message: string;
    secrets: WorkspaceProjectSecretRecord[];
    policy: WorkspaceProjectSecretPolicy;
    pagination: Pagination;
  }>(response);
};

const getWorkspaceProjectSecretsPolicy = async (
  workspaceId: string,
  projectId: string,
) => {
  const response = await fetch(
    `${buildBasePath(workspaceId, projectId)}/policy`,
    {
      method: "GET",
      headers: buildHeaders(),
      cache: "no-store",
    },
  );

  return parseResponse<{
    message: string;
    policy: WorkspaceProjectSecretPolicy;
  }>(response);
};

const updateWorkspaceProjectSecretsPolicy = async (data: {
  workspaceId: string;
  projectId: string;
  updates: UpdateWorkspaceProjectSecretPolicyRequestBody;
}) => {
  const response = await fetch(
    `${buildBasePath(data.workspaceId, data.projectId)}/policy`,
    {
      method: "PATCH",
      headers: buildHeaders(),
      body: await buildEncryptedBody(data.updates),
    },
  );

  return parseResponse<{
    message: string;
    policy: WorkspaceProjectSecretPolicy;
  }>(response);
};

const createWorkspaceProjectSecret = async (data: {
  workspaceId: string;
  projectId: string;
  payload: CreateWorkspaceProjectSecretRequestBody;
}) => {
  const response = await fetch(buildBasePath(data.workspaceId, data.projectId), {
    method: "POST",
    headers: buildHeaders(),
    body: await buildEncryptedBody(data.payload),
  });

  return parseResponse<{
    message: string;
    secret: WorkspaceProjectSecretRecord;
  }>(response);
};

const updateWorkspaceProjectSecret = async (data: {
  workspaceId: string;
  projectId: string;
  secretId: string;
  updates: UpdateWorkspaceProjectSecretRequestBody;
}) => {
  const response = await fetch(
    `${buildBasePath(data.workspaceId, data.projectId)}/${data.secretId}`,
    {
      method: "PATCH",
      headers: buildHeaders(),
      body: await buildEncryptedBody(data.updates),
    },
  );

  return parseResponse<{
    message: string;
    secret: WorkspaceProjectSecretRecord;
  }>(response);
};

const deleteWorkspaceProjectSecret = async (data: {
  workspaceId: string;
  projectId: string;
  secretId: string;
}) => {
  const response = await fetch(
    `${buildBasePath(data.workspaceId, data.projectId)}/${data.secretId}`,
    {
      method: "DELETE",
      headers: buildHeaders(),
    },
  );

  return parseResponse<{
    message: string;
    removedSecretId: string;
  }>(response);
};

const revealWorkspaceProjectSecret = async (data: {
  workspaceId: string;
  projectId: string;
  secretId: string;
}) => {
  const response = await fetch(
    `${buildBasePath(data.workspaceId, data.projectId)}/${data.secretId}/reveal`,
    {
      method: "POST",
      headers: buildHeaders(),
      body: await buildEncryptedBody({}),
    },
  );

  return parseResponse<{
    message: string;
    secret: WorkspaceProjectSecretRecord;
    value: string;
  }>(response);
};

export type { SecretsQueryParams };
export {
  WorkspaceProjectSecretServiceError,
  getWorkspaceProjectSecrets,
  getWorkspaceProjectSecretsPolicy,
  updateWorkspaceProjectSecretsPolicy,
  createWorkspaceProjectSecret,
  updateWorkspaceProjectSecret,
  deleteWorkspaceProjectSecret,
  revealWorkspaceProjectSecret,
};
