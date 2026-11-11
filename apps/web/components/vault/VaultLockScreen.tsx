"use client";

import React, { useState } from "react";
import { Lock, KeyRound, ShieldAlert, ArrowRight, LifeBuoy } from "lucide-react";
import { cn } from "@/lib/utils";

interface VaultLockScreenProps {
  onUnlock: (passphrase: string) => Promise<boolean>;
  onRecoveryUnlock: (recoveryPhrase: string) => Promise<boolean>;
  isLocked: boolean;
}

export function VaultLockScreen({
  onUnlock,
  onRecoveryUnlock,
  isLocked,
}: VaultLockScreenProps) {
  const [passphrase, setPassphrase] = useState("");
  const [isUnlocking, setIsUnlocking] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isRecoveryMode, setIsRecoveryMode] = useState(false);
  const [recoveryPhrase, setRecoveryPhrase] = useState("");

  if (!isLocked) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsUnlocking(true);

    try {
      if (isRecoveryMode) {
        const success = await onRecoveryUnlock(recoveryPhrase);
        if (!success) {
          setError("Invalid 24-word recovery phrase. Check spacing and spelling.");
        }
      } else {
        const success = await onUnlock(passphrase);
        if (!success) {
          setError("Incorrect vault passphrase. Encryption key could not be unwrapped.");
        }
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to derive keys");
    } finally {
      setIsUnlocking(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/90 backdrop-blur-md">
      <div className="w-full max-w-md bg-slate-900 border border-slate-800 rounded-3xl shadow-2xl p-6 sm:p-8 space-y-6">
        <div className="text-center space-y-2">
          <div className="w-14 h-14 rounded-2xl bg-purple-500/10 border border-purple-500/20 text-purple-400 mx-auto flex items-center justify-center shadow-inner">
            <Lock className="w-7 h-7" />
          </div>
          <h1 className="text-xl font-bold tracking-tight text-white">
            {isRecoveryMode ? "Vault Emergency Recovery" : "Aegis Vault is Locked"}
          </h1>
          <p className="text-xs text-slate-400 max-w-xs mx-auto">
            {isRecoveryMode
              ? "Enter your 24-word recovery phrase to restore access without your passphrase."
              : "Zero-knowledge decryption executes purely inside your device memory."}
          </p>
        </div>

        {error && (
          <div className="flex items-start gap-2.5 p-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-xs">
            <ShieldAlert className="w-4 h-4 shrink-0 mt-0.5" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          {isRecoveryMode ? (
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-slate-300">
                24-Word Recovery Phrase
              </label>
              <textarea
                rows={3}
                value={recoveryPhrase}
                onChange={(e) => setRecoveryPhrase(e.target.value)}
                placeholder="word1 word2 word3 ... word24"
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-sm text-slate-200 font-mono focus:border-purple-500 focus:outline-none resize-none"
                required
                autoFocus
              />
            </div>
          ) : (
            <div className="space-y-1.5">
              <div className="flex justify-between items-center text-xs font-medium text-slate-300">
                <label>Vault Passphrase</label>
                <button
                  type="button"
                  onClick={() => setPassphrase("12345678")}
                  className="text-[11px] text-purple-400 hover:text-purple-300 font-mono transition-colors"
                >
                  Demo key: <span className="underline font-bold">12345678</span>
                </button>
              </div>
              <div className="relative">
                <input
                  type="password"
                  value={passphrase}
                  onChange={(e) => setPassphrase(e.target.value)}
                  placeholder="Enter vault passphrase (e.g. 12345678)"
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-3 text-sm text-slate-200 focus:border-purple-500 focus:outline-none pr-10"
                  required
                  autoFocus
                  disabled={isUnlocking}
                />
                <KeyRound className="absolute right-3 top-3.5 w-4 h-4 text-slate-500" />
              </div>
            </div>
          )}

          <button
            type="submit"
            disabled={isUnlocking || (!isRecoveryMode && !passphrase) || (isRecoveryMode && !recoveryPhrase)}
            className={cn(
              "w-full py-3 px-4 bg-purple-600 hover:bg-purple-500 text-white text-sm font-semibold rounded-xl transition-all shadow-lg shadow-purple-600/20 flex items-center justify-center gap-2 min-h-[44px]",
              isUnlocking && "opacity-70 cursor-wait"
            )}
          >
            {isUnlocking ? (
              <>
                <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                <span>Deriving Argon2id Keys...</span>
              </>
            ) : (
              <>
                <span>{isRecoveryMode ? "Recover & Unlock" : "Unlock Vault"}</span>
                <ArrowRight className="w-4 h-4" />
              </>
            )}
          </button>
        </form>

        <div className="pt-2 border-t border-slate-800/80 text-center">
          <button
            type="button"
            onClick={() => {
              setIsRecoveryMode(!isRecoveryMode);
              setError(null);
            }}
            className="text-xs text-purple-400 hover:text-purple-300 inline-flex items-center gap-1.5 transition-colors py-2 px-3 rounded-lg hover:bg-slate-800/40"
          >
            <LifeBuoy className="w-3.5 h-3.5" />
            <span>
              {isRecoveryMode ? "Back to Passphrase Unlock" : "Forgot passphrase? Use Recovery Phrase"}
            </span>
          </button>
        </div>
      </div>
    </div>
  );
}

