"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useLocale } from "@/components/locale-provider";

const items = [
  { href: "/trend-watch/outliers", label: "Outliers" },
  { href: "/trend-watch/competitors", label: "Competitors & Niches" },
  { href: "/trend-watch/trends", label: "Instagram Trends" },
  { href: "/trend-watch/saved", label: "Saved Ideas" },
  { href: "/trend-watch/analyzer", label: "Video Analyzer" },
  { href: "/trend-watch/journal", label: "Journal" },
];

export default function TrendWatchSubnav() {
  const pathname = usePathname();
  const { t } = useLocale();

  return (
    <div className="-mx-4 overflow-x-auto px-4 sm:mx-0 sm:px-0">
      <nav className="flex min-w-max gap-1 rounded-xl border border-[#262a35] bg-[#12141a] p-1" aria-label="Trend Watch navigation">
        {items.map((item) => {
          const active = pathname === item.href || pathname.startsWith(item.href + "/");
          return (
            <Link
              key={item.href}
              href={item.href}
              aria-current={active ? "page" : undefined}
              className={
                "rounded-lg px-3 py-2 text-sm font-semibold transition " +
                (active
                  ? "bg-[#262a35] text-[#eceef3]"
                  : "text-[#8b91a1] hover:bg-[#171a22] hover:text-[#eceef3]")
              }
            >
              {t(item.label)}
            </Link>
          );
        })}
      </nav>
    </div>
  );
}
