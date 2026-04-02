import crypto from "crypto";

type GenerateHeadersParams = {
  token?: string;
  clientId?: string;
  workspaceId?: string;
  projectId?: string;
  profileToken?: string;
  agentId?: string;
};

const readCookie = (name: string) => {
  if (typeof document === "undefined") {
    return "";
  }

  const pairs = document.cookie.split(";").map((entry) => entry.trim());
  for (const pair of pairs) {
    if (!pair) continue;
    const [key, ...valueParts] = pair.split("=");
    if (key === name) {
      return decodeURIComponent(valueParts.join("="));
    }
  }
  return "";
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
  const requestId = globalThis.crypto.randomUUID();
  const csrfToken = readCookie("csrf_token");

  const signaturePayload = `${clientId || "public-client"}.${workspaceId || "none"}.${timestamp}`;

  const signature = crypto
    .createHmac("sha256", process.env.NEXT_PUBLIC_API_SECRET || "public")
    .update(signaturePayload)
    .digest("hex");

  const headers: Record<string, string> = {
    "X-Project-Id": projectId ?? "",
    "X-Profile-Token": profileToken ?? "",
    "X-Agent-Id": agentId ?? "",
    "X-Request-Id": requestId,
    "X-Timestamp": timestamp,
    "X-Signature": signature,
  };

  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }

  if (clientId) {
    headers["X-Client-Id"] = clientId;
  }

  if (workspaceId) {
    headers["X-Workspace-Id"] = workspaceId;
  }

  if (csrfToken) {
    headers["X-CSRF-Token"] = csrfToken;
  }

  return headers;
}
