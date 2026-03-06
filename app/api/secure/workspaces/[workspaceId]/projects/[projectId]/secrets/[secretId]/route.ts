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
    params: Promise<{ workspaceId: string; projectId: string; secretId: string }>;
  },
) {
  try {
    const { workspaceId, projectId, secretId } = await context.params;
    const data = await proxyWorkspaceProjectSecretsRequest({
      request,
      workspaceId,
      projectId,
      endpointSuffix: `/${secretId}`,
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
      message: "Unable to fetch project secret",
      error,
      status: 400,
    });
  }
}

export async function PATCH(
  request: NextRequest,
  context: {
    params: Promise<{ workspaceId: string; projectId: string; secretId: string }>;
  },
) {
  try {
    const { workspaceId, projectId, secretId } = await context.params;
    const body = await parseClientSecretsRequestBody(request);
    const data = await proxyWorkspaceProjectSecretsRequest({
      request,
      workspaceId,
      projectId,
      endpointSuffix: `/${secretId}`,
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
      message: "Unable to update project secret",
      error,
      status: 400,
    });
  }
}

export async function DELETE(
  request: NextRequest,
  context: {
    params: Promise<{ workspaceId: string; projectId: string; secretId: string }>;
  },
) {
  try {
    const { workspaceId, projectId, secretId } = await context.params;
    const data = await proxyWorkspaceProjectSecretsRequest({
      request,
      workspaceId,
      projectId,
      endpointSuffix: `/${secretId}`,
      method: "DELETE",
    });

    return createClientSecretsResponse({
      request,
      payload: data.payload,
      status: data.status,
    });
  } catch (error) {
    return createClientSecretsErrorResponse({
      request,
      message: "Unable to delete project secret",
      error,
      status: 400,
    });
  }
}
