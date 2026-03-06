import { NextRequest } from "next/server";

import { proxyWorkspaceProjectSecretsRequest } from "@/lib/server/workspace-project-secrets-proxy";
import {
  createClientSecretsErrorResponse,
  createClientSecretsResponse,
  parseClientSecretsRequestBody,
} from "@/lib/server/secrets-client-route";

export async function GET(
  request: NextRequest,
  context: {
    params: Promise<{ workspaceId: string; projectId: string }>;
  },
) {
  try {
    const { workspaceId, projectId } = await context.params;
    const data = await proxyWorkspaceProjectSecretsRequest({
      request,
      workspaceId,
      projectId,
      endpointSuffix: "/policy",
      method: "GET",
    });

    return createClientSecretsResponse({
      request,
      payload: data.payload,
      status: data.status,
    });
  } catch (error) {
    return createClientSecretsErrorResponse({
      request,
      message: "Unable to fetch secrets policy",
      error,
      status: 400,
    });
  }
}

export async function PATCH(
  request: NextRequest,
  context: {
    params: Promise<{ workspaceId: string; projectId: string }>;
  },
) {
  try {
    const { workspaceId, projectId } = await context.params;
    const body = await parseClientSecretsRequestBody(request);
    const data = await proxyWorkspaceProjectSecretsRequest({
      request,
      workspaceId,
      projectId,
      endpointSuffix: "/policy",
      method: "PATCH",
      body,
    });

    return createClientSecretsResponse({
      request,
      payload: data.payload,
      status: data.status,
    });
  } catch (error) {
    return createClientSecretsErrorResponse({
      request,
      message: "Unable to update secrets policy",
      error,
      status: 400,
    });
  }
}
