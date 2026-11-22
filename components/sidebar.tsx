"use client";

/**
 * Sidebar Navigation
 *
 * Text-only nav with active state and workspace section.
 */

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import LanguageSwitcher from "@/components/language-switcher";
import { useLocale } from "@/components/locale-provider";

const navItems = [
  { label: "Dashboard", href: "/dashboard" },
  { label: "Overview", href: "/overview" },
  { label: "Inbox", href: "/inbox" },
  { label: "Quick Automations", href: "/campaigns/quick" },
  { label: "Campaigns", href: "/campaigns", exact: true },
  { label: "TikTok staging", href: "/tiktok" },
  { label: "Video Clipper", href: "/video-clipper" },
];

const trendWatchItems = [
  { label: "Outliers", href: "/trend-watch/outliers" },
  { label: "Competitors & Niches", href: "/trend-watch/competitors" },
  { label: "Instagram Trends", href: "/trend-watch/trends" },
  { label: "Saved Ideas", href: "/trend-watch/saved" },
  { label: "Video Analyzer", href: "/trend-watch/analyzer" },
];

const trailingNavItems = [
  { label: "DM Logs", href: "/logs" },
  { label: "Settings", href: "/settings" },
  { label: "Diagnostics", href: "/diagnostics" },
];

interface SidebarProps {
  isOpen: boolean;
  onClose: () => void;
  workspaceName: string;
}

export default function Sidebar({
  isOpen,
  onClose,
  workspaceName,
}: SidebarProps) {
  const pathname = usePathname();
  const trendWatchActive = pathname.startsWith("/trend-watch");
  const [trendWatchOpen, setTrendWatchOpen] = useState(trendWatchActive);
  const closeButtonRef = useRef<HTMLButtonElement>(null);
  const { t } = useLocale();

  useEffect(() => {
    if (trendWatchActive) setTrendWatchOpen(true);
  }, [trendWatchActive]);

  useEffect(() => {
    if (!isOpen) return;

    closeButtonRef.current?.focus();

    const handleEscape = (event: KeyboardEvent) => {
      if (event.key !== "Escape") return;
      onClose();
      window.requestAnimationFrame(() => {
        document.getElementById("dashboard-menu-button")?.focus();
      });
    };

    window.addEventListener("keydown", handleEscape);
    return () => window.removeEventListener("keydown", handleEscape);
  }, [isOpen, onClose]);

  function closeAndRestoreFocus() {
    onClose();
    window.requestAnimationFrame(() => {
      document.getElementById("dashboard-menu-button")?.focus();
    });
  }

  function renderLink(item: {
    label: string;
    href: string;
    exact?: boolean;
  }) {
    const isActive = item.exact
      ? pathname === item.href
      : pathname === item.href || pathname.startsWith(item.href + "/");

    return (
      <Link
        key={item.href}
        href={item.href}
        onClick={onClose}
        aria-current={isActive ? "page" : undefined}
        className={`
          block px-3 py-2.5 rounded text-sm
          ${
            isActive
              ? "bg-surface-hover text-foreground font-medium"
              : "text-muted hover:text-foreground hover:bg-surface-hover"
          }
        `}
      >
        {t(item.label)}
      </Link>
    );
  }

  return (
    <>
      {isOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/60 lg:hidden"
          onClick={closeAndRestoreFocus}
          aria-hidden="true"
        />
      )}

      <aside
        id="dashboard-sidebar"
        className={`
          fixed top-0 left-0 z-50 h-dvh w-64 max-w-[85vw] shrink-0 bg-surface border-r border-border flex flex-col
          transition-transform duration-200 ease-out
          lg:h-full lg:translate-x-0 lg:static lg:z-auto lg:visible lg:pointer-events-auto
          ${
            isOpen
              ? "visible translate-x-0 pointer-events-auto"
              : "invisible -translate-x-full pointer-events-none"
          }
        `}
      >
        <div
          className="flex items-center justify-between gap-3 px-6 py-5 border-b border-border"
          style={{ paddingTop: "calc(1.25rem + env(safe-area-inset-top))" }}
        >
          <Link href="/dashboard" className="text-base font-semibold">
            ReplyHalo
          </Link>
          <button
            ref={closeButtonRef}
            type="button"
            onClick={closeAndRestoreFocus}
            className="rounded border border-border px-2.5 py-1.5 text-sm text-muted hover:text-foreground lg:hidden"
            aria-label={t("Close navigation")}
          >
            {t("Close")}
          </button>
        </div>

        <nav
          className="flex-1 px-3 py-4 space-y-1 overflow-y-auto"
          aria-label={t("Main navigation")}
        >
          {navItems.map(renderLink)}

          <div>
            <button
              type="button"
              onClick={() => setTrendWatchOpen((open) => !open)}
              aria-expanded={trendWatchOpen}
              className={`
                flex w-full items-center justify-between rounded px-3 py-2.5 text-left text-sm
                ${
                  trendWatchActive
                    ? "bg-surface-hover text-foreground font-medium"
                    : "text-muted hover:text-foreground hover:bg-surface-hover"
                }
              `}
            >
              <span>{t("Trend Watch")}</span>
              <span
                aria-hidden="true"
                className={`text-xs transition-transform ${
                  trendWatchOpen ? "rotate-90" : ""
                }`}
              >
                ›
              </span>
            </button>

            {trendWatchOpen && (
              <div className="mt-1 space-y-1 border-l border-border ml-3 pl-3">
                {trendWatchItems.map((item) => {
                  const isActive =
                    pathname === item.href ||
                    pathname.startsWith(item.href + "/");
                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      onClick={onClose}
                      aria-current={isActive ? "page" : undefined}
                      className={`
                        block rounded px-3 py-2 text-sm
                        ${
                          isActive
                            ? "bg-surface-hover text-foreground font-medium"
                            : "text-muted hover:text-foreground hover:bg-surface-hover"
                        }
                      `}
                    >
                      {t(item.label)}
                    </Link>
                  );
                })}
              </div>
            )}
          </div>

          {trailingNavItems.map(renderLink)}
        </nav>

        <div className="space-y-3 border-t border-border px-5 py-4">
          <div>
            <p className="text-sm text-foreground truncate">{workspaceName}</p>
            <p className="text-xs text-muted">{t("ReplyHalo workspace")}</p>
          </div>
          <LanguageSwitcher compact />
        </div>
      </aside>
    </>
  );
}
