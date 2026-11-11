"use client";

import React, { useState } from "react";
import {
  Shield,
  KeyRound,
  Check,
  ArrowRight,
  LifeBuoy,
  Download,
  Copy,
  AlertTriangle,
} from "lucide-react";
import { generateRecoveryPhrase } from "@aegis/crypto";

interface OnboardingWizardProps {
  onComplete: (passphrase: string, recoveryPhrase: string) => Promise<void>;
}

export function OnboardingWizard({ onComplete }: OnboardingWizardProps) {
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [passphrase, setPassphrase] = useState("");
  const [confirmPassphrase, setConfirmPassphrase] = useState("");
  const [recoveryPhrase] = useState(() => generateRecoveryPhrase());
  const [hasCopiedRecovery, setHasCopiedRecovery] = useState(false);
  const [isInitializing, setIsInitializing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Strength computation
  let strength = "Weak";
  let strengthColor = "bg-red-500";
  if (passphrase.length >= 16) {
    strength = "Very Strong";
    strengthColor = "bg-emerald-500";
  } else if (passphrase.length >= 12) {
    strength = "Strong";
    strengthColor = "bg-purple-500";
  } else if (passphrase.length >= 8) {
    strength = "Medium";
    strengthColor = "bg-amber-500";
  }

  const handleStep1Next = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (passphrase.length < 8) {
      setError("Passphrase must be at least 8 characters.");
      return;
    }
    if (passphrase !== confirmPassphrase) {
      setError("Passphrases do not match.");
      return;
    }
    setStep(2);
  };

  const handleCopyRecovery = async () => {
    try {
      await navigator.clipboard.writeText(recoveryPhrase);
      setHasCopiedRecovery(true);
    } catch {
      // Fallback
    }
  };

  const handleDownloadEmergencyKit = () => {
    const text = `AEGIS VAULT - EMERGENCY RECOVERY KIT\n\nGenerated: ${new Date().toISOString()}\n\n24-WORD RECOVERY PHRASE:\n${recoveryPhrase}\n\nKEEP THIS SHEET CONFIDENTIAL AND STORED OFFLINE IN A SECURE LOCATION.\nNO ONE CAN RESTORE YOUR VAULT IF THIS PHRASE AND YOUR PASSPHRASE ARE LOST.`;
    const blob = new Blob([text], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "aegis-vault-emergency-recovery-kit.txt";
    a.click();
    URL.revokeObjectURL(url);
    setHasCopiedRecovery(true);
  };

  const handleFinalInitialize = async () => {
    setIsInitializing(true);
    setError(null);
    try {
      await onComplete(passphrase, recoveryPhrase);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Initialization failed");
      setIsInitializing(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950">
      <div className="w-full max-w-xl bg-slate-900 border border-slate-800 rounded-3xl shadow-2xl p-6 sm:p-8 space-y-6">
        {/* Step Indicator */}
        <div className="flex items-center justify-between border-b border-slate-800 pb-4">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-purple-600/20 text-purple-400 flex items-center justify-center font-bold">
              <Shield className="w-4 h-4" />
            </div>
            <div>
              <div className="font-bold text-sm text-white">First-Run Vault Setup</div>
              <div className="text-[10px] text-slate-400">Step {step} of 2</div>
            </div>
          </div>
          <div className="flex gap-1.5">
            <div className={`w-8 h-1.5 rounded-full ${step >= 1 ? "bg-purple-500" : "bg-slate-800"}`} />
            <div className={`w-8 h-1.5 rounded-full ${step >= 2 ? "bg-purple-500" : "bg-slate-800"}`} />
          </div>
        </div>

        {error && (
          <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-xs">
            {error}
          </div>
        )}

        {/* Step 1: Set Passphrase */}
        {step === 1 && (
          <form onSubmit={handleStep1Next} className="space-y-5">
            <div className="space-y-1">
              <h2 className="text-lg font-bold text-white">Set Your Vault Passphrase</h2>
              <p className="text-xs text-slate-400">
                This master passphrase is used strictly on your device to derive your 256-bit Key Encryption Key (KEK). It is never transmitted to our servers.
              </p>
            </div>

            <div className="space-y-3">
              <div className="space-y-1.5">
                <div className="flex justify-between items-center text-xs text-slate-300">
                  <label>Master Passphrase</label>
                  <span className="text-[10px] text-slate-400">
                    Strength: <strong className="text-white">{strength}</strong>
                  </span>
                </div>
                <input
                  type="password"
                  value={passphrase}
                  onChange={(e) => setPassphrase(e.target.value)}
                  placeholder="Enter a memorable, strong passphrase"
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-3 text-sm text-slate-100 focus:border-purple-500 focus:outline-none"
                  required
                  autoFocus
                />
                <div className="w-full bg-slate-800 h-1.5 rounded-full overflow-hidden mt-1">
                  <div
                    className={`h-full transition-all duration-300 ${strengthColor}`}
                    style={{
                      width: `${Math.min(100, (passphrase.length / 16) * 100)}%`,
                    }}
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs text-slate-300">Confirm Passphrase</label>
                <input
                  type="password"
                  value={confirmPassphrase}
                  onChange={(e) => setConfirmPassphrase(e.target.value)}
                  placeholder="Re-enter passphrase"
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-3 text-sm text-slate-100 focus:border-purple-500 focus:outline-none"
                  required
                />
              </div>
            </div>

            <button
              type="submit"
              className="w-full py-3 px-4 bg-purple-600 hover:bg-purple-500 text-white rounded-xl text-xs font-semibold shadow-md shadow-purple-600/20 transition-all flex items-center justify-center gap-2 min-h-[44px]"
            >
              <span>Continue to Recovery Kit</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </form>
        )}

        {/* Step 2: Emergency Recovery Kit */}
        {step === 2 && (
          <div className="space-y-5">
            <div className="space-y-1">
              <h2 className="text-lg font-bold text-white">Your Emergency Recovery Phrase</h2>
              <p className="text-xs text-slate-400">
                If you forget your master passphrase, this 24-word phrase is the only way to recover your vault. Store it securely offline.
              </p>
            </div>

            {/* 24-word Grid */}
            <div className="grid grid-cols-3 sm:grid-cols-4 gap-2 bg-slate-950 border border-slate-800 rounded-2xl p-4 max-h-52 overflow-y-auto font-mono text-xs select-all">
              {recoveryPhrase.split(" ").map((word: string, idx: number) => (
                <div key={idx} className="flex items-center gap-1.5 text-slate-300">
                  <span className="text-slate-600 text-[10px]">{idx + 1}.</span>
                  <span>{word}</span>
                </div>
              ))}
            </div>

            <div className="flex flex-col sm:flex-row gap-2.5">
              <button
                type="button"
                onClick={handleCopyRecovery}
                className="flex-1 py-2.5 px-3 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-xl text-xs font-semibold transition-colors flex items-center justify-center gap-2 min-h-[44px]"
              >
                {hasCopiedRecovery ? (
                  <Check className="w-4 h-4 text-emerald-400" />
                ) : (
                  <Copy className="w-4 h-4" />
                )}
                <span>{hasCopiedRecovery ? "Copied Phrase" : "Copy to Clipboard"}</span>
              </button>

              <button
                type="button"
                onClick={handleDownloadEmergencyKit}
                className="flex-1 py-2.5 px-3 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-xl text-xs font-semibold transition-colors flex items-center justify-center gap-2 min-h-[44px]"
              >
                <Download className="w-4 h-4 text-purple-400" />
                <span>Download Kit (.txt)</span>
              </button>
            </div>

            <label className="flex items-start gap-2.5 p-3 rounded-xl bg-purple-500/10 border border-purple-500/20 text-xs text-purple-200 cursor-pointer">
              <input
                type="checkbox"
                checked={hasCopiedRecovery}
                onChange={(e) => setHasCopiedRecovery(e.target.checked)}
                className="mt-0.5 rounded accent-purple-500 shrink-0"
              />
              <span>
                I have saved my 24-word recovery phrase in a safe, offline location. I understand that Aegis cannot recover my vault if I lose both keys.
              </span>
            </label>

            <button
              type="button"
              disabled={!hasCopiedRecovery || isInitializing}
              onClick={handleFinalInitialize}
              className="w-full py-3 px-4 bg-purple-600 hover:bg-purple-500 disabled:opacity-50 text-white rounded-xl text-xs font-semibold shadow-md shadow-purple-600/20 transition-all flex items-center justify-center gap-2 min-h-[44px]"
            >
              {isInitializing ? (
                <>
                  <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  <span>Deriving Keys & Initializing Vault...</span>
                </>
              ) : (
                <>
                  <Check className="w-4 h-4" />
                  <span>Complete Setup & Enter Vault</span>
                </>
              )}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
