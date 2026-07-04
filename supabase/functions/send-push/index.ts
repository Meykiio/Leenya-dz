import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const VAPID_PUBLIC_KEY = Deno.env.get("VAPID_PUBLIC_KEY")!;
const VAPID_PRIVATE_KEY = Deno.env.get("VAPID_PRIVATE_KEY")!;

function base64UrlToUint8Array(base64Url: string): Uint8Array {
  const padding = "=".repeat((4 - (base64Url.length % 4)) % 4);
  const base64 = base64Url.replace(/-/g, "+").replace(/_/g, "/") + padding;
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes;
}

function uint8ArrayToBase64Url(uint8Array: Uint8Array): string {
  let binary = "";
  for (let i = 0; i < uint8Array.byteLength; i++) {
    binary += String.fromCharCode(uint8Array[i]);
  }
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

async function encryptPayload(
  payload: string,
  userPublicKey: Uint8Array,
  userAuth: Uint8Array,
): Promise<{ ciphertext: Uint8Array; salt: Uint8Array; serverPublicKey: Uint8Array }> {
  const serverKeyPair = await crypto.subtle.generateKey(
    { name: "ECDH", namedCurve: "P-256" },
    true,
    ["deriveBits"],
  );

  const serverPrivateKey = await crypto.subtle.exportKey("pkcs8", serverKeyPair.privateKey);
  const serverPublicKey = await crypto.subtle.exportKey("spki", serverKeyPair.publicKey);
  const serverPublicKeyRaw = new Uint8Array(serverPublicKey).slice(-65);

  const salt = crypto.getRandomValues(new Uint8Array(16));

  const sharedSecret = await crypto.subtle.deriveBits(
    {
      name: "ECDH",
      publicKey: await crypto.subtle.importKey(
        "spki",
        await createSPKI(userPublicKey),
        { name: "ECDH", namedCurve: "P-256" },
        false,
        [],
      ),
    },
    serverKeyPair.privateKey,
    256,
  );

  const prk = await hkdf(
    new Uint8Array(sharedSecret),
    userAuth,
    "Content-Encoding: auth\0",
    32,
  );

  const contentEncryptionKey = await hkdf(
    prk,
    salt,
    "Content-Encoding: aesgcm\0",
    16,
  );

  const nonce = await hkdf(
    prk,
    salt,
    "Content-Encoding: nonce\0",
    12,
  );

  const encoder = new TextEncoder();
  const record = new Uint8Array(encoder.encode(payload).length + 1);
  record.set(encoder.encode(payload));
  record[record.length - 1] = 0x02;

  const iv = new Uint8Array(12);
  iv.set(nonce);

  const encrypted = await crypto.subtle.encrypt(
    { name: "AES-GCM", iv, additionalData: null, tagLength: 128 },
    await crypto.subtle.importKey("raw", contentEncryptionKey, "AES-GCM", false, ["encrypt"]),
    record,
  );

  return {
    ciphertext: new Uint8Array(encrypted),
    salt,
    serverPublicKey: serverPublicKeyRaw,
  };
}

async function createSPKI(rawKey: Uint8Array): Promise<ArrayBuffer> {
  const uncompressedPoint = new Uint8Array(65);
  uncompressedPoint[0] = 0x04;
  uncompressedPoint.set(rawKey, 1);

  const spkiHeader = new Uint8Array([
    0x30, 0x59, 0x30, 0x13, 0x06, 0x07, 0x2a, 0x86, 0x48, 0xce, 0x3d, 0x02, 0x01,
    0x06, 0x08, 0x2a, 0x86, 0x48, 0xce, 0x3d, 0x03, 0x01, 0x07, 0x03, 0x42, 0x00,
  ]);

  const result = new Uint8Array(spkiHeader.length + 65);
  result.set(spkiHeader);
  result.set(uncompressedPoint, spkiHeader.length);
  return result.buffer;
}

async function hkdf(
  salt: Uint8Array,
  ikm: Uint8Array,
  info: string,
  length: number,
): Promise<Uint8Array> {
  const key = await crypto.subtle.importKey("raw", ikm, "HKDF", false, ["deriveBits"]);
  const encoder = new TextEncoder();
  const result = await crypto.subtle.deriveBits(
    {
      name: "HKDF",
      salt,
      info: encoder.encode(info),
      hash: "SHA-256",
    },
    key,
    length * 8,
  );
  return new Uint8Array(result);
}

async function signJWT(
  privateKey: Uint8Array,
  header: Record<string, unknown>,
  payload: Record<string, unknown>,
): Promise<string> {
  const encoder = new TextEncoder();
  const headerB64 = uint8ArrayToBase64Url(encoder.encode(JSON.stringify(header)));
  const payloadB64 = uint8ArrayToBase64Url(encoder.encode(JSON.stringify(payload)));
  const signingInput = `${headerB64}.${payloadB64}`;

  const key = await crypto.subtle.importKey(
    "pkcs8",
    privateKey,
    { name: "ECDSA", namedCurve: "P-256" },
    false,
    ["sign"],
  );

  const signature = await crypto.subtle.sign(
    { name: "ECDSA", hash: "SHA-256" },
    key,
    encoder.encode(signingInput),
  );

  const signatureB64 = uint8ArrayToBase64Url(new Uint8Array(signature));
  return `${signingInput}.${signatureB64}`;
}

async function sendNotification(
  subscription: { endpoint: string; keys: { p256dh: string; auth: string } },
  payloadString: string,
): Promise<Response> {
  const userPublicKey = base64UrlToUint8Array(subscription.keys.p256dh);
  const userAuth = base64UrlToUint8Array(subscription.keys.auth);

  const { ciphertext, salt, serverPublicKey } = await encryptPayload(
    payloadString,
    userPublicKey,
    userAuth,
  );

  const privateKeyBytes = base64UrlToUint8Array(VAPID_PRIVATE_KEY);
  const privateKeyPKCS8 = new Uint8Array(privateKeyBytes.length + 90);
  privateKeyPKCS8.set([
    0x30, 0x77, 0x02, 0x01, 0x01, 0x04, 0x20,
  ]);
  privateKeyPKCS8.set(privateKeyBytes, 7);
  privateKeyPKCS8[39] = 0xa0;
  privateKeyPKCS8[40] = 0x0a;
  privateKeyPKCS8[41] = 0x06;
  privateKeyPKCS8[42] = 0x07;
  privateKeyPKCS8[43] = 0x2a;
  privateKeyPKCS8[44] = 0x86;
  privateKeyPKCS8[45] = 0x48;
  privateKeyPKCS8[46] = 0xce;
  privateKeyPKCS8[47] = 0x3d;
  privateKeyPKCS8[48] = 0x04;
  privateKeyPKCS8[49] = 0x01;
  privateKeyPKCS8[50] = 0x22;
  privateKeyPKCS8[51] = 0x03;
  privateKeyPKCS8[52] = 0x42;
  privateKeyPKCS8[53] = 0x00;

  const now = Math.floor(Date.now() / 1000);
  const vapidJWT = await signJWT(
    privateKeyPKCS8,
    { typ: "JWT", alg: "ES256" },
    { aud: subscription.endpoint, exp: now + 43200, sub: "mailto:support@leenya.dz" },
  );

  const publicKeyBytes = base64UrlToUint8Array(VAPID_PUBLIC_KEY);

  const headers: Record<string, string> = {
    "Content-Encoding": "aes128gcm",
    "Content-Type": "application/octet-stream",
    "Authorization": `WebPush ${vapidJWT}`,
    "Crypto-Key": `p256ecdsa=${uint8ArrayToBase64Url(publicKeyBytes)}`,
    "TTL": "86400",
  };

  const encryptedPayload = new Uint8Array(
    16 + 65 + ciphertext.length,
  );
  encryptedPayload.set(salt, 0);
  encryptedPayload.set(serverPublicKey, 16);
  encryptedPayload.set(ciphertext, 16 + 65);
  const recordLength = ciphertext.length + 16;
  const recordLengthBytes = new Uint8Array([
    (recordLength >> 24) & 0xff,
    (recordLength >> 16) & 0xff,
    (recordLength >> 8) & 0xff,
    recordLength & 0xff,
  ]);
  const body = new Uint8Array(encryptedPayload.length + 4);
  body.set(encryptedPayload);
  body.set(recordLengthBytes, encryptedPayload.length);

  return fetch(subscription.endpoint, {
    method: "POST",
    headers,
    body,
  });
}

serve(async (req) => {
  if (req.method !== "POST") {
    return new Response("Method not allowed", { status: 405 });
  }

  try {
    const { subscription, title, body: messageBody, url, icon, badge } = await req.json();

    const payload = JSON.stringify({
      title: title || "Leenya",
      body: messageBody || "",
      url: url || "/",
      icon: icon || "/pwa-icon-192.png",
      badge: badge || "/pwa-icon-192.png",
    });

    const response = await sendNotification(subscription, payload);

    if (!response.ok) {
      const text = await response.text();
      console.error("Push send failed:", response.status, text);
      return new Response(
        JSON.stringify({ error: `Push provider returned ${response.status}`, detail: text }),
        { status: response.status },
      );
    }

    return new Response(JSON.stringify({ success: true }), {
      headers: { "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("send-push error:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 500, headers: { "Content-Type": "application/json" } },
    );
  }
});
