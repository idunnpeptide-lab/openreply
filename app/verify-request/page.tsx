import Link from "next/link";

export const metadata = {
  title: "Check your email - ReplyHalo",
  description: "A secure ReplyHalo sign-in link was sent to your email.",
};

export default function VerifyRequestPage() {
  return (
    <div className="min-h-screen flex items-center justify-center px-6">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <h1 className="text-2xl font-semibold text-foreground">
            ReplyHalo
          </h1>
        </div>

        <div className="panel rounded p-8 text-center">
          <h2 className="text-lg font-semibold mb-2">Check your email</h2>
          <p className="text-sm text-muted">
            We sent you a secure one-time sign-in link. Open it to continue to
            ReplyHalo.
          </p>
          <p className="mt-4 text-xs leading-5 text-muted">
            If you do not see it after a moment, check your spam or junk folder.
            You can return to sign in to send a new link.
          </p>
          <p className="mt-6 text-sm">
            <Link href="/login" className="text-accent hover:underline">
              Send a new sign-in link
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
