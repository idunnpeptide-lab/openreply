import type { Metadata } from "next";
import LegalShell from "@/components/legal-shell";

export const metadata: Metadata = {
  title: "Privacy Policy - ReplyHalo",
  description:
    "How ReplyHalo handles account, Instagram, campaign, webhook, messaging, analytics, and security data.",
};

export default function PrivacyPage() {
  return (
    <LegalShell
      title="Privacy Policy"
      description="This Privacy Policy explains how ReplyHalo processes personal data when customers use the service and when Instagram users interact with accounts connected to ReplyHalo."
      updatedAt="September 10, 2026"
    >
      <section>
        <h2 className="text-xl font-bold text-white">Who We Are</h2>
        <p className="mt-3">
          ReplyHalo is an Instagram automation service operated by the ReplyHalo
          service operator. For privacy questions, access requests, or deletion
          requests, contact tiktokecom2020@gmail.com.
        </p>
      </section>

      <section>
        <h2 className="text-xl font-bold text-white">Data We Process</h2>
        <p className="mt-3">
          Depending on how the service is used, ReplyHalo may process account
          details such as name and email address; authentication and workspace
          membership data; connected Instagram account identifiers, usernames,
          display names, encrypted access credentials, connection status, and
          account-level statistics; campaign settings and message templates;
          comment IDs, comment text, commenter IDs and usernames, media IDs,
          message, read, and postback events; webhook payloads; delivery and
          automation logs; follower snapshots; tracked-link clicks; hashed IP
          representations where available; user-agent and referrer data; license
          metadata; and operational or security diagnostics.
        </p>
      </section>

      <section>
        <h2 className="text-xl font-bold text-white">How We Use Data</h2>
        <p className="mt-3">
          We use data to authenticate users, operate workspaces, connect
          customer-authorized Instagram Professional accounts, detect configured
          comment or message triggers, send customer-defined public replies,
          private messages, links, and follow-ups, display analytics, prevent
          duplicate sends, troubleshoot failures, enforce service limits, protect
          the platform, and comply with applicable legal and platform obligations.
        </p>
      </section>

      <section>
        <h2 className="text-xl font-bold text-white">Instagram And Meta Data</h2>
        <p className="mt-3">
          ReplyHalo accesses Meta Platform Data only after an authorized customer
          connects an eligible Instagram account through Meta&apos;s official
          authorization flow and grants the permissions shown by Meta. We use this
          data only to provide the features requested by that customer, including
          comment management, messaging automation, account insights, webhook
          processing, and related diagnostics. ReplyHalo does not ask for Instagram
          passwords, scrape Instagram, sell Meta Platform Data, or use that data to
          create unrelated advertising profiles.
        </p>
      </section>

      <section>
        <h2 className="text-xl font-bold text-white">Legal Bases</h2>
        <p className="mt-3">
          Where the GDPR or similar law applies, processing may be based on
          performance of a contract, legitimate interests in operating and securing
          the service, compliance with legal obligations, or consent where consent
          is required. For Instagram interaction data processed on behalf of a
          customer, the customer is typically responsible for deciding why the data
          is processed and ReplyHalo processes it to provide the configured service.
        </p>
      </section>

      <section>
        <h2 className="text-xl font-bold text-white">Service Providers</h2>
        <p className="mt-3">
          ReplyHalo may use hosting, database, queue, email-delivery, analytics,
          monitoring, and security providers to operate the service. Current
          infrastructure may include services such as Railway, PostgreSQL, Redis,
          and Resend. Providers receive only the data reasonably necessary to
          perform their services and are subject to their own contractual and legal
          obligations. Meta and Instagram also process information under their own
          terms and privacy policies.
        </p>
      </section>

      <section>
        <h2 className="text-xl font-bold text-white">Security</h2>
        <p className="mt-3">
          ReplyHalo uses technical and organizational safeguards designed to protect
          service data, including access controls, encrypted storage of connected
          Instagram access credentials, webhook-signature verification,
          service-to-service request authentication, rate limiting, and operational
          logging. No online system can guarantee absolute security, so customers
          should also protect their email, Meta, Instagram, and ReplyHalo accounts.
        </p>
      </section>

      <section>
        <h2 className="text-xl font-bold text-white">Retention</h2>
        <p className="mt-3">
          We retain personal data only for as long as reasonably necessary to
          provide the service, maintain security and audit records, resolve disputes,
          and satisfy legal obligations. Different data categories may have
          different retention periods. Disconnecting Instagram stops ongoing account
          processing, but certain operational, webhook, billing, fraud-prevention,
          or security records may be retained where reasonably necessary or legally
          required.
        </p>
      </section>

      <section>
        <h2 className="text-xl font-bold text-white">Your Choices And Rights</h2>
        <p className="mt-3">
          Customers may disconnect Instagram from ReplyHalo and may revoke app
          permissions through Meta or Instagram settings. Where applicable, users
          may request access, correction, deletion, restriction, portability, or
          object to certain processing. Deletion instructions are available at
          /data-deletion.
        </p>
      </section>

      <section>
        <h2 className="text-xl font-bold text-white">International Processing</h2>
        <p className="mt-3">
          ReplyHalo and its service providers may process data in countries other
          than the country where a user is located. Where required, appropriate
          safeguards are used for international transfers.
        </p>
      </section>

      <section>
        <h2 className="text-xl font-bold text-white">Children</h2>
        <p className="mt-3">
          ReplyHalo is a business automation service and is not intended for use by
          children. Customers must not knowingly use the service to collect or
          process children&apos;s data in violation of applicable law or platform
          rules.
        </p>
      </section>

      <section>
        <h2 className="text-xl font-bold text-white">Changes And Contact</h2>
        <p className="mt-3">
          We may update this Privacy Policy as the product, law, or platform
          requirements change. The revision date above identifies the latest
          version. For privacy and data requests, contact
          tiktokecom2020@gmail.com.
        </p>
      </section>
    </LegalShell>
  );
}
