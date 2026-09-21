import { describe, expect, it } from "vitest";
import { getAuthEmailConfig } from "../lib/auth-email-config";

describe("auth email configuration", () => {
  it("requires an explicit non-placeholder sender", () => {
    expect(() => getAuthEmailConfig({ RESEND_API_KEY: "re_test" })).toThrow(
      "EMAIL_FROM environment variable is required"
    );

    expect(() =>
      getAuthEmailConfig({
        RESEND_API_KEY: "re_test",
        EMAIL_FROM: "ReplyHalo <login@example.com>",
      })
    ).toThrow("EMAIL_FROM must use a real sender domain");
  });

  it("requires Resend credentials when SMTP is not configured", () => {
    expect(() =>
      getAuthEmailConfig({
        EMAIL_FROM: "ReplyHalo <login@auth.replyhalo.test>",
      })
    ).toThrow("RESEND_API_KEY environment variable is required");

    const config = getAuthEmailConfig({
      EMAIL_FROM: "ReplyHalo <login@auth.replyhalo.test>",
      RESEND_API_KEY: "re_test",
    });

    expect(config).toMatchObject({
      providerId: "resend",
      transport: "resend",
      from: "ReplyHalo <login@auth.replyhalo.test>",
      senderDomain: "auth.replyhalo.test",
      apiKey: "re_test",
    });
  });

  it("uses SMTP without requiring a Resend key", () => {
    const config = getAuthEmailConfig({
      EMAIL_FROM: "ReplyHalo <login@auth.replyhalo.test>",
      EMAIL_SERVER: "smtps://user:pass@mail.replyhalo.test:465",
    });

    expect(config).toMatchObject({
      providerId: "nodemailer",
      transport: "smtp",
      senderDomain: "auth.replyhalo.test",
      server: "smtps://user:pass@mail.replyhalo.test:465",
    });
  });

  it("rejects malformed SMTP configuration", () => {
    expect(() =>
      getAuthEmailConfig({
        EMAIL_FROM: "ReplyHalo <login@auth.replyhalo.test>",
        EMAIL_SERVER: "https://mail.replyhalo.test",
      })
    ).toThrow("EMAIL_SERVER must be a valid smtp:// or smtps:// URL");
  });
});
