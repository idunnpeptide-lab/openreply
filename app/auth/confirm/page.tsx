import Link from "next/link";
import { redirect } from "next/navigation";
import { EMAIL_PROVIDER_ID } from "@/lib/auth";
import {
  buildAuthCallbackPath,
  parsePreviewSafeMagicLink,
} from "@/lib/auth-magic-link";

export const metadata = {
  title: "Confirm sign-in - ReplyHalo",
  robots: {
    index: false,
    follow: false,
  },
};

export default async function AuthConfirmPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = await searchParams;
  const magicLink = parsePreviewSafeMagicLink(params, EMAIL_PROVIDER_ID);

  if (!magicLink) {
    return (
      <div className="min-h-screen flex items-center justify-center px-6">
        <div className="w-full max-w-md text-center">
          <h1 className="text-2xl font-semibold text-foreground">ReplyHalo</h1>
          <div className="panel mt-8 rounded p-8 shadow-black/40">
            <h2 className="text-lg font-semibold text-foreground">
              This sign-in link is incomplete
            </h2>
            <p className="mt-3 text-sm leading-6 text-muted">
              Request a new sign-in link and use the newest email from ReplyHalo.
            </p>
            <Link
              href="/login"
              className="mt-6 inline-flex w-full items-center justify-center rounded bg-accent px-6 py-3.5 text-sm font-semibold text-white"
            >
              Request a new link
            </Link>
          </div>
        </div>
      </div>
    );
  }

  const confirmedMagicLink = magicLink;

  async function continueSignIn() {
    "use server";
    redirect(buildAuthCallbackPath(confirmedMagicLink));
  }

  return (
    <div className="min-h-screen flex items-center justify-center px-6">
      <div className="w-full max-w-md text-center">
        <h1 className="text-2xl font-semibold text-foreground">ReplyHalo</h1>
        <p className="mt-2 text-sm leading-relaxed text-muted">
          One more step keeps your one-time sign-in link safe from automatic link
          previews.
        </p>

        <div className="panel mt-8 rounded p-8 shadow-black/40">
          <h2 className="text-lg font-semibold text-foreground">
            Confirm sign-in
          </h2>
          <p className="mt-3 text-sm leading-6 text-muted">
            Continue only if you requested this ReplyHalo sign-in email.
          </p>

          <form action={continueSignIn} className="mt-6">
            <button
              type="submit"
              className="inline-flex w-full items-center justify-center rounded bg-accent px-6 py-3.5 text-sm font-semibold text-white shadow-indigo-500/25 transition-all hover:shadow-indigo-500/30"
            >
              Continue to ReplyHalo
            </button>
          </form>

          <p className="mt-4 text-xs leading-5 text-muted">
            If you did not request this sign-in, you can close this page safely.
          </p>
        </div>
      </div>
    </div>
  );
}
