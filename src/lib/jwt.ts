import type { JwtClaims } from "@/types/api";

// Base64URL-decode the JWT payload segment. We only READ claims here for UI
// (role, family_id, expiry hints) — the server remains the source of truth for
// authorization, so no signature verification is needed or possible client-side.
function base64UrlDecode(segment: string): string {
  const padded = segment.replace(/-/g, "+").replace(/_/g, "/");
  const pad = padded.length % 4 === 0 ? "" : "=".repeat(4 - (padded.length % 4));
  const decoded = atob(padded + pad);
  // Handle UTF-8 (e.g. accented names in the email claim).
  const bytes = Uint8Array.from(decoded, (c) => c.charCodeAt(0));
  return new TextDecoder().decode(bytes);
}

export function decodeJwt(token: string): JwtClaims | null {
  const parts = token.split(".");
  if (parts.length !== 3) return null;
  try {
    const claims = JSON.parse(base64UrlDecode(parts[1]!)) as Partial<JwtClaims>;
    if (
      typeof claims.sub !== "string" ||
      typeof claims.family_id !== "string" ||
      typeof claims.role !== "string" ||
      typeof claims.exp !== "number"
    ) {
      return null;
    }
    return claims as JwtClaims;
  } catch {
    return null;
  }
}

// True when the token is expired (or expires within `skewSeconds`).
// The skew lets callers refresh slightly early to avoid racing the boundary.
export function isExpired(claims: JwtClaims, skewSeconds = 30): boolean {
  const nowSeconds = Date.now() / 1000;
  return claims.exp <= nowSeconds + skewSeconds;
}
