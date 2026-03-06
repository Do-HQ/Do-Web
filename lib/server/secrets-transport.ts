import crypto from "node:crypto";

const TRANSPORT_ALGORITHM = "aes-256-gcm";

const getTransportKey = () => {
  const source =
    process.env.SECRETS_TRANSPORT_KEY ||
    process.env.NEXT_PUBLIC_API_SECRET ||
    process.env.NEXT_PUBLIC_CLIENT_ID ||
    process.env.CLIENT_ID ||
    "do-web";

  return crypto.createHash("sha256").update(String(source)).digest();
};

const encodeSecretsEnvelope = (payload: unknown) => {
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv(TRANSPORT_ALGORITHM, getTransportKey(), iv);
  const encrypted = Buffer.concat([
    cipher.update(JSON.stringify(payload), "utf8"),
    cipher.final(),
  ]);
  const authTag = cipher.getAuthTag();

  return `${iv.toString("base64")}.${authTag.toString("base64")}.${encrypted.toString("base64")}`;
};

const decodeSecretsEnvelope = <T>(envelope: string): T => {
  const [ivBase64, authTagBase64, ciphertextBase64] = String(envelope || "")
    .trim()
    .split(".");

  if (!ivBase64 || !authTagBase64 || !ciphertextBase64) {
    throw new Error("Invalid secrets transport envelope");
  }

  const iv = Buffer.from(ivBase64, "base64");
  const authTag = Buffer.from(authTagBase64, "base64");
  const ciphertext = Buffer.from(ciphertextBase64, "base64");
  const decipher = crypto.createDecipheriv(
    TRANSPORT_ALGORITHM,
    getTransportKey(),
    iv,
  );
  decipher.setAuthTag(authTag);
  const plain = Buffer.concat([
    decipher.update(ciphertext),
    decipher.final(),
  ]).toString("utf8");

  return JSON.parse(plain) as T;
};

export { encodeSecretsEnvelope, decodeSecretsEnvelope };
