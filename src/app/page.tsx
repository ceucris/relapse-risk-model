"use client";

import { DashboardProvider } from "@/lib/dashboard-context";
import { AppShell } from "@/components/app-shell";

export default function HomePage() {
  return (
    <DashboardProvider>
      <AppShell />
    </DashboardProvider>
  );
}
