"use client";

/**
 * Sidebar Navigation
 *
 * Text-only nav with active state and workspace section.
 */

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect } from "react";

const navItems = [
  { label: "Dashboard", href: "/dashboard" },
  { label: "Overview", href: "/overview" },
  { label: "Inbox", href: "/inbox" },
  { label: "Quick Automations", href: "/campaigns/quick" },
  { label: "Campaigns", href: "/campaigns", exact: true },
  { label: "TikTok staging", href: "/tiktok" },
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

  useEffect(() => {
    if (!isOpen) return;

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
            type="button"
            onClick={closeAndRestoreFocus}
            className="rounded border border-border px-2.5 py-1.5 text-sm text-muted hover:text-foreground lg:hidden"
            aria-label="Close navigation"
          >
            Close
          </button>
        </div>

        <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto" aria-label="Main navigation">
          {navItems.map((item) => {
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
                {item.label}
              </Link>
            );
          })}
        </nav>

        <div className="px-5 py-4 border-t border-border">
          <p className="text-sm text-foreground truncate">{workspaceName}</p>
          <p className="text-xs text-muted">ReplyHalo workspace</p>
        </div>
      </aside>
    </>
  );
}
