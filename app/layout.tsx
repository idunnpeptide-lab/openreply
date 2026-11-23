import type { Metadata, Viewport } from "next";
import { Analytics } from "@vercel/analytics/next";
import { cookies } from "next/headers";
import { LocaleProvider } from "@/components/locale-provider";
import { LOCALE_COOKIE, normalizeLocale } from "@/lib/i18n";
import "./globals.css";

export const metadata: Metadata = {
  title: "ReplyHalo - Instagram comment-to-DM automation",
  description:
    "Turn Instagram keyword comments into automated private replies, tracked links, follow gates, and follow-ups using the official Meta API.",
  keywords: [
    "instagram automation",
    "comment to DM",
    "instagram private replies",
    "social commerce",
    "creator automation",
  ],
  manifest: "/manifest.webmanifest",
  appleWebApp: {
    capable: true,
    title: "ReplyHalo",
    statusBarStyle: "black-translucent",
  },
  icons: {
    icon: [
      { url: "/icon-192.png", sizes: "192x192", type: "image/png" },
      { url: "/icon-512.png", sizes: "512x512", type: "image/png" },
    ],
    apple: "/apple-touch-icon.png",
  },
};

export const viewport: Viewport = {
  themeColor: "#18181b",
  width: "device-width",
  initialScale: 1,
  // Installed on iOS the app owns the full screen, notch included; the safe
  // area insets below keep content clear of the system UI.
  viewportFit: "cover",
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const cookieStore = await cookies();
  const locale = normalizeLocale(cookieStore.get(LOCALE_COOKIE)?.value);

  return (
    <html lang={locale === "uk" ? "uk" : "en"} className="h-full dark">
      <body
        className="min-h-full bg-background text-foreground font-sans antialiased"
        // Clears the home indicator when installed; 0 everywhere else.
        style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
      >
        <LocaleProvider initialLocale={locale}>
          {children}
        </LocaleProvider>
        <Analytics />
      </body>
    </html>
  );
}
