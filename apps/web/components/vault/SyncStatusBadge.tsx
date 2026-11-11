"use client";

import React from "react";
import { CheckCircle2, RefreshCw, WifiOff } from "lucide-react";
import { cn } from "@/lib/utils";

interface SyncStatusBadgeProps {
  status: "synced" | "syncing" | "offline";
  className?: string;
}

export function SyncStatusBadge({ status, className }: SyncStatusBadgeProps) {
  return (
    <div
      className={cn(
        "inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium transition-colors",
        status === "synced" && "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20",
        status === "syncing" && "bg-amber-500/10 text-amber-400 border border-amber-500/20",
        status === "offline" && "bg-slate-700/50 text-slate-400 border border-slate-600/30",
        className
      )}
      role="status"
      aria-label={`Vault sync status: ${status}`}
    >
      {status === "synced" && (
        <>
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
          <span>Synced</span>
        </>
      )}
      {status === "syncing" && (
        <>
          <RefreshCw className="w-3 h-3 animate-spin text-amber-400" />
          <span>Syncing...</span>
        </>
      )}
      {status === "offline" && (
        <>
          <WifiOff className="w-3 h-3 text-slate-400" />
          <span>Offline</span>
        </>
      )}
    </div>
  );
}

