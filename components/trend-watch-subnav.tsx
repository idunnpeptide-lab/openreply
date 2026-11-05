"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const items = [
  { href: "/trend-watch/outliers", label: "Outliers" },
  { href: "/trend-watch/competitors", label: "Competitors & Niches" },
  { href: "/trend-watch/trends", label: "Instagram Trends" },
  { href: "/trend-watch/saved", label: "Saved Ideas" },
  { href: "/trend-watch/analyzer", label: "Video Analyzer" },
];

export default function TrendWatchSubnav() {
  const pathname = usePathname();

  return (
    <div className="-mx-4 overflow-x-auto px-4 sm:mx-0 sm:px-0">
      <nav
        className="flex min-w-max gap-1 rounded border border-border bg-surface p-1"
        aria-label="Trend Watch navigation"
      >
        {items.map((item) => {
          const active =
            pathname === item.href || pathname.startsWith(item.href + "/");
          return (
            <Link
              key={item.href}
              href={item.href}
              aria-current={active ? "page" : undefined}
              className={
                "rounded px-3 py-2 text-sm " +
                (active
                  ? "bg-background font-medium text-foreground"
                  : "text-muted hover:bg-surface-hover hover:text-foreground")
              }
            >
              {item.label}
            </Link>
          );
        })}
      </nav>
    </div>
  );
}
