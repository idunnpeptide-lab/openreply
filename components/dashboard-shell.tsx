"use client";

import { useState } from "react";
import Sidebar from "@/components/sidebar";
import TopBar from "@/components/top-bar";
import { LocaleProvider } from "@/components/locale-provider";
import type { ReplyHaloLocale } from "@/lib/i18n";

interface DashboardShellProps {
  children: React.ReactNode;
  workspaceName: string;
  instagramUsername: string | null;
  instagramAccountCount: number;
  initialLocale: ReplyHaloLocale;
}

export default function DashboardShell({
  children,
  workspaceName,
  instagramUsername,
  instagramAccountCount,
  initialLocale,
}: DashboardShellProps) {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  return (
    <LocaleProvider initialLocale={initialLocale}>
      <div className="flex h-dvh overflow-hidden bg-background">
        <Sidebar
          isOpen={sidebarOpen}
          onClose={() => setSidebarOpen(false)}
          workspaceName={workspaceName}
        />

        <div className="flex min-w-0 flex-1 flex-col overflow-hidden">
          <TopBar
            sidebarOpen={sidebarOpen}
            onMenuClick={() => setSidebarOpen(true)}
            instagramUsername={instagramUsername}
            instagramAccountCount={instagramAccountCount}
          />

          <main className="flex-1 overflow-y-auto overflow-x-hidden">
            <div className="px-4 lg:px-8 py-5 sm:py-6 max-w-7xl mx-auto">
              {children}
            </div>
          </main>
        </div>
      </div>
    </LocaleProvider>
  );
}
