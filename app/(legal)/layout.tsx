import Link from "next/link";

const legalLinks = [
  { href: "/privacy", label: "Privacy Policy" },
  { href: "/terms", label: "Terms of Service" },
  { href: "/data-deletion", label: "Data Deletion" },
];

export default function LegalLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <header className="border-b border-border bg-surface/60">
        <div className="mx-auto flex max-w-4xl flex-col gap-4 px-6 py-6 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <Link href="/" className="text-xl font-bold tracking-tight">
              ReplyHalo
            </Link>
            <p className="mt-1 text-sm text-muted">
              Instagram automation using the official Meta platform APIs.
            </p>
          </div>
          <nav className="flex flex-wrap gap-x-5 gap-y-2 text-sm">
            {legalLinks.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className="text-muted transition hover:text-foreground"
              >
                {link.label}
              </Link>
            ))}
          </nav>
        </div>
      </header>

      <main className="mx-auto max-w-4xl px-6 py-10 sm:py-14">{children}</main>

      <footer className="border-t border-border">
        <div className="mx-auto flex max-w-4xl flex-col gap-3 px-6 py-8 text-sm text-muted sm:flex-row sm:items-center sm:justify-between">
          <p>© {new Date().getFullYear()} ReplyHalo</p>
          <p>
            Contact: {" "}
            <a
              href="mailto:tiktokecom2020@gmail.com"
              className="text-foreground underline underline-offset-4"
            >
              tiktokecom2020@gmail.com
            </a>
          </p>
        </div>
      </footer>
    </div>
  );
}
