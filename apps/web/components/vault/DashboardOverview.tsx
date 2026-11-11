"use client";

import React from "react";
import {
  Shield,
  KeyRound,
  FileText,
  Image as ImageIcon,
  CreditCard,
  Plus,
  AlertTriangle,
  CheckCircle2,
  Lock,
} from "lucide-react";
import { DecryptedVaultItem, LoginPayload } from "@aegis/shared";
import { ItemCard } from "./ItemCard";
import { NavCategory } from "../layout/Sidebar";

interface DashboardOverviewProps {
  items: DecryptedVaultItem[];
  onSelectCategory: (cat: NavCategory) => void;
  onSelectItem: (item: DecryptedVaultItem) => void;
  onOpenQuickAdd: () => void;
  onToggleFavorite: (item: DecryptedVaultItem) => void;
}

export function DashboardOverview({
  items,
  onSelectCategory,
  onSelectItem,
  onOpenQuickAdd,
  onToggleFavorite,
}: DashboardOverviewProps) {
  const activeItems = items.filter((i) => !i.isDeleted);
  const passwordItems = activeItems.filter((i) => i.kind === "login");
  const noteItems = activeItems.filter((i) => i.kind === "note");
  const galleryItems = activeItems.filter((i) => i.kind === "document" || (i.payload as any).mimeType?.startsWith("image/"));
  const cardItems = activeItems.filter((i) => i.kind === "card");

  // Calculate security health score
  const weakPasswords = passwordItems.filter((p) => {
    const pwd = (p.payload as LoginPayload).password || "";
    return pwd.length < 12;
  });

  const securityScore = passwordItems.length === 0
    ? 100
    : Math.max(20, Math.round(100 - (weakPasswords.length / passwordItems.length) * 60));

  const recentlyUpdated = [...activeItems].sort(
    (a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
  ).slice(0, 5);

  return (
    <div className="space-y-6 sm:space-y-8">
      {/* Hero Welcome Banner */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-purple-900/40 via-slate-900 to-slate-900 border border-purple-500/20 p-6 sm:p-8">
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-2">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-purple-500/10 border border-purple-500/30 text-purple-300 text-xs font-semibold">
              <Shield className="w-3.5 h-3.5" />
              <span>Zero-Knowledge Secure Safe</span>
            </div>
            <h1 className="text-xl sm:text-2xl lg:text-3xl font-extrabold text-white tracking-tight">
              Aegis Security Overview
            </h1>
            <p className="text-xs sm:text-sm text-slate-400 max-w-xl">
              All records, notes, and photos are encrypted in your browser using AES-256-GCM. The cloud server has zero access to your master keys or plaintext secrets.
            </p>
          </div>

          <div className="flex items-center gap-4 bg-slate-950/60 border border-slate-800 rounded-2xl p-4 shrink-0">
            <div className="w-12 h-12 rounded-xl bg-purple-600/20 text-purple-400 flex items-center justify-center font-bold text-lg font-mono">
              {securityScore}%
            </div>
            <div>
              <div className="text-xs font-semibold text-slate-200">Vault Security Score</div>
              <div className="text-[11px] text-slate-400">
                {weakPasswords.length === 0 ? "All passwords strong" : `${weakPasswords.length} weak passwords detected`}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Category Shortcut Tiles */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
        {[
          { id: "login" as NavCategory, label: "Passwords", icon: KeyRound, count: passwordItems.length, color: "text-purple-400" },
          { id: "note" as NavCategory, label: "Secure Notes", icon: FileText, count: noteItems.length, color: "text-emerald-400" },
          { id: "gallery" as NavCategory, label: "Photos & Media", icon: ImageIcon, count: galleryItems.length, color: "text-blue-400" },
          { id: "identity" as NavCategory, label: "Cards & Records", icon: CreditCard, count: cardItems.length, color: "text-amber-400" },
        ].map((tile) => {
          const Icon = tile.icon;
          return (
            <button
              key={tile.id}
              onClick={() => onSelectCategory(tile.id)}
              className="flex flex-col p-4 bg-slate-900/60 hover:bg-slate-900 border border-slate-800/80 hover:border-slate-700 rounded-2xl text-left transition-all group"
            >
              <div className="w-10 h-10 rounded-xl bg-slate-800/80 flex items-center justify-center mb-3 group-hover:scale-105 transition-transform">
                <Icon className={`w-5 h-5 ${tile.color}`} />
              </div>
              <span className="text-sm font-semibold text-slate-200">{tile.label}</span>
              <span className="text-xs text-slate-400 font-mono mt-0.5">{tile.count} saved</span>
            </button>
          );
        })}
      </div>

      {/* Recently Updated Feed */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-base font-bold text-white flex items-center gap-2">
            <span>Recently Updated Entries</span>
            <span className="text-xs font-normal text-slate-500 font-mono">
              ({recentlyUpdated.length})
            </span>
          </h2>
          <button
            type="button"
            onClick={onOpenQuickAdd}
            className="text-xs text-purple-400 hover:text-purple-300 font-medium inline-flex items-center gap-1"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Add New Entry</span>
          </button>
        </div>

        {recentlyUpdated.length === 0 ? (
          <div className="p-8 text-center border border-slate-800 rounded-2xl bg-slate-900/40 text-slate-400 text-xs">
            No items in vault yet. Click "Add New Entry" to create your first encrypted credential.
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {recentlyUpdated.map((item) => (
              <ItemCard
                key={item.id}
                item={item}
                onSelect={onSelectItem}
                onToggleFavorite={onToggleFavorite}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
