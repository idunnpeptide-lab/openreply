import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Terms of Service | ReplyHalo",
  description: "Terms of Service for ReplyHalo Instagram automation services.",
};

const updated = "September 10, 2026";

export default function TermsPage() {
  return (
    <article className="space-y-10">
      <header className="space-y-3">
        <p className="text-sm font-semibold uppercase tracking-[0.18em] text-muted">
          Legal
        </p>
        <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">
          Terms of Service
        </h1>
        <p className="text-sm text-muted">Last updated: {updated}</p>
        <p className="max-w-3xl text-base leading-7 text-muted">
          These Terms govern access to and use of ReplyHalo. By creating an
          account, connecting an Instagram account, or using the service, you agree
          to these Terms.
        </p>
      </header>

      <section className="space-y-4">
        <h2 className="text-xl font-semibold">1. The service</h2>
        <p className="leading-7 text-muted">
          ReplyHalo provides tools for Instagram automation, including comment
          triggers, public replies, private messages, tracked links, follow-up
          messages, analytics, workspace collaboration, and related operational
          features. Availability of any feature may depend on Meta, Instagram,
          account eligibility, granted permissions, plan limits, and technical
          conditions outside ReplyHalo&apos;s control.
        </p>
      </section>

      <section className="space-y-4">
        <h2 className="text-xl font-semibold">2. Eligibility and account security</h2>
        <ul className="list-disc space-y-2 pl-6 leading-7 text-muted">
          <li>
            You must be legally able to enter into a binding agreement and have
            authority to connect every social account or workspace you use.
          </li>
          <li>
            You are responsible for safeguarding your login methods, email account,
            Meta/Instagram credentials, and workspace access.
          </li>
          <li>
            You must provide accurate information and promptly remove access for
            people who should no longer be members of your workspace.
          </li>
        </ul>
      </section>

      <section className="space-y-4">
        <h2 className="text-xl font-semibold">3. Acceptable use</h2>
        <p className="leading-7 text-muted">You may not use ReplyHalo to:</p>
        <ul className="list-disc space-y-2 pl-6 leading-7 text-muted">
          <li>send unlawful, deceptive, abusive, harassing, or fraudulent messages;</li>
          <li>
            spam users, bypass platform messaging restrictions, or automate conduct
            that violates Meta or Instagram rules;
          </li>
          <li>
            collect, infer, sell, or misuse personal data in a way that violates
            privacy law, platform terms, or a person&apos;s rights;
          </li>
          <li>
            interfere with the service, probe for vulnerabilities without written
            authorization, introduce malicious code, or attempt unauthorized access;
          </li>
          <li>
            resell access, share restricted credentials, evade license limits, or
            use another customer&apos;s license without authorization;
          </li>
          <li>use ReplyHalo for any activity prohibited by applicable law.</li>
        </ul>
      </section>

      <section className="space-y-4">
        <h2 className="text-xl font-semibold">4. Meta and Instagram</h2>
        <div className="space-y-3 leading-7 text-muted">
          <p>
            ReplyHalo is an independent service and is not Meta or Instagram. Your
            use of Instagram remains subject to Meta&apos;s and Instagram&apos;s own
            terms, policies, permissions, messaging windows, rate limits, app-review
            requirements, and technical rules.
          </p>
          <p>
            You authorize ReplyHalo to use the permissions you grant through the
            official Meta/Instagram authorization flow only for the features you
            configure in ReplyHalo.
          </p>
        </div>
      </section>

      <section className="space-y-4">
        <h2 className="text-xl font-semibold">5. Your content and automations</h2>
        <p className="leading-7 text-muted">
          You retain responsibility for campaign text, keywords, URLs, public
          replies, direct messages, offers, and other material you configure. You
          represent that you have the rights and lawful basis needed to use that
          material and to communicate with the people your automations reach.
        </p>
      </section>

      <section className="space-y-4">
        <h2 className="text-xl font-semibold">6. Licenses, plans, and limits</h2>
        <p className="leading-7 text-muted">
          Access to some deployments or features may require a valid ReplyHalo or
          DM Magnet license. Plans may impose limits on connected social accounts,
          usage, seats, or other functionality. Attempts to bypass technical or
          contractual limits may result in suspension or termination.
        </p>
      </section>

      <section className="space-y-4">
        <h2 className="text-xl font-semibold">7. Service changes and availability</h2>
        <p className="leading-7 text-muted">
          We may improve, modify, suspend, or discontinue features when reasonably
          necessary for security, legal compliance, platform changes, maintenance,
          or product development. We aim to operate the service reliably, but we do
          not guarantee uninterrupted availability or that third-party platforms
          will continue supporting any particular API or permission.
        </p>
      </section>

      <section className="space-y-4">
        <h2 className="text-xl font-semibold">8. Suspension and termination</h2>
        <p className="leading-7 text-muted">
          We may restrict or suspend access where reasonably necessary to protect
          users, the service, platform integrations, or third parties; to investigate
          abuse; or to comply with law or platform requirements. You may stop using
          the service and disconnect your Instagram account at any time. Data
          deletion requests are handled as described on the {" "}
          <a
            href="/data-deletion"
            className="text-foreground underline underline-offset-4"
          >
            Data Deletion page
          </a>
          .
        </p>
      </section>

      <section className="space-y-4">
        <h2 className="text-xl font-semibold">9. Intellectual property</h2>
        <p className="leading-7 text-muted">
          ReplyHalo, its product design, software, documentation, branding, and
          related materials are protected by applicable intellectual-property law
          except for third-party or open-source components governed by their own
          licenses. These Terms do not transfer ownership of ReplyHalo technology to
          you.
        </p>
      </section>

      <section className="space-y-4">
        <h2 className="text-xl font-semibold">10. Disclaimers</h2>
        <p className="leading-7 text-muted">
          ReplyHalo is provided on an "as available" basis to the extent permitted
          by law. Automation results depend on your configuration, Instagram account
          status, Meta platform behavior, recipient eligibility, permissions,
          messaging windows, and other factors. We do not guarantee delivery,
          conversion, revenue, audience growth, or any specific business result.
        </p>
      </section>

      <section className="space-y-4">
        <h2 className="text-xl font-semibold">11. Limitation of liability</h2>
        <p className="leading-7 text-muted">
          To the maximum extent permitted by applicable law, the ReplyHalo service
          operator will not be liable for indirect, incidental, special,
          consequential, or punitive damages, or for lost profits, revenue, data,
          goodwill, or business opportunities arising from use of or inability to
          use ReplyHalo. Nothing in these Terms excludes liability that cannot
          lawfully be excluded.
        </p>
      </section>

      <section className="space-y-4">
        <h2 className="text-xl font-semibold">12. Privacy</h2>
        <p className="leading-7 text-muted">
          Our processing of personal data is described in the {" "}
          <a href="/privacy" className="text-foreground underline underline-offset-4">
            Privacy Policy
          </a>
          . You are responsible for providing any notices and obtaining any consent
          required for your own campaigns and customer communications.
        </p>
      </section>

      <section className="space-y-4">
        <h2 className="text-xl font-semibold">13. Changes to these Terms</h2>
        <p className="leading-7 text-muted">
          We may update these Terms to reflect product, legal, security, or platform
          changes. The latest revision date appears at the top. Continued use after
          an updated version becomes effective constitutes acceptance to the extent
          permitted by law.
        </p>
      </section>

      <section className="space-y-4">
        <h2 className="text-xl font-semibold">14. Contact</h2>
        <p className="leading-7 text-muted">
          Questions about these Terms may be sent to {" "}
          <a
            href="mailto:tiktokecom2020@gmail.com"
            className="text-foreground underline underline-offset-4"
          >
            tiktokecom2020@gmail.com
          </a>
          .
        </p>
      </section>
    </article>
  );
}
