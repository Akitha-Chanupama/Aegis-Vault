"use client";

import React, { useState } from "react";
import {
  Shield,
  KeyRound,
  Download,
  Upload,
  Clock,
  Laptop,
  Smartphone,
  Trash2,
  Check,
  AlertTriangle,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface SettingsViewProps {
  onExportVault: () => void;
  onImportVault: (data: string) => void;
  autoLockMinutes: number;
  onSetAutoLock: (minutes: number) => void;
  onChangePassphrase: (oldPass: string, newPass: string) => Promise<boolean>;
}

export function SettingsView({
  onExportVault,
  onImportVault,
  autoLockMinutes,
  onSetAutoLock,
  onChangePassphrase,
}: SettingsViewProps) {
  const [oldPass, setOldPass] = useState("");
  const [newPass, setNewPass] = useState("");
  const [confirmPass, setConfirmPass] = useState("");
  const [passStatus, setPassStatus] = useState<string | null>(null);
  const [isChangingPass, setIsChangingPass] = useState(false);

  // Synthetic sessions list
  const [sessions, setSessions] = useState([
    {
      id: "sess-1",
      device: "Windows Chrome (Current Device)",
      ip: "192.168.1.104",
      lastActive: "Active now",
      isCurrent: true,
      icon: Laptop,
    },
    {
      id: "sess-2",
      device: "iPhone Safari (PWA)",
      ip: "172.56.21.90",
      lastActive: "2 hours ago",
      isCurrent: false,
      icon: Smartphone,
    },
  ]);

  const handlePassChange = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newPass !== confirmPass) {
      setPassStatus("New passphrases do not match.");
      return;
    }
    if (newPass.length < 12) {
      setPassStatus("New passphrase must be at least 12 characters.");
      return;
    }

    setIsChangingPass(true);
    try {
      const ok = await onChangePassphrase(oldPass, newPass);
      if (ok) {
        setPassStatus("Vault root key re-wrapped and passphrase successfully updated!");
        setOldPass("");
        setNewPass("");
        setConfirmPass("");
      } else {
        setPassStatus("Incorrect old passphrase. KEK derivation failed.");
      }
    } finally {
      setIsChangingPass(false);
    }
  };

  const handleRevokeSession = (id: string) => {
    setSessions(sessions.filter((s) => s.id !== id));
  };

  return (
    <div className="max-w-3xl space-y-8">
      <div>
        <h1 className="text-xl sm:text-2xl font-bold text-white tracking-tight">
          Security & Vault Settings
        </h1>
        <p className="text-xs sm:text-sm text-slate-400 mt-1">
          Manage local key derivation, active device sessions, auto-lock policies, and backups.
        </p>
      </div>

      {/* Auto-Lock Policy */}
      <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-5 sm:p-6 space-y-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-purple-600/20 text-purple-400 flex items-center justify-center">
            <Clock className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-white">Auto-Lock Inactivity Timer</h3>
            <p className="text-xs text-slate-400">
              Vault keys in browser memory are purged when idle to prevent unauthorized access.
            </p>
          </div>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-2">
          {[1, 5, 15, 30].map((mins) => (
            <button
              key={mins}
              type="button"
              onClick={() => onSetAutoLock(mins)}
              className={cn(
                "p-3 rounded-xl border text-xs font-semibold transition-colors min-h-[44px]",
                autoLockMinutes === mins
                  ? "bg-purple-600/20 text-purple-300 border-purple-500/40"
                  : "bg-slate-950 border-slate-800 text-slate-400 hover:text-slate-200"
              )}
            >
              {mins} {mins === 1 ? "Minute" : "Minutes"}
            </button>
          ))}
        </div>
      </div>

      {/* Active Device Sessions */}
      <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-5 sm:p-6 space-y-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-blue-600/20 text-blue-400 flex items-center justify-center">
            <Laptop className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-white">Active Device Sessions</h3>
            <p className="text-xs text-slate-400">
              Revoking a session prevents that device from fetching future synchronization updates.
            </p>
          </div>
        </div>

        <div className="space-y-2 pt-2">
          {sessions.map((sess) => {
            const Icon = sess.icon;
            return (
              <div
                key={sess.id}
                className="flex items-center justify-between p-3.5 bg-slate-950 border border-slate-800 rounded-xl"
              >
                <div className="flex items-center gap-3">
                  <Icon className="w-4 h-4 text-slate-400" />
                  <div>
                    <div className="text-xs font-semibold text-slate-200 flex items-center gap-2">
                      <span>{sess.device}</span>
                      {sess.isCurrent && (
                        <span className="text-[10px] px-1.5 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                          Current
                        </span>
                      )}
                    </div>
                    <div className="text-[10px] text-slate-500 font-mono">
                      IP: {sess.ip} • {sess.lastActive}
                    </div>
                  </div>
                </div>

                {!sess.isCurrent && (
                  <button
                    type="button"
                    onClick={() => handleRevokeSession(sess.id)}
                    className="text-xs text-red-400 hover:text-red-300 py-1.5 px-3 rounded-lg hover:bg-red-500/10 transition-colors min-h-[44px]"
                  >
                    Revoke
                  </button>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Change Vault Passphrase Wizard */}
      <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-5 sm:p-6 space-y-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-amber-600/20 text-amber-400 flex items-center justify-center">
            <KeyRound className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-white">Change Master Vault Passphrase</h3>
            <p className="text-xs text-slate-400">
              Derives a new KEK with Argon2id and re-wraps the Vault Root Key without re-encrypting records.
            </p>
          </div>
        </div>

        {passStatus && (
          <div className="p-3 rounded-xl bg-purple-500/10 border border-purple-500/20 text-purple-300 text-xs">
            {passStatus}
          </div>
        )}

        <form onSubmit={handlePassChange} className="space-y-3 pt-2">
          <input
            type="password"
            value={oldPass}
            onChange={(e) => setOldPass(e.target.value)}
            placeholder="Current master passphrase"
            className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-xs sm:text-sm text-slate-100 focus:border-purple-500 focus:outline-none"
            required
          />
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <input
              type="password"
              value={newPass}
              onChange={(e) => setNewPass(e.target.value)}
              placeholder="New strong passphrase (12+ chars)"
              className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-xs sm:text-sm text-slate-100 focus:border-purple-500 focus:outline-none"
              required
            />
            <input
              type="password"
              value={confirmPass}
              onChange={(e) => setConfirmPass(e.target.value)}
              placeholder="Confirm new passphrase"
              className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-xs sm:text-sm text-slate-100 focus:border-purple-500 focus:outline-none"
              required
            />
          </div>
          <button
            type="submit"
            disabled={isChangingPass || !oldPass || !newPass}
            className="px-4 py-2.5 bg-purple-600 hover:bg-purple-500 text-white rounded-xl text-xs font-semibold shadow-md shadow-purple-600/20 transition-colors min-h-[44px]"
          >
            {isChangingPass ? "Re-wrapping Root Key..." : "Update Passphrase"}
          </button>
        </form>
      </div>

      {/* Backup and Restore */}
      <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-5 sm:p-6 space-y-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-emerald-600/20 text-emerald-400 flex items-center justify-center">
            <Download className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-white">Encrypted Backup & Portability</h3>
            <p className="text-xs text-slate-400">
              Download an authenticated, encrypted archive containing your envelopes and recovery metadata.
            </p>
          </div>
        </div>

        <div className="flex flex-col sm:flex-row gap-3 pt-2">
          <button
            type="button"
            onClick={onExportVault}
            className="flex-1 py-3 px-4 bg-slate-950 hover:bg-slate-900 border border-slate-800 hover:border-purple-500/30 rounded-xl text-xs font-semibold text-slate-200 flex items-center justify-center gap-2 transition-colors min-h-[44px]"
          >
            <Download className="w-4 h-4 text-purple-400" />
            <span>Export Encrypted Vault</span>
          </button>

          <label className="flex-1 py-3 px-4 bg-slate-950 hover:bg-slate-900 border border-slate-800 hover:border-purple-500/30 rounded-xl text-xs font-semibold text-slate-200 flex items-center justify-center gap-2 transition-colors cursor-pointer min-h-[44px]">
            <Upload className="w-4 h-4 text-emerald-400" />
            <span>Restore From Backup</span>
            <input
              type="file"
              accept=".json"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) {
                  const reader = new FileReader();
                  reader.onload = (event) => {
                    const text = event.target?.result as string;
                    onImportVault(text);
                  };
                  reader.readAsText(file);
                }
              }}
              className="hidden"
            />
          </label>
        </div>
      </div>
    </div>
  );
}

