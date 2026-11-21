import { describe, expect, it } from "vitest";
import { parsePostbackEvents } from "./webhook";

const accountId = "17841410136292444";
const userId = "123456789";

describe("parsePostbackEvents", () => {
  it("preserves the working entry.messaging postback shape", () => {
    const events = parsePostbackEvents({
      object: "instagram",
      entry: [{
        id: accountId,
        time: 1,
        messaging: [{
          sender: { id: userId },
          recipient: { id: accountId },
          postback: { payload: "followcheck:automation1", mid: "mid1" },
        }],
      }],
    });
    expect(events).toEqual([{
      instagramAccountId: accountId,
      userId,
      payload: "followcheck:automation1",
      mid: "mid1",
    }]);
  });

  it("handles the documented changes.messaging_postbacks shape", () => {
    const events = parsePostbackEvents({
      object: "instagram",
      entry: [{
        id: accountId,
        time: 1,
        changes: [{
          field: "messaging_postbacks",
          value: {
            sender: { id: userId },
            recipient: { id: accountId },
            postback: {
              payload: "followcheck:automation2",
              mid: "mid2",
              title: "I'm following",
            },
          },
        }],
      }],
    });
    expect(events).toEqual([{
      instagramAccountId: accountId,
      userId,
      payload: "followcheck:automation2",
      mid: "mid2",
    }]);
  });

  it("ignores unrelated events and self-originated postbacks", () => {
    expect(parsePostbackEvents({
      object: "instagram",
      entry: [{
        id: accountId,
        time: 1,
        changes: [
          { field: "comments", value: { id: "c1" } },
          {
            field: "messaging_postbacks",
            value: {
              sender: { id: accountId },
              recipient: { id: accountId },
              postback: { payload: "followcheck:automation1" },
            },
          },
        ],
      }],
    })).toEqual([]);
  });
});
