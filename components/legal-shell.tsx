import Link from "next/link";

interface LegalShellProps {
  title: string;
  description: string;
  updatedAt: string;
  children: React.ReactNode;
}

const legalLinks = [
  { href: "/privacy", label: "Privacy Policy" },
  { href: "/terms", label: "Terms of Service" },
  { href: "/data-deletion", label: "Data Deletion" },
];

export default function LegalShell({
  title,
  description,
  updatedAt,
  children,
}: LegalShellProps) {
  return (
    <main className="min-h-screen bg-background text-foreground">
      <header className="border-b border-border">
        <div className="mx-auto flex min-h-16 max-w-5xl flex-col gap-3 px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
          <Link href="/" className="flex items-center gap-3">
            <span className="text-lg font-bold text-foreground">ReplyHalo</span>
          </Link>
          <nav className="flex flex-wrap items-center gap-x-4 gap-y-2 text-sm">
            {legalLinks.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className="font-medium text-muted transition hover:text-foreground"
              >
                {link.label}
              </Link>
            ))}
            <Link
              href="/login"
              className="font-semibold text-muted transition hover:text-foreground"
            >
              Sign in
            </Link>
          </nav>
        </div>
      </header>

      <article className="mx-auto max-w-3xl px-5 py-14">
        <p className="text-sm font-semibold uppercase text-accent">
          Last updated {updatedAt}
        </p>
        <h1 className="mt-4 text-4xl font-black text-foreground sm:text-5xl">
          {title}
        </h1>
        <p className="mt-5 text-base leading-8 text-muted">{description}</p>
        <div className="mt-10 space-y-8 text-sm leading-7 text-foreground">
          {children}
        </div>
      </article>

      <footer className="border-t border-border">
        <div className="mx-auto flex max-w-5xl flex-col gap-3 px-5 py-8 text-sm text-muted sm:flex-row sm:items-center sm:justify-between">
          <p>ReplyHalo · Instagram automation using the official Meta APIs.</p>
          <a
            href="mailto:tiktokecom2020@gmail.com"
            className="text-foreground underline underline-offset-4"
          >
            tiktokecom2020@gmail.com
          </a>
        </div>
      </footer>
    </main>
  );
}
