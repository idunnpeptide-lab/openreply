import { describe, expect, it } from "vitest";
import {
  automationMutationCustomerError,
  isConnectedInstagramAccount,
  resolveConnectedInstagramAccountId,
} from "../lib/customer-instagram-readiness";

const accounts = [{ id: "ig_1" }, { id: "ig_2" }];

describe("customer Instagram readiness helpers", () => {
  it("recognizes only account IDs present in the connected account list", () => {
    expect(isConnectedInstagramAccount(accounts, "ig_2")).toBe(true);
    expect(isConnectedInstagramAccount(accounts, "disconnected_ig")).toBe(false);
    expect(isConnectedInstagramAccount(accounts, "")).toBe(false);
  });

  it("preserves a connected current account before considering fallbacks", () => {
    expect(resolveConnectedInstagramAccountId(accounts, "ig_2", "ig_1")).toBe(
      "ig_2"
    );
  });

  it("falls back to a connected preferred account and then the first account", () => {
    expect(
      resolveConnectedInstagramAccountId(accounts, "disconnected_ig", "ig_2")
    ).toBe("ig_2");
    expect(
      resolveConnectedInstagramAccountId(accounts, "disconnected_ig", "missing")
    ).toBe("ig_1");
    expect(resolveConnectedInstagramAccountId([], "disconnected_ig", "missing")).toBe(
      ""
    );
  });

  it("maps the reconnect-required server code to customer-safe recovery copy", () => {
    expect(automationMutationCustomerError("INSTAGRAM_RECONNECT_REQUIRED")).toBe(
      "That Instagram account is no longer connected. Reconnect it in Settings before activating this automation."
    );
    expect(automationMutationCustomerError("Invalid input")).toBeNull();
  });
});
