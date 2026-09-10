import type { Metadata } from "next";
import LegalShell from "@/components/legal-shell";

export const metadata: Metadata = {
  title: "Terms of Service - ReplyHalo",
  description:
    "Terms for using ReplyHalo Instagram automation, messaging, analytics, and workspace features.",
};

export default function TermsPage() {
  return (
    <LegalShell
      title="Terms of Service"
      description="These Terms govern access to and use of ReplyHalo, including Instagram automation, messaging, analytics, workspace, and licensing features."
      updatedAt="September 10, 2026"
    >
      <section>
        <h2 className="text-xl font-bold text-white">The Service</h2>
        <p className="mt-3">
          ReplyHalo provides tools for Instagram automation, including comment
          triggers, public replies, private messages, tracked links, follow-up
          messages, analytics, workspace collaboration, and related operational
          features. Availability may depend on Meta, Instagram, account eligibility,
          granted permissions, plan limits, and technical conditions outside
          ReplyHalo&apos;s control.
        </p>
      </section>

      <section>
        <h2 className="text-xl font-bold text-white">Eligibility And Account Security</h2>
        <p className="mt-3">
          You must be legally able to enter into a binding agreement and must have
          authority to connect every social account or workspace you use. You are
          responsible for safeguarding your login methods, email account,
          Meta/Instagram credentials, and workspace access, and for removing access
          from people who should no longer be workspace members.
        </p>
      </section>

      <section>
        <h2 className="text-xl font-bold text-white">Authorized And Acceptable Use</h2>
        <p className="mt-3">
          You may use ReplyHalo only with Instagram Professional accounts you own or
          are authorized to manage. You may not use ReplyHalo to send unlawful,
          deceptive, abusive, harassing, fraudulent, or spam messages; bypass Meta
          messaging restrictions; misuse personal data; probe or attack the service
          without written authorization; introduce malicious code; share restricted
          credentials; evade license limits; or violate applicable law or platform
          rules.
        </p>
      </section>

      <section>
        <h2 className="text-xl font-bold text-white">Meta And Instagram</h2>
        <p className="mt-3">
          ReplyHalo is an independent service and is not Meta or Instagram. Your use
          of Instagram remains subject to Meta&apos;s and Instagram&apos;s own terms,
          permissions, messaging windows, rate limits, app-review requirements, and
          technical rules. You authorize ReplyHalo to use permissions granted through
          the official Meta/Instagram authorization flow only for features you
          configure in ReplyHalo.
        </p>
      </section>

      <section>
        <h2 className="text-xl font-bold text-white">Your Content And Campaigns</h2>
        <p className="mt-3">
          You remain responsible for campaign text, keywords, URLs, public replies,
          direct messages, offers, and other material you configure. You represent
          that you have the rights and lawful basis needed to use that material and
          communicate with the people your automations reach.
        </p>
      </section>

      <section>
        <h2 className="text-xl font-bold text-white">Licenses, Plans And Limits</h2>
        <p className="mt-3">
          Some deployments or features may require a valid ReplyHalo or DM Magnet
          license. Plans may impose limits on connected social accounts, usage,
          seats, or other functionality. Attempts to bypass technical or contractual
          limits may result in suspension or termination.
        </p>
      </section>

      <section>
        <h2 className="text-xl font-bold text-white">Availability And Changes</h2>
        <p className="mt-3">
          ReplyHalo depends on third-party platforms and infrastructure. We aim to
          operate the service reliably but do not guarantee uninterrupted
          availability or that Meta will continue supporting any specific API,
          permission, or messaging behavior. Features may be changed, suspended, or
          discontinued where reasonably necessary for security, legal compliance,
          platform changes, maintenance, or product development.
        </p>
      </section>

      <section>
        <h2 className="text-xl font-bold text-white">Suspension And Termination</h2>
        <p className="mt-3">
          Access may be restricted or suspended where reasonably necessary to protect
          users, the service, platform integrations, or third parties; investigate
          abuse; enforce plan limits; or comply with law or platform requirements.
          You may stop using ReplyHalo and disconnect Instagram at any time.
        </p>
      </section>

      <section>
        <h2 className="text-xl font-bold text-white">Intellectual Property</h2>
        <p className="mt-3">
          ReplyHalo branding, product design, hosted-service configuration,
          documentation, and related materials are protected by applicable
          intellectual-property law except for third-party or open-source components
          governed by their own licenses. These Terms do not transfer ownership of
          ReplyHalo technology to you.
        </p>
      </section>

      <section>
        <h2 className="text-xl font-bold text-white">Disclaimers</h2>
        <p className="mt-3">
          ReplyHalo is provided on an &quot;as available&quot; basis to the extent permitted
          by law. Automation results depend on configuration, Instagram account
          status, Meta platform behavior, permissions, messaging windows, recipient
          eligibility, and other factors. We do not guarantee delivery, conversion,
          revenue, audience growth, or any specific business result.
        </p>
      </section>

      <section>
        <h2 className="text-xl font-bold text-white">Limitation Of Liability</h2>
        <p className="mt-3">
          To the maximum extent permitted by applicable law, the ReplyHalo service
          operator will not be liable for indirect, incidental, special,
          consequential, or punitive damages, or for lost profits, revenue, data,
          goodwill, or business opportunities arising from use of or inability to
          use ReplyHalo. Nothing here excludes liability that cannot lawfully be
          excluded.
        </p>
      </section>

      <section>
        <h2 className="text-xl font-bold text-white">Privacy And Data Deletion</h2>
        <p className="mt-3">
          Personal-data processing is described at /privacy. Instructions for
          disconnecting Instagram and requesting deletion are available at
          /data-deletion. You are responsible for providing any notices and obtaining
          any consent required for your own campaigns and customer communications.
        </p>
      </section>

      <section>
        <h2 className="text-xl font-bold text-white">Changes And Contact</h2>
        <p className="mt-3">
          We may update these Terms to reflect product, legal, security, or platform
          changes. The revision date above identifies the latest version. Questions
          about these Terms may be sent to tiktokecom2020@gmail.com.
        </p>
      </section>
    </LegalShell>
  );
}
