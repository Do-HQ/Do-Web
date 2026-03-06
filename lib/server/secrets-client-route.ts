import { NextRequest, NextResponse } from "next/server";

import {
  decodeClientSecretsEnvelope,
  encodeClientSecretsEnvelope,
} from "@/lib/server/secrets-client-transport";

const CLIENT_TRANSPORT_HEADER = "x-secrets-client-transport";
const CLIENT_TRANSPORT_VERSION = "v1";

const isClientSecretsTransportEnabled = (request: NextRequest) =>
  String(request.headers.get(CLIENT_TRANSPORT_HEADER) || "")
    .trim()
    .toLowerCase() === CLIENT_TRANSPORT_VERSION;

const parseClientSecretsRequestBody = async (
  request: NextRequest,
): Promise<Record<string, unknown>> => {
  const body = (await request.json().catch(() => ({}))) as Record<
    string,
    unknown
  >;

  if (!isClientSecretsTransportEnabled(request)) {
    return body;
  }

  const envelope = String(body?.envelope || "").trim();

  if (!envelope) {
    throw new Error("Encrypted request payload is required");
  }

  return decodeClientSecretsEnvelope<Record<string, unknown>>(envelope);
};

const createClientSecretsResponse = ({
  request,
  payload,
  status,
}: {
  request: NextRequest;
  payload: unknown;
  status: number;
}) => {
  if (!isClientSecretsTransportEnabled(request)) {
    return NextResponse.json(payload, { status });
  }

  return NextResponse.json(
    {
      envelope: encodeClientSecretsEnvelope(payload),
    },
    { status },
  );
};

const createClientSecretsErrorResponse = ({
  request,
  message,
  error,
  status = 400,
}: {
  request: NextRequest;
  message: string;
  error: unknown;
  status?: number;
}) =>
  createClientSecretsResponse({
    request,
    status,
    payload: {
      message,
      description: error instanceof Error ? error.message : "Unknown error",
    },
  });

export {
  createClientSecretsErrorResponse,
  createClientSecretsResponse,
  parseClientSecretsRequestBody,
};
