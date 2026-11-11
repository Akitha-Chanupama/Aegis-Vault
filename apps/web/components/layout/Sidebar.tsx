"use client";

import React from "react";
import {
  Shield,
  KeyRound,
  FileText,
  Image as ImageIcon,
  FolderArchive,
  CreditCard,
  Star,
  Trash2,
  Lock,
  HardDrive,
  Settings,
} from "lucide-react";
import { cn } from "@/lib/utils";

export type NavCategory =
  | "all"
  | "login"
  | "note"
  | "gallery"
  | "document"
  | "identity"
  | "favorites"
  | "trash"
  | "settings";

interface SidebarProps {
  currentCategory: NavCategory;
  onSelectCategory: (cat: NavCategory) => void;
  onLockVault: () => void;
  itemCounts: Record<string, number>;
  className?: string;
}

export function Sidebar({
  currentCategory,
  onSelectCategory,
  onLockVault,
  itemCounts,
  className,
}: SidebarProps) {
  const navItems = [
    { id: "all" as NavCategory, label: "All Items", icon: Shield, count: itemCounts.all ?? 0 },
    { id: "login" as NavCategory, label: "Passwords", icon: KeyRound, count: itemCounts.login ?? 0 },
    { id: "note" as NavCategory, label: "Secure Notes", icon: FileText, count: itemCounts.note ?? 0 },
    { id: "gallery" as NavCategory, label: "Private Photos", icon: ImageIcon, count: itemCounts.gallery ?? 0 },
    { id: "document" as NavCategory, label: "Documents", icon: FolderArchive, count: itemCounts.document ?? 0 },
    { id: "identity" as NavCategory, label: "Personal Records", icon: CreditCard, count: itemCounts.identity ?? 0 },
    { id: "favorites" as NavCategory, label: "Favorites", icon: Star, count: itemCounts.favorites ?? 0 },
    { id: "trash" as NavCategory, label: "Trash", icon: Trash2, count: itemCounts.trash ?? 0 },
  ];

  return (
    <aside
      className={cn(
        "w-64 bg-slate-950 border-r border-slate-800/80 flex flex-col h-screen select-none",
        className
      )}
    >
      {/* Brand Header */}
      <div className="p-4 border-b border-slate-800/80 flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-xl bg-purple-600/20 border border-purple-500/30 text-purple-400 flex items-center justify-center font-bold">
            <Shield className="w-4 h-4" />
          </div>
          <div>
            <div className="font-bold text-sm tracking-tight text-white flex items-center gap-1.5">
              <span>Aegis Vault</span>
              <span className="text-[10px] px-1.5 py-0.2 rounded bg-purple-500/20 text-purple-300 font-mono">
                E2EE
              </span>
            </div>
            <div className="text-[10px] text-slate-400">Zero-Knowledge Safe</div>
          </div>
        </div>
      </div>

      {/* Navigation List */}
      <nav className="flex-1 overflow-y-auto p-3 space-y-1">
        <div className="text-[11px] font-semibold uppercase tracking-wider text-slate-500 px-3 py-1.5">
          Vault Workspace
        </div>
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = currentCategory === item.id;
          return (
            <button
              key={item.id}
              onClick={() => onSelectCategory(item.id)}
              className={cn(
                "w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs font-medium transition-colors min-h-[40px]",
                isActive
                  ? "bg-purple-600/20 text-purple-300 border border-purple-500/30"
                  : "text-slate-400 hover:text-slate-200 hover:bg-slate-900"
              )}
            >
              <div className="flex items-center gap-2.5">
                <Icon className={cn("w-4 h-4", isActive ? "text-purple-400" : "text-slate-400")} />
                <span>{item.label}</span>
              </div>
              {item.count > 0 && (
                <span
                  className={cn(
                    "text-[10px] px-2 py-0.5 rounded-full font-mono",
                    isActive
                      ? "bg-purple-500/30 text-purple-200"
                      : "bg-slate-800 text-slate-400"
                  )}
                >
                  {item.count}
                </span>
              )}
            </button>
          );
        })}

        <div className="pt-4 text-[11px] font-semibold uppercase tracking-wider text-slate-500 px-3 py-1.5">
          Preferences
        </div>
        <button
          onClick={() => onSelectCategory("settings")}
          className={cn(
            "w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-medium transition-colors min-h-[40px]",
            currentCategory === "settings"
              ? "bg-purple-600/20 text-purple-300 border border-purple-500/30"
              : "text-slate-400 hover:text-slate-200 hover:bg-slate-900"
          )}
        >
          <Settings className="w-4 h-4" />
          <span>Security & Settings</span>
        </button>
      </nav>

      {/* Storage and Lock Bar */}
      <div className="p-3 border-t border-slate-800/80 space-y-3">
        {/* Synthetic Storage Gauge */}
        <div className="bg-slate-900/80 border border-slate-800/80 rounded-xl p-2.5 space-y-1.5">
          <div className="flex justify-between items-center text-[10px] text-slate-400">
            <span className="flex items-center gap-1">
              <HardDrive className="w-3 h-3 text-slate-400" />
              <span>Encrypted Storage</span>
            </span>
            <span className="font-mono text-slate-300">12.4 MB / 1 GB</span>
          </div>
          <div className="w-full bg-slate-800 rounded-full h-1.5 overflow-hidden">
            <div className="bg-purple-500 h-full rounded-full" style={{ width: "1.2%" }} />
          </div>
        </div>

        {/* Instant Lock Button */}
        <button
          type="button"
          onClick={onLockVault}
          className="w-full py-2.5 px-3 rounded-xl bg-slate-900 hover:bg-red-500/10 hover:text-red-400 border border-slate-800 hover:border-red-500/20 text-xs font-medium text-slate-300 transition-colors flex items-center justify-center gap-2 min-h-[44px]"
        >
          <Lock className="w-3.5 h-3.5" />
          <span>Lock Vault Now</span>
        </button>
      </div>
    </aside>
  );
}

