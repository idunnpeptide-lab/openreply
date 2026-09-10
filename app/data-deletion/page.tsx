import type { Metadata } from "next";
import LegalShell from "@/components/legal-shell";

export const metadata: Metadata = {
  title: "Data Deletion - ReplyHalo",
  description:
    "How ReplyHalo customers and Instagram users can disconnect accounts and request deletion of personal data.",
};

export default function DataDeletionPage() {
  return (
    <LegalShell
      title="Data Deletion"
      description="Use this page to disconnect Instagram access or request deletion of personal data associated with ReplyHalo."
      updatedAt="September 10, 2026"
    >
      <section>
        <h2 className="text-xl font-bold text-white">Disconnect Instagram</h2>
        <p className="mt-3">
          If you are a ReplyHalo workspace owner or administrator, sign in to
          ReplyHalo, open Settings, and disconnect the Instagram account you no
          longer want ReplyHalo to use. Disconnecting removes the active Instagram
          connection from the workspace and stops new automation activity through
          that connection. You may also revoke the app&apos;s permissions directly in
          Meta or Instagram settings.
        </p>
      </section>

      <section>
        <h2 className="text-xl font-bold text-white">Request Full Account Or Workspace Deletion</h2>
        <p className="mt-3">
          To request deletion of personal data associated with your ReplyHalo account
          or workspace, email tiktokecom2020@gmail.com with the subject ReplyHalo Data
          Deletion Request. Include only the information needed to identify the
          account: the email address used to sign in, the workspace name if known,
          and the connected Instagram username if applicable.
        </p>
      </section>

      <section>
        <h2 className="text-xl font-bold text-white">Requests From Instagram Users</h2>
        <p className="mt-3">
          If you interacted with an Instagram account that uses ReplyHalo and want
          data relating to that interaction deleted, you may contact the owner of the
          Instagram account because that business or creator controls the campaign.
          You may also contact ReplyHalo directly at tiktokecom2020@gmail.com and
          include your Instagram username, the Instagram account you interacted with,
          and an approximate date of the interaction.
        </p>
      </section>

      <section>
        <h2 className="text-xl font-bold text-white">Verification And Security</h2>
        <p className="mt-3">
          We may ask for reasonable verification before processing a deletion request
          so that we do not delete another person&apos;s data without authorization. Do
          not send passwords, Instagram access tokens, Meta app secrets, license
          keys, or other secrets by email.
        </p>
      </section>

      <section>
        <h2 className="text-xl font-bold text-white">What Happens After A Verified Request</h2>
        <p className="mt-3">
          After a valid request is verified, personal data that is no longer required
          to provide the service, protect the platform, resolve disputes, enforce
          agreements, prevent fraud, or satisfy legal obligations will be deleted or
          anonymized as appropriate. Some operational, webhook, billing, security, or
          audit records may need to be retained for a limited period where reasonably
          necessary or legally required.
        </p>
      </section>

      <section>
        <h2 className="text-xl font-bold text-white">Meta And Instagram Data</h2>
        <p className="mt-3">
          Revoking ReplyHalo&apos;s permissions in Meta or Instagram prevents future
          access through those permissions. Meta and Instagram may retain information
          under their own policies independently of ReplyHalo. Requests concerning
          data held directly by Meta or Instagram should be directed to those
          platforms.
        </p>
      </section>

      <section>
        <h2 className="text-xl font-bold text-white">Deletion Contact</h2>
        <p className="mt-3">
          Email tiktokecom2020@gmail.com with the subject ReplyHalo Data Deletion
          Request. Please never include passwords, access tokens, app secrets, or
          license keys.
        </p>
      </section>
    </LegalShell>
  );
}
