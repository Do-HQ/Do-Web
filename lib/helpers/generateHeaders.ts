import crypto from "crypto";

type GenerateHeadersParams = {
  token: string;
  clientId: string;
  workspaceId: string;
  projectId?: string;
  profileToken?: string;
  agentId?: string;
};

export function generateHeaders({
  token,
  clientId,
  workspaceId,
  projectId,
  profileToken,
  agentId,
}: GenerateHeadersParams) {
  const timestamp = Date.now().toString();
  const requestId = crypto.randomUUID();

  const signaturePayload = `${clientId}.${workspaceId}.${timestamp}`;
  const signature = crypto
    .createHmac("sha256", process.env.NEXT_PUBLIC_API_SECRET!)
    .update(signaturePayload)
    .digest("hex");

  return {
    Authorization: `Bearer ${token}`,
    "X-Client-Id": clientId,
    "X-Workspace-Id": workspaceId,
    "X-Project-Id": projectId ?? "",
    "X-Profile-Token": profileToken ?? "",
    "X-Agent-Id": agentId ?? "",
    "X-Request-Id": requestId,
    "X-Timestamp": timestamp,
    "X-Signature": signature,
    "Content-Type": "application/json",
  };
}
