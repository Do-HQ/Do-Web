const CLIENT_TRANSPORT_ALGORITHM = "AES-GCM";
const CLIENT_TRANSPORT_TAG_BYTES = 16;

const encoder = new TextEncoder();
const decoder = new TextDecoder();

const getClientTransportSource = () =>
  String(
    process.env.NEXT_PUBLIC_SECRETS_CLIENT_TRANSPORT_KEY ||
      process.env.NEXT_PUBLIC_API_SECRET ||
      process.env.NEXT_PUBLIC_CLIENT_ID ||
      "do-web-client",
  );

const toBase64 = (bytes: Uint8Array) => {
  if (typeof window === "undefined") {
    return Buffer.from(bytes).toString("base64");
  }

  let binary = "";
  const chunkSize = 0x8000;

  for (let index = 0; index < bytes.length; index += chunkSize) {
    binary += String.fromCharCode(...bytes.subarray(index, index + chunkSize));
  }

  return window.btoa(binary);
};

const fromBase64 = (value: string) => {
  if (typeof window === "undefined") {
    return new Uint8Array(Buffer.from(value, "base64"));
  }

  const binary = window.atob(value);
  const bytes = new Uint8Array(binary.length);

  for (let index = 0; index < binary.length; index += 1) {
    bytes[index] = binary.charCodeAt(index);
  }

  return bytes;
};

const getWebCrypto = () => {
  if (typeof globalThis.crypto === "undefined" || !globalThis.crypto.subtle) {
    throw new Error("Web crypto is unavailable for secrets transport");
  }

  return globalThis.crypto;
};

const importTransportKey = async () => {
  const cryptoInstance = getWebCrypto();
  const sourceDigest = await cryptoInstance.subtle.digest(
    "SHA-256",
    encoder.encode(getClientTransportSource()),
  );

  return cryptoInstance.subtle.importKey(
    "raw",
    sourceDigest,
    { name: CLIENT_TRANSPORT_ALGORITHM },
    false,
    ["encrypt", "decrypt"],
  );
};

const encodeClientSecretsEnvelope = async (payload: unknown) => {
  const cryptoInstance = getWebCrypto();
  const key = await importTransportKey();
  const iv = cryptoInstance.getRandomValues(new Uint8Array(12));
  const encrypted = new Uint8Array(
    await cryptoInstance.subtle.encrypt(
      { name: CLIENT_TRANSPORT_ALGORITHM, iv },
      key,
      encoder.encode(JSON.stringify(payload)),
    ),
  );
  const authTag = encrypted.slice(encrypted.length - CLIENT_TRANSPORT_TAG_BYTES);
  const ciphertext = encrypted.slice(0, encrypted.length - CLIENT_TRANSPORT_TAG_BYTES);

  return `${toBase64(iv)}.${toBase64(authTag)}.${toBase64(ciphertext)}`;
};

const decodeClientSecretsEnvelope = async <T>(envelope: string): Promise<T> => {
  const [ivBase64, authTagBase64, ciphertextBase64] = String(envelope || "")
    .trim()
    .split(".");

  if (!ivBase64 || !authTagBase64 || !ciphertextBase64) {
    throw new Error("Invalid client secrets envelope");
  }

  const cryptoInstance = getWebCrypto();
  const key = await importTransportKey();
  const iv = fromBase64(ivBase64);
  const authTag = fromBase64(authTagBase64);
  const ciphertext = fromBase64(ciphertextBase64);
  const encrypted = new Uint8Array(ciphertext.length + authTag.length);

  encrypted.set(ciphertext, 0);
  encrypted.set(authTag, ciphertext.length);

  const plain = await cryptoInstance.subtle.decrypt(
    { name: CLIENT_TRANSPORT_ALGORITHM, iv },
    key,
    encrypted,
  );

  return JSON.parse(decoder.decode(plain)) as T;
};

export { decodeClientSecretsEnvelope, encodeClientSecretsEnvelope };
