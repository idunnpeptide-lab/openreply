import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Privacy Policy | ReplyHalo",
  description: "Privacy Policy for ReplyHalo Instagram automation services.",
};

const updated = "September 10, 2026";

export default function PrivacyPage() {
  return (
    <article className="space-y-10">
      <header className="space-y-3">
        <p className="text-sm font-semibold uppercase tracking-[0.18em] text-muted">
          Legal
        </p>
        <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">
          Privacy Policy
        </h1>
        <p className="text-sm text-muted">Last updated: {updated}</p>
        <p className="max-w-3xl text-base leading-7 text-muted">
          This Privacy Policy explains how ReplyHalo processes personal data when
          customers use our Instagram automation service and when Instagram users
          interact with accounts connected to ReplyHalo.
        </p>
      </header>

      <section className="space-y-4">
        <h2 className="text-xl font-semibold">1. Who we are</h2>
        <p className="leading-7 text-muted">
          ReplyHalo is an Instagram automation service operated by the ReplyHalo
          service operator. For privacy questions, data access requests, or
          deletion requests, contact {" "}
          <a
            className="text-foreground underline underline-offset-4"
            href="mailto:tiktokecom2020@gmail.com"
          >
            tiktokecom2020@gmail.com
          </a>
          .
        </p>
      </section>

      <section className="space-y-4">
        <h2 className="text-xl font-semibold">2. Data we process</h2>
        <div className="space-y-3 leading-7 text-muted">
          <p>Depending on how the service is used, ReplyHalo may process:</p>
          <ul className="list-disc space-y-2 pl-6">
            <li>
              Account data such as name, email address, authentication session
              information, workspace membership, and invitations.
            </li>
            <li>
              Connected Instagram account information such as Instagram account
              ID, username, display name, access credentials, connection status,
              and account-level statistics made available through Meta APIs.
            </li>
            <li>
              Instagram interaction data needed to run automations, including
              comment IDs, comment text, commenter IDs/usernames, media IDs,
              message events, read/postback events, and related webhook payloads.
            </li>
            <li>
              Automation configuration, campaign keywords, message templates,
              public-reply settings, follow-up settings, and delivery logs.
            </li>
            <li>
              Link analytics such as click time, a hashed representation of an IP
              address where available, user agent, and referrer.
            </li>
            <li>
              Operational and security information such as webhook status,
              application events, error details, queue health, and security logs.
            </li>
            <li>
              Licensing information required to authorize a customer workspace.
              License keys are protected rather than displayed as plaintext in the
              product interface.
            </li>
          </ul>
        </div>
      </section>

      <section className="space-y-4">
        <h2 className="text-xl font-semibold">3. How we use data</h2>
        <ul className="list-disc space-y-2 pl-6 leading-7 text-muted">
          <li>Provide, operate, authenticate, and secure the ReplyHalo service.</li>
          <li>
            Connect customer-authorized Instagram Professional accounts through
            Meta&apos;s official APIs.
          </li>
          <li>
            Detect configured comment or message triggers and send customer-defined
            replies, private messages, links, and follow-ups.
          </li>
          <li>
            Display campaign performance, message delivery status, click metrics,
            and diagnostics to authorized workspace members.
          </li>
          <li>
            Prevent abuse, investigate failures, protect accounts, and maintain
            service reliability.
          </li>
          <li>Comply with applicable legal and platform obligations.</li>
        </ul>
      </section>

      <section className="space-y-4">
        <h2 className="text-xl font-semibold">4. Meta and Instagram data</h2>
        <div className="space-y-3 leading-7 text-muted">
          <p>
            ReplyHalo accesses Meta Platform Data only after an authorized customer
            connects an eligible Instagram account and grants the permissions shown
            by Meta during the connection flow.
          </p>
          <p>
            We use that data only to provide the features requested by the customer,
            such as comment management, messaging automation, account insights,
            webhook processing, and related diagnostics. We do not sell Meta
            Platform Data or use it for unrelated advertising profiles.
          </p>
          <p>
            Customers are responsible for ensuring that their own use of ReplyHalo,
            including their message content and targeting, complies with Meta&apos;s
            terms, Instagram&apos;s rules, privacy law, and other applicable law.
          </p>
        </div>
      </section>

      <section className="space-y-4">
        <h2 className="text-xl font-semibold">5. Legal bases</h2>
        <p className="leading-7 text-muted">
          Where the GDPR or similar law applies, ReplyHalo may rely on performance
          of a contract to provide the service, legitimate interests in operating
          and securing the service, compliance with legal obligations, and consent
          where consent is required. For Instagram interaction data processed on
          behalf of a customer, the customer is typically responsible for deciding
          why the interaction data is processed, while ReplyHalo processes it to
          provide the requested automation service.
        </p>
      </section>

      <section className="space-y-4">
        <h2 className="text-xl font-semibold">6. Service providers</h2>
        <p className="leading-7 text-muted">
          We may use infrastructure, database, queue, email-delivery, analytics,
          monitoring, and security providers to operate ReplyHalo. These providers
          receive only the data reasonably necessary to perform their services and
          are subject to their own contractual and legal obligations. Meta and
          Instagram process data independently under their own terms and privacy
          policies when users interact with their platforms.
        </p>
      </section>

      <section className="space-y-4">
        <h2 className="text-xl font-semibold">7. Data security</h2>
        <p className="leading-7 text-muted">
          ReplyHalo uses technical and organizational safeguards designed to protect
          service data, including access controls, encrypted storage of connected
          account access credentials, webhook-signature verification, service-to-
          service request authentication, rate limiting, and operational logging.
          No system can guarantee absolute security, so customers should also use
          strong account security and promptly revoke access they no longer need.
        </p>
      </section>

      <section className="space-y-4">
        <h2 className="text-xl font-semibold">8. Retention</h2>
        <p className="leading-7 text-muted">
          We retain personal data only for as long as reasonably necessary to
          provide the service, maintain security and audit records, resolve disputes,
          and satisfy legal obligations. Different categories of data may have
          different retention periods. Disconnecting an Instagram account stops
          ongoing account processing, but certain security, webhook, billing, or
          audit records may be retained where reasonably necessary or legally
          required.
        </p>
      </section>

      <section className="space-y-4">
        <h2 className="text-xl font-semibold">9. Your choices and rights</h2>
        <ul className="list-disc space-y-2 pl-6 leading-7 text-muted">
          <li>You may disconnect a connected Instagram account from ReplyHalo.</li>
          <li>You may revoke app permissions through Meta or Instagram settings.</li>
          <li>
            Where applicable, you may request access, correction, deletion,
            restriction, portability, or object to certain processing.
          </li>
          <li>
            You may submit a deletion request using the instructions on our {" "}
            <a
              href="/data-deletion"
              className="text-foreground underline underline-offset-4"
            >
              Data Deletion page
            </a>
            .
          </li>
        </ul>
      </section>

      <section className="space-y-4">
        <h2 className="text-xl font-semibold">10. International processing</h2>
        <p className="leading-7 text-muted">
          ReplyHalo and its service providers may process data in countries other
          than the country where a user is located. Where required, we use
          appropriate safeguards for international transfers and expect providers
          to comply with applicable transfer requirements.
        </p>
      </section>

      <section className="space-y-4">
        <h2 className="text-xl font-semibold">11. Children</h2>
        <p className="leading-7 text-muted">
          ReplyHalo is a business automation service and is not intended for use by
          children. Customers must not knowingly use the service to collect or
          process children&apos;s data in violation of applicable law or platform
          rules.
        </p>
      </section>

      <section className="space-y-4">
        <h2 className="text-xl font-semibold">12. Changes to this policy</h2>
        <p className="leading-7 text-muted">
          We may update this Privacy Policy as the product, law, or platform
          requirements change. The date at the top identifies the latest revision.
          Material changes may be communicated through the service or other
          reasonable means.
        </p>
      </section>

      <section className="rounded border border-border bg-surface/60 p-6">
        <h2 className="text-xl font-semibold">Contact</h2>
        <p className="mt-3 leading-7 text-muted">
          Privacy and data requests: {" "}
          <a
            href="mailto:tiktokecom2020@gmail.com"
            className="text-foreground underline underline-offset-4"
          >
            tiktokecom2020@gmail.com
          </a>
        </p>
      </section>
    </article>
  );
}
