"use client";

import { useState } from "react";
import Sidebar from "@/components/sidebar";
import TopBar from "@/components/top-bar";
import { usePersistentBoolean } from "@/lib/hooks/use-persistent-boolean";

interface DashboardShellProps {
  children: React.ReactNode;
  workspaceName: string;
  instagramAccountCount: number;
  role: string;
  userName: string;
  userEmail: string | null;
  userImage: string | null;
}

export default function DashboardShell({
  children,
  workspaceName,
  instagramAccountCount,
  role,
  userName,
  userEmail,
  userImage,
}: DashboardShellProps) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [collapsed, setCollapsed] = usePersistentBoolean("openreply:sidebar-collapsed");

  return (
    // h-dvh, not h-screen: on mobile browsers the URL bar eats into 100vh, which
    // would push the composer and pagination controls below the fold.
    <div className="flex h-dvh overflow-hidden bg-background">
      <Sidebar
        isOpen={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
        collapsed={collapsed}
        onToggleCollapsed={() => setCollapsed((v) => !v)}
        workspaceName={workspaceName}
      />

      <div className="flex min-w-0 flex-1 flex-col overflow-hidden">
        <TopBar
          onMenuClick={() => setSidebarOpen(true)}
          instagramAccountCount={instagramAccountCount}
          userName={userName}
          userEmail={userEmail}
          userImage={userImage}
          role={role}
        />

        <main className="flex-1 overflow-y-auto overflow-x-hidden bg-background">
          <div className="mx-auto max-w-[1240px] px-4 py-5 sm:py-6 lg:px-6">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}
