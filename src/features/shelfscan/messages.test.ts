import { describe, expect, it } from "vitest";

import { reasonMessageKey } from "./messages";

describe("reasonMessageKey", () => {
  it("points a misconfigured model at the admin-fix message", () => {
    expect(reasonMessageKey("unsupported", "shelfScan")).toBe("books.shelfScan.unsupportedModel");
    expect(reasonMessageKey("unsupported", "shelfAudit")).toBe("books.shelfAudit.unsupportedModel");
  });

  it("maps a disabled module to the not-configured message", () => {
    expect(reasonMessageKey("disabled", "shelfScan")).toBe("books.shelfScan.notConfigured");
  });

  it("falls back to the retry message for transient errors", () => {
    expect(reasonMessageKey("error", "shelfScan")).toBe("books.shelfScan.unavailable");
    expect(reasonMessageKey("ok", "shelfAudit")).toBe("books.shelfAudit.unavailable");
  });
});
