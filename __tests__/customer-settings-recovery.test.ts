import { describe, expect, it } from "vitest";
import {
  accountLimitRecoveryMessage,
  instagramDisconnectCustomerError,
} from "../lib/customer-settings-recovery";

describe("Settings customer recovery helpers", () => {
  it("explains preserved account slots without claiming local disconnect frees capacity", () => {
    const message = accountLimitRecoveryMessage();

    expect(message).toContain("already-linked account uses its existing slot");
    expect(message).toContain("upgrade");
    expect(message).toContain("controlled migration");
    expect(message.toLowerCase()).not.toContain("disconnect an old account");
  });

  it("treats only an HTTP-successful API success response as a completed disconnect", () => {
    expect(instagramDisconnectCustomerError(true, true)).toBeNull();
    expect(instagramDisconnectCustomerError(false, true)).toBe(
      "ReplyHalo could not disconnect this Instagram account. Nothing was changed. Please try again."
    );
    expect(instagramDisconnectCustomerError(true, false)).toBe(
      "ReplyHalo could not disconnect this Instagram account. Nothing was changed. Please try again."
    );
    expect(instagramDisconnectCustomerError(true, undefined)).toBe(
      "ReplyHalo could not disconnect this Instagram account. Nothing was changed. Please try again."
    );
  });
});
