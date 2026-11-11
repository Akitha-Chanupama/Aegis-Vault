"use client";

import React, { useState, useEffect } from "react";
import { Eye, EyeOff, Copy, Check } from "lucide-react";
import { cn } from "@/lib/utils";

interface SecretFieldProps {
  label: string;
  value: string;
  className?: string;
  isMono?: boolean;
}

export function SecretField({
  label,
  value,
  className,
  isMono = true,
}: SecretFieldProps) {
  const [isRevealed, setIsRevealed] = useState(false);
  const [copied, setCopied] = useState(false);

  // Auto-hide secret after 15 seconds if revealed
  useEffect(() => {
    if (!isRevealed) return;
    const timer = setTimeout(() => {
      setIsRevealed(false);
    }, 15000);
    return () => clearTimeout(timer);
  }, [isRevealed]);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Fallback
    }
  };

  return (
    <div className={cn("space-y-1.5", className)}>
      <div className="flex items-center justify-between text-xs text-slate-400 font-medium">
        <label>{label}</label>
        {isRevealed && (
          <span className="text-[10px] text-amber-400">Auto-hiding in 15s</span>
        )}
      </div>
      <div className="flex items-center gap-1.5 bg-slate-900/80 border border-slate-700/60 rounded-xl px-3 py-2">
        <div
          className={cn(
            "flex-1 text-sm select-all overflow-x-auto truncate",
            isMono && "font-mono",
            !isRevealed && "tracking-widest text-slate-400"
          )}
        >
          {isRevealed ? value : "••••••••••••••••"}
        </div>
        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={() => setIsRevealed(!isRevealed)}
            className="p-2 text-slate-400 hover:text-slate-200 hover:bg-slate-800 rounded-lg transition-colors min-h-[44px] min-w-[44px] flex items-center justify-center"
            title={isRevealed ? "Hide secret" : "Reveal secret"}
            aria-label={isRevealed ? `Hide ${label}` : `Reveal ${label}`}
          >
            {isRevealed ? (
              <EyeOff className="w-4 h-4 text-slate-400" />
            ) : (
              <Eye className="w-4 h-4 text-slate-400" />
            )}
          </button>
          <button
            type="button"
            onClick={handleCopy}
            className="p-2 text-slate-400 hover:text-emerald-400 hover:bg-slate-800 rounded-lg transition-colors min-h-[44px] min-w-[44px] flex items-center justify-center"
            title="Copy to clipboard"
            aria-label={`Copy ${label} to clipboard`}
          >
            {copied ? (
              <Check className="w-4 h-4 text-emerald-400" />
            ) : (
              <Copy className="w-4 h-4 text-slate-400" />
            )}
          </button>
        </div>
      </div>
    </div>
  );
}

