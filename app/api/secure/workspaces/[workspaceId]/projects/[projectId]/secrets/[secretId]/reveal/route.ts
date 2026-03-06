import { NextRequest } from "next/server";

import { proxyWorkspaceProjectSecretsRequest } from "@/lib/server/workspace-project-secrets-proxy";
import {
  createClientSecretsErrorResponse,
  createClientSecretsResponse,
  parseClientSecretsRequestBody,
} from "@/lib/server/secrets-client-route";

export async function POST(
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
      endpointSuffix: `/${secretId}/reveal`,
      method: "POST",
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
      message: "Unable to reveal project secret",
      error,
      status: 400,
    });
  }
}
