import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Data Deletion | ReplyHalo",
  description: "Instructions for requesting deletion of ReplyHalo and Instagram data.",
};

const updated = "September 10, 2026";

export default function DataDeletionPage() {
  return (
    <article className="space-y-10">
      <header className="space-y-3">
        <p className="text-sm font-semibold uppercase tracking-[0.18em] text-muted">
          Legal
        </p>
        <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">
          Data Deletion Instructions
        </h1>
        <p className="text-sm text-muted">Last updated: {updated}</p>
        <p className="max-w-3xl text-base leading-7 text-muted">
          You can disconnect Instagram access at any time and may request deletion
          of personal data associated with ReplyHalo. This page explains the available
          options for customers and Instagram users.
        </p>
      </header>

      <section className="space-y-4">
        <h2 className="text-xl font-semibold">1. Disconnect an Instagram account</h2>
        <div className="space-y-3 leading-7 text-muted">
          <p>
            If you are a ReplyHalo workspace owner or administrator, sign in to
            ReplyHalo, open <strong className="text-foreground">Settings</strong>,
            and disconnect the Instagram account you no longer want ReplyHalo to use.
          </p>
          <p>
            Disconnecting removes the active Instagram connection from the workspace
            and stops ReplyHalo from using that connection for new automation activity.
            You can also revoke the app&apos;s permissions directly in Meta or Instagram
            account settings.
          </p>
          <p>
            Disconnecting an account is not necessarily the same as deleting every
            record associated with the workspace. Certain operational, security,
            webhook, or audit records may need to be retained for a limited period or
            where required by law.
          </p>
        </div>
      </section>

      <section className="space-y-4">
        <h2 className="text-xl font-semibold">2. Request full account/workspace deletion</h2>
        <div className="space-y-3 leading-7 text-muted">
          <p>
            To request deletion of personal data associated with your ReplyHalo
            account or workspace, email {" "}
            <a
              href="mailto:tiktokecom2020@gmail.com?subject=ReplyHalo%20Data%20Deletion%20Request"
              className="text-foreground underline underline-offset-4"
            >
              tiktokecom2020@gmail.com
            </a>
            {" "}with the subject <strong className="text-foreground">ReplyHalo Data Deletion Request</strong>.
          </p>
          <p>Please include only the information needed to identify the account:</p>
          <ul className="list-disc space-y-2 pl-6">
            <li>the email address used to sign in to ReplyHalo;</li>
            <li>the ReplyHalo workspace name, if known;</li>
            <li>the connected Instagram username, if applicable.</li>
          </ul>
          <p>
            Do not send passwords, access tokens, license keys, or other secrets by
            email. We may ask for reasonable verification before processing the request
            so that we do not delete another person&apos;s data without authorization.
          </p>
        </div>
      </section>

      <section className="space-y-4">
        <h2 className="text-xl font-semibold">3. Requests from Instagram users</h2>
        <div className="space-y-3 leading-7 text-muted">
          <p>
            If you interacted with an Instagram account that uses ReplyHalo and want
            data relating to that interaction deleted, you may first contact the owner
            of that Instagram account because that business or creator controls the
            campaign that generated the interaction.
          </p>
          <p>
            You may also contact ReplyHalo directly at {" "}
            <a
              href="mailto:tiktokecom2020@gmail.com?subject=ReplyHalo%20Instagram%20Data%20Deletion%20Request"
              className="text-foreground underline underline-offset-4"
            >
              tiktokecom2020@gmail.com
            </a>
            . Include your Instagram username, the Instagram account you interacted
            with, and an approximate date of the interaction. Do not send your
            Instagram password.
          </p>
        </div>
      </section>

      <section className="space-y-4">
        <h2 className="text-xl font-semibold">4. What happens after a verified request</h2>
        <p className="leading-7 text-muted">
          After a valid request is verified, we will delete or anonymize personal data
          that is no longer required to provide the service, protect the platform,
          resolve disputes, enforce agreements, or satisfy legal obligations. Where a
          record cannot immediately be deleted for a legitimate reason, access to it
          will be limited and it will be removed when the applicable retention need
          ends.
        </p>
      </section>

      <section className="space-y-4">
        <h2 className="text-xl font-semibold">5. Meta and Instagram permissions</h2>
        <p className="leading-7 text-muted">
          Revoking ReplyHalo&apos;s permissions in Meta or Instagram prevents future
          access through those permissions. Meta and Instagram may retain information
          under their own policies independently of ReplyHalo. Requests concerning
          data held directly by Meta or Instagram should be directed to those
          platforms.
        </p>
      </section>

      <section className="rounded border border-border bg-surface/60 p-6">
        <h2 className="text-xl font-semibold">Deletion contact</h2>
        <p className="mt-3 leading-7 text-muted">
          Email: {" "}
          <a
            href="mailto:tiktokecom2020@gmail.com?subject=ReplyHalo%20Data%20Deletion%20Request"
            className="text-foreground underline underline-offset-4"
          >
            tiktokecom2020@gmail.com
          </a>
        </p>
        <p className="mt-2 text-sm text-muted">
          Please never include passwords, access tokens, app secrets, or license keys.
        </p>
      </section>
    </article>
  );
}
