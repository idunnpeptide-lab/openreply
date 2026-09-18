# ReplyHalo TikTok Business Messaging rollout

This document records the constraints the product must enforce when TikTok is enabled. It is intentionally stricter than the Instagram flow: ReplyHalo must use TikTok's official Business Messaging API and must not fill API gaps with scraping or browser automation.

## Two different DM paths

### Existing conversation messaging

For a normal direct message, TikTok requires an existing conversation. ReplyHalo can:

1. list `STRANGER` or `SINGLE` conversations with `/business/message/conversation/list/`;
2. read the conversation with `/business/message/content/list/`;
3. send into that conversation with `/business/message/send/` using `recipient_type=CONVERSATION`.

This supports a safe TikTok funnel such as:

`public comment reply -> ask the user to DM a keyword -> inbound DM -> ReplyHalo keyword automation -> response in the existing conversation`.

It must not be represented in the product as permission to cold-DM any commenter.

## Comment-to-Message is a separate, account-dependent feature

TikTok also exposes Comment-to-Message through the Business Messaging `direct_reply` feature. ReplyHalo must check `/business/message/direct_reply/get/` and persist the result before attempting a direct reply to a comment.

Current TikTok Business Messaging documentation states that Comment-to-Message is only available to Business Accounts registered in Vietnam, Indonesia, and Thailand. TikTok also applies additional comment/user/time-window eligibility rules to each direct reply. These restrictions are server-side policy and can change independently of ReplyHalo.

Because most ReplyHalo customers may operate accounts outside those markets, Comment-to-Message must be treated as an optional capability, never as the default TikTok comment automation path.

ReplyHalo must **not** automatically call `/business/message/direct_reply/update/` to enable this setting. Enabling a platform account feature is an explicit account-level action and should only be exposed once the product has a clear user-facing flow and the connected account is eligible.

## Permissions

ReplyHalo's OAuth foundation requests the relevant Business Messaging permissions, but runtime calls still fail closed by checking granted scopes:

- `message.list.read` for conversations, messages, and direct-reply settings;
- `message.list.send` for sends;
- comment permissions remain independent (`comment.list`, `comment.list.manage`).

The database `messagingEnabled` flag means both read and send scopes were granted. Runtime code checks the exact scope needed by each call rather than relying only on that aggregate flag.

## Message limits

TikTok text messages support up to 6,000 characters. ReplyHalo validates this before making an API call.

Normal sends target an existing `conversation_id`. Comment-to-Message sends instead use:

```json
{
  "business_id": "<open_id>",
  "message_type": "TEXT",
  "text": { "body": "..." },
  "direct_reply": {
    "reply_type": "COMMENT_REPLY",
    "comment_reply": { "comment_id": "..." }
  }
}
```

## Rollout gates

Do not expose TikTok messaging in production UI until all of these are true:

1. ReplyHalo's TikTok for Business developer app exists and is approved for the needed permissions.
2. OAuth connect/callback has been tested with a dedicated test Business Account.
3. Token refresh has been observed working after a short-term token expires.
4. Conversation read/send has been tested inside TikTok's allowed messaging window.
5. Webhook verification and idempotent message event processing are implemented.
6. The UI distinguishes normal DM-keyword automation from region-limited Comment-to-Message.
7. Instagram regression QA remains green.
