import { describe, expect, it } from "vitest";

import { decodeJwt, isExpired } from "@/lib/jwt";

// Build a JWT with the given payload (header/signature are dummy — we never verify).
function makeToken(payload: Record<string, unknown>): string {
  const b64url = (obj: unknown) =>
    btoa(JSON.stringify(obj)).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
  return `${b64url({ alg: "HS256", typ: "JWT" })}.${b64url(payload)}.sig`;
}

const validClaims = {
  sub: "user-1",
  email: "a@b.com",
  family_id: "fam-1",
  role: "admin",
  exp: Math.floor(Date.now() / 1000) + 3600,
};

describe("decodeJwt", () => {
  it("decodes valid claims", () => {
    const claims = decodeJwt(makeToken(validClaims));
    expect(claims).toMatchObject({ sub: "user-1", family_id: "fam-1", role: "admin" });
  });

  it("returns null for a malformed token", () => {
    expect(decodeJwt("not-a-jwt")).toBeNull();
    expect(decodeJwt("a.b")).toBeNull();
  });

  it("returns null when required claims are missing", () => {
    expect(decodeJwt(makeToken({ sub: "x" }))).toBeNull();
  });
});

describe("isExpired", () => {
  it("is false for a token expiring in an hour", () => {
    expect(isExpired(decodeJwt(makeToken(validClaims))!)).toBe(false);
  });

  it("is true for an already-expired token", () => {
    const claims = decodeJwt(makeToken({ ...validClaims, exp: Math.floor(Date.now() / 1000) - 10 }))!;
    expect(isExpired(claims)).toBe(true);
  });

  it("treats near-expiry within skew as expired (early refresh)", () => {
    const claims = decodeJwt(makeToken({ ...validClaims, exp: Math.floor(Date.now() / 1000) + 10 }))!;
    expect(isExpired(claims, 30)).toBe(true);
  });
});
