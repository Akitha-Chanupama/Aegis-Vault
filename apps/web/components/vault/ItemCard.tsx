"use client";

import React, { useState } from "react";
import {
  KeyRound,
  FileText,
  CreditCard,
  FolderArchive,
  Star,
  Copy,
  Check,
  ExternalLink,
  ChevronRight,
} from "lucide-react";
import { DecryptedVaultItem, LoginPayload, NotePayload } from "@aegis/shared";
import { cn } from "@/lib/utils";

interface ItemCardProps {
  item: DecryptedVaultItem;
  onSelect: (item: DecryptedVaultItem) => void;
  onToggleFavorite: (item: DecryptedVaultItem) => void;
}

export function ItemCard({
  item,
  onSelect,
  onToggleFavorite,
}: ItemCardProps) {
  const [copied, setCopied] = useState(false);

  const getIcon = () => {
    switch (item.kind) {
      case "login":
        return <KeyRound className="w-4 h-4 text-purple-400" />;
      case "note":
        return <FileText className="w-4 h-4 text-emerald-400" />;
      case "card":
        return <CreditCard className="w-4 h-4 text-amber-400" />;
      case "document":
        return <FolderArchive className="w-4 h-4 text-blue-400" />;
      case "identity":
        return <CreditCard className="w-4 h-4 text-pink-400" />;
    }
  };

  const getTitle = () => {
    const payload = item.payload as any;
    return payload.name || payload.title || payload.cardholderName || payload.fileName || payload.fullName || "Untitled Entry";
  };

  const getSubtitle = () => {
    const payload = item.payload as any;
    if (item.kind === "login") {
      return payload.username || payload.url || "No username";
    }
    if (item.kind === "note") {
      return payload.content?.substring(0, 60) || "Empty note";
    }
    if (item.kind === "card") {
      return `Ending in •••• ${payload.cardNumber?.slice(-4) || "••••"}`;
    }
    if (item.kind === "document") {
      return `${((payload.fileSize || 0) / 1024).toFixed(1)} KB`;
    }
    if (item.kind === "identity") {
      return payload.idNumber || "Identification";
    }
    return "";
  };

  const handleCopyPassword = async (e: React.MouseEvent) => {
    e.stopPropagation();
    const payload = item.payload as LoginPayload;
    if (payload.password) {
      try {
        await navigator.clipboard.writeText(payload.password);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      } catch {
        // Fallback
      }
    }
  };

  const isFavorite = (item.payload as any).isFavorite;

  return (
    <div
      onClick={() => onSelect(item)}
      className="group relative flex items-center justify-between p-4 bg-slate-900/60 hover:bg-slate-900 border border-slate-800/80 hover:border-purple-500/30 rounded-2xl cursor-pointer transition-all duration-200 shadow-sm"
    >
      <div className="flex items-center gap-3.5 min-w-0">
        <div className="w-10 h-10 rounded-xl bg-slate-800/80 border border-slate-700/50 flex items-center justify-center shrink-0 group-hover:border-purple-500/40 transition-colors">
          {getIcon()}
        </div>

        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <h4 className="text-sm font-semibold text-slate-100 truncate group-hover:text-purple-300 transition-colors">
              {getTitle()}
            </h4>
            {item.kind === "login" && (item.payload as LoginPayload).url && (
              <span className="text-[10px] text-slate-500 hidden sm:inline-block">
                {(item.payload as LoginPayload).url?.replace(/^https?:\/\//, "").split("/")[0]}
              </span>
            )}
          </div>
          <p className="text-xs text-slate-400 truncate mt-0.5 font-mono">
            {getSubtitle()}
          </p>
        </div>
      </div>

      <div className="flex items-center gap-1.5 shrink-0 ml-3">
        {/* Copy Password Button (Logins Only) */}
        {item.kind === "login" && (
          <button
            type="button"
            onClick={handleCopyPassword}
            className="p-2 text-slate-400 hover:text-emerald-400 hover:bg-slate-800 rounded-lg transition-colors min-h-[44px] min-w-[44px] flex items-center justify-center"
            title="Copy password"
            aria-label="Copy password to clipboard"
          >
            {copied ? (
              <Check className="w-4 h-4 text-emerald-400" />
            ) : (
              <Copy className="w-4 h-4" />
            )}
          </button>
        )}

        {/* Favorite Star */}
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onToggleFavorite(item);
          }}
          className={cn(
            "p-2 rounded-lg transition-colors min-h-[44px] min-w-[44px] flex items-center justify-center",
            isFavorite
              ? "text-amber-400 hover:text-amber-300"
              : "text-slate-500 hover:text-slate-300 hover:bg-slate-800"
          )}
          title={isFavorite ? "Remove favorite" : "Add to favorites"}
          aria-label={isFavorite ? "Favorited" : "Not favorited"}
        >
          <Star className={cn("w-4 h-4", isFavorite && "fill-amber-400")} />
        </button>

        <ChevronRight className="w-4 h-4 text-slate-600 group-hover:text-purple-400 transition-colors hidden sm:block" />
      </div>
    </div>
  );
}

