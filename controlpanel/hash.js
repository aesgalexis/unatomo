const encoder = new TextEncoder();

export async function createHash(value) {
  const data = encoder.encode((value || "").toString());
  const digest = await crypto.subtle.digest("SHA-256", data);
  const bytes = new Uint8Array(digest);
  return Array.from(bytes, (byte) => byte.toString(16).padStart(2, "0")).join("");
}
