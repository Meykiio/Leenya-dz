import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.98.0";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const VAPID_PUBLIC_KEY = Deno.env.get("VAPID_PUBLIC_KEY")!;
const VAPID_PRIVATE_KEY = Deno.env.get("VAPID_PRIVATE_KEY")!;

function base64UrlToUint8Array(base64Url: string): Uint8Array {
  const padding = "=".repeat((4 - (base64Url.length % 4)) % 4);
  const base64 = base64Url.replace(/-/g, "+").replace(/_/g, "/") + padding;
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return bytes;
}

function uint8ArrayToBase64Url(u8: Uint8Array): string {
  let binary = "";
  for (let i = 0; i < u8.byteLength; i++) binary += String.fromCharCode(u8[i]);
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

async function encryptPayload(payload: string, userPublicKey: Uint8Array, userAuth: Uint8Array) {
  const serverKeyPair = await crypto.subtle.generateKey({ name: "ECDH", namedCurve: "P-256" }, true, ["deriveBits"]);
  const serverPublicKey = await crypto.subtle.exportKey("spki", serverKeyPair.publicKey);
  const serverPublicKeyRaw = new Uint8Array(serverPublicKey).slice(-65);
  const salt = crypto.getRandomValues(new Uint8Array(16));

  const sharedSecret = await crypto.subtle.deriveBits(
    { name: "ECDH", publicKey: await crypto.subtle.importKey("spki", await createSPKI(userPublicKey), { name: "ECDH", namedCurve: "P-256" }, false, []) },
    serverKeyPair.privateKey, 256,
  );
  const prk = await hkdf(new Uint8Array(sharedSecret), userAuth, "Content-Encoding: auth\0", 32);
  const contentEncryptionKey = await hkdf(prk, salt, "Content-Encoding: aesgcm\0", 16);
  const nonce = await hkdf(prk, salt, "Content-Encoding: nonce\0", 12);

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
  return { ciphertext: new Uint8Array(encrypted), salt, serverPublicKey: serverPublicKeyRaw };
}

async function createSPKI(rawKey: Uint8Array): Promise<ArrayBuffer> {
  const uncompressedPoint = new Uint8Array(65);
  uncompressedPoint[0] = 0x04;
  uncompressedPoint.set(rawKey, 1);
  const spkiHeader = new Uint8Array([0x30, 0x59, 0x30, 0x13, 0x06, 0x07, 0x2a, 0x86, 0x48, 0xce, 0x3d, 0x02, 0x01, 0x06, 0x08, 0x2a, 0x86, 0x48, 0xce, 0x3d, 0x02, 0x01, 0x06, 0x08, 0x2a, 0x86, 0x48, 0xce, 0x3d, 0x03, 0x01, 0x07, 0x03, 0x42, 0x00]);
  const result = new Uint8Array(spkiHeader.length + 65);
  result.set(spkiHeader);
  result.set(uncompressedPoint, spkiHeader.length);
  return result.buffer;
}

async function hkdf(salt: Uint8Array, ikm: Uint8Array, info: string, length: number): Promise<Uint8Array> {
  const key = await crypto.subtle.importKey("raw", ikm, "HKDF", false, ["deriveBits"]);
  const encoder = new TextEncoder();
  const result = await crypto.subtle.deriveBits({ name: "HKDF", salt, info: encoder.encode(info), hash: "SHA-256" }, key, length * 8);
  return new Uint8Array(result);
}

async function signJWT(privateKey: Uint8Array, header: Record<string, unknown>, payload: Record<string, unknown>): Promise<string> {
  const encoder = new TextEncoder();
  const headerB64 = uint8ArrayToBase64Url(encoder.encode(JSON.stringify(header)));
  const payloadB64 = uint8ArrayToBase64Url(encoder.encode(JSON.stringify(payload)));
  const signingInput = `${headerB64}.${payloadB64}`;
  const key = await crypto.subtle.importKey("pkcs8", privateKey, { name: "ECDSA", namedCurve: "P-256" }, false, ["sign"]);
  const signature = await crypto.subtle.sign({ name: "ECDSA", hash: "SHA-256" }, key, encoder.encode(signingInput));
  return `${signingInput}.${uint8ArrayToBase64Url(new Uint8Array(signature))}`;
}

function uint8ArrayToBase64Url(u8: Uint8Array): string {
  let binary = "";
  for (let i = 0; i < u8.byteLength; i++) binary += String.fromCharCode(u8[i]);
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

async function sendNotification(subscription: { endpoint: string; keys: { p256dh: string; auth: string } }, payloadString: string): Promise<Response> {
  const userPublicKey = base64UrlToUint8Array(subscription.keys.p256dh);
  const userAuth = base64UrlToUint8Array(subscription.keys.auth);
  const { ciphertext, salt, serverPublicKey } = await encryptPayload(payloadString, userPublicKey, userAuth);

  const privateKeyBytes = base64UrlToUint8Array(VAPID_PRIVATE_KEY);
  const privateKeyPKCS8 = new Uint8Array(privateKeyBytes.length + 90);
  privateKeyPKCS8.set([0x30, 0x77, 0x02, 0x01, 0x01, 0x04, 0x20]);
  privateKeyPKCS8.set(privateKeyBytes, 7);
  privateKeyPKCS8[39] = 0xa0; privateKeyPKCS8[40] = 0x0a;
  privateKeyPKCS8[41] = 0x06; privateKeyPKCS8[42] = 0x07;
  privateKeyPKCS8[43] = 0x2a; privateKeyPKCS8[44] = 0x86;
  privateKeyPKCS8[45] = 0x48; privateKeyPKCS8[46] = 0xce;
  privateKeyPKCS8[47] = 0x3d; privateKeyPKCS8[48] = 0x04;
  privateKeyPKCS8[49] = 0x01; privateKeyPKCS8[50] = 0x22;
  privateKeyPKCS8[51] = 0x03; privateKeyPKCS8[52] = 0x42;
  privateKeyPKCS8[53] = 0x00;

  const now = Math.floor(Date.now() / 1000);
  const vapidJWT = await signJWT(privateKeyPKCS8, { typ: "JWT", alg: "ES256" }, { aud: subscription.endpoint, exp: now + 43200, sub: "mailto:support@leenya.dz" });
  const publicKeyBytes = base64UrlToUint8Array(VAPID_PUBLIC_KEY);

  const encryptedPayload = new Uint8Array(16 + 65 + ciphertext.length);
  encryptedPayload.set(salt, 0);
  encryptedPayload.set(serverPublicKey, 16);
  encryptedPayload.set(ciphertext, 16 + 65);
  const recordLength = ciphertext.length + 16;
  const recordLengthBytes = new Uint8Array([(recordLength >> 24) & 0xff, (recordLength >> 16) & 0xff, (recordLength >> 8) & 0xff, recordLength & 0xff]);
  const body = new Uint8Array(encryptedPayload.length + 4);
  body.set(encryptedPayload);
  body.set(recordLengthBytes, encryptedPayload.length);

  return fetch(subscription.endpoint, { method: "POST", headers: { "Content-Encoding": "aes128gcm", "Content-Type": "application/octet-stream", Authorization: `WebPush ${vapidJWT}`, "Crypto-Key": `p256ecdsa=${uint8ArrayToBase64Url(publicKeyBytes)}`, TTL: "86400" }, body });
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 204, headers: { "Access-Control-Allow-Origin": "*", "Access-Control-Allow-Methods": "POST, OPTIONS", "Access-Control-Allow-Headers": "Content-Type, Authorization, apikey" } });
  }
  if (req.method !== "POST") return new Response("Method not allowed", { status: 405 });

  try {
    const { queue_ticket_id, booking_id, title, body: messageBody, url, icon, badge } = await req.json();

    // Auth: verify the caller has a valid session
    const authHeader = req.headers.get("Authorization") ?? "";
    if (!authHeader.startsWith("Bearer ")) return new Response("Missing auth", { status: 401 });
    const jwt = authHeader.slice(7);

    const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);
    const { data: { user } } = await supabase.auth.getUser(jwt);
    if (!user) return new Response("Invalid token", { status: 401 });

    // Authz: caller must be owner/staff/superadmin of the business that owns the ticket/booking
    let businessId: string | null = null;
    if (queue_ticket_id) {
      const { data: t } = await supabase.from("queue_tickets").select("business_id").eq("id", queue_ticket_id).maybeSingle();
      businessId = t?.business_id ?? null;
    } else if (booking_id) {
      const { data: bk } = await supabase.from("bookings").select("business_id").eq("id", booking_id).maybeSingle();
      businessId = bk?.business_id ?? null;
    }
    if (!businessId) return new Response("Invalid ticket or booking", { status: 400 });

    const { data: isAuthorized } = await supabase.rpc("get_user_role_for_business", { p_business_id: businessId }).catch(() => ({ data: false }));
    if (!isAuthorized) {
      // fallback check: superadmin
      const { data: roleData } = await supabase.rpc("get_user_role");
      if (roleData !== "superadmin") return new Response("Not authorized", { status: 403 });
    }

    // Look up stored subscriptions
    let query = supabase.from("push_subscriptions").select("id, subscription, locale").eq("business_id", businessId);
    if (queue_ticket_id) query = query.eq("queue_ticket_id", queue_ticket_id);
    else if (booking_id) query = query.eq("booking_id", booking_id);
    const { data: subs } = await query;
    if (!subs || subs.length === 0) return new Response(JSON.stringify({ success: true, sent: 0 }), { headers: { "Content-Type": "application/json" } });

    const payload = JSON.stringify({ title: title || "Leenya", body: messageBody || "", url: url || "/", icon: icon || "/pwa-icon-192.png", badge: badge || "/pwa-icon-192.png" });
    let sent = 0, expired: string[] = [];

    for (const sub of subs) {
      try {
        const subObj = typeof sub.subscription === "string" ? JSON.parse(sub.subscription) : sub.subscription;
        if (!subObj?.endpoint || !subObj?.keys) { expired.push(sub.id); continue; }
        const response = await sendNotification(subObj, payload);
        if (!response.ok && (response.status === 404 || response.status === 410)) expired.push(sub.id);
        else sent++;
      } catch { expired.push(sub.id); }
    }

    if (expired.length) await supabase.from("push_subscriptions").delete().in("id", expired);

    return new Response(JSON.stringify({ success: true, sent, cleaned: expired.length }), { headers: { "Content-Type": "application/json" } });
  } catch (error) {
    console.error("send-push error:", error);
    return new Response(JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }), { status: 500, headers: { "Content-Type": "application/json" } });
  }
});
