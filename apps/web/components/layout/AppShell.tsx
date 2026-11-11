"use client";

import React, { useState } from "react";
import { Sidebar, NavCategory } from "./Sidebar";
import { MobileTabBar } from "./MobileTabBar";
import { SyncStatusBadge } from "../vault/SyncStatusBadge";
import {
  Search,
  Plus,
  Lock,
  Moon,
  Sun,
  Shield,
  Menu,
  X,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface AppShellProps {
  children: React.ReactNode;
  currentCategory: NavCategory;
  onSelectCategory: (cat: NavCategory) => void;
  onLockVault: () => void;
  onOpenQuickAdd: () => void;
  searchQuery: string;
  onSearchChange: (q: string) => void;
  itemCounts: Record<string, number>;
  syncStatus: "synced" | "syncing" | "offline";
}

export function AppShell({
  children,
  currentCategory,
  onSelectCategory,
  onLockVault,
  onOpenQuickAdd,
  searchQuery,
  onSearchChange,
  itemCounts,
  syncStatus,
}: AppShellProps) {
  const [isThemeDark, setIsThemeDark] = useState(true);
  const [mobileDrawerOpen, setMobileDrawerOpen] = useState(false);

  const toggleTheme = () => {
    const next = !isThemeDark;
    setIsThemeDark(next);
    if (typeof document !== "undefined") {
      document.documentElement.setAttribute("data-theme", next ? "dark" : "light");
    }
  };

  return (
    <div className="flex h-screen h-[100dvh] overflow-hidden bg-slate-950 text-slate-100">
      {/* Desktop Sidebar (hidden on mobile) */}
      <Sidebar
        currentCategory={currentCategory}
        onSelectCategory={(cat) => {
          onSelectCategory(cat);
          setMobileDrawerOpen(false);
        }}
        onLockVault={onLockVault}
        itemCounts={itemCounts}
        className="hidden lg:flex"
      />

      {/* Mobile Drawer Backdrop & Sidebar */}
      {mobileDrawerOpen && (
        <div className="lg:hidden fixed inset-0 z-50 flex">
          <div
            className="fixed inset-0 bg-black/70 backdrop-blur-sm"
            onClick={() => setMobileDrawerOpen(false)}
          />
          <div className="relative z-10 w-72 max-w-[80vw]">
            <Sidebar
              currentCategory={currentCategory}
              onSelectCategory={(cat) => {
                onSelectCategory(cat);
                setMobileDrawerOpen(false);
              }}
              onLockVault={onLockVault}
              itemCounts={itemCounts}
              className="flex h-full"
            />
          </div>
        </div>
      )}

      {/* Main Container */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Top Header */}
        <header className="h-16 border-b border-slate-800/80 bg-slate-950/80 backdrop-blur-md px-4 sm:px-6 flex items-center justify-between gap-3 shrink-0">
          <div className="flex items-center gap-3 flex-1 max-w-xl">
            {/* Mobile Drawer Toggle */}
            <button
              type="button"
              onClick={() => setMobileDrawerOpen(true)}
              className="lg:hidden p-2 text-slate-400 hover:text-white rounded-lg hover:bg-slate-900 min-h-[44px] min-w-[44px] flex items-center justify-center"
              aria-label="Open Navigation Drawer"
            >
              <Menu className="w-5 h-5" />
            </button>

            {/* In-Memory Search Bar */}
            <div className="relative flex-1">
              <Search className="absolute left-3 top-2.5 w-4 h-4 text-slate-500" />
              <input
                type="search"
                value={searchQuery}
                onChange={(e) => onSearchChange(e.target.value)}
                placeholder="Search encrypted vault... (Ctrl+K)"
                className="w-full bg-slate-900/90 border border-slate-800 rounded-xl pl-9 pr-4 py-2 text-xs sm:text-sm text-slate-200 placeholder:text-slate-500 focus:outline-none focus:border-purple-500 transition-colors"
                aria-label="Search Vault"
              />
            </div>
          </div>

          {/* Header Action Items */}
          <div className="flex items-center gap-2 sm:gap-3">
            <SyncStatusBadge status={syncStatus} className="hidden sm:inline-flex" />

            {/* Quick Add Button (Desktop) */}
            <button
              type="button"
              onClick={onOpenQuickAdd}
              className="hidden sm:inline-flex items-center gap-1.5 px-3 py-2 bg-purple-600 hover:bg-purple-500 text-white rounded-xl text-xs font-semibold shadow-md shadow-purple-600/20 transition-colors min-h-[40px]"
            >
              <Plus className="w-4 h-4" />
              <span>Quick Add</span>
            </button>

            {/* Dark/Light Theme Toggle */}
            <button
              type="button"
              onClick={toggleTheme}
              className="p-2 text-slate-400 hover:text-slate-200 hover:bg-slate-900 rounded-xl transition-colors min-h-[44px] min-w-[44px] flex items-center justify-center"
              title="Toggle Theme"
              aria-label="Toggle Theme"
            >
              {isThemeDark ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
            </button>

            {/* Quick Lock Button (Mobile Header) */}
            <button
              type="button"
              onClick={onLockVault}
              className="lg:hidden p-2 text-slate-400 hover:text-red-400 hover:bg-slate-900 rounded-xl transition-colors min-h-[44px] min-w-[44px] flex items-center justify-center"
              title="Lock Vault"
              aria-label="Lock Vault"
            >
              <Lock className="w-4 h-4" />
            </button>
          </div>
        </header>

        {/* Scrollable Viewport */}
        <main className="flex-1 overflow-y-auto pb-20 lg:pb-6 p-4 sm:p-6 lg:p-8">
          <div className="max-w-7xl mx-auto">
            {children}
          </div>
        </main>
      </div>

      {/* Mobile Bottom Tab Bar */}
      <MobileTabBar
        currentCategory={currentCategory}
        onSelectCategory={onSelectCategory}
        onOpenQuickAdd={onOpenQuickAdd}
      />
    </div>
  );
}
