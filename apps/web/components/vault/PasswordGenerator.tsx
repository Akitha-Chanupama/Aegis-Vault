"use client";

import React, { useState, useEffect } from "react";
import { RefreshCw, Copy, Check, ShieldCheck } from "lucide-react";
import { getRandomBytes } from "@aegis/crypto";

interface PasswordGeneratorProps {
  onSelectPassword?: (password: string) => void;
  className?: string;
}

const UPPERCASE = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
const LOWERCASE = "abcdefghijklmnopqrstuvwxyz";
const NUMBERS = "0123456789";
const SYMBOLS = "!@#$%^&*()_+-=[]{}|;:,.<>?";

export function PasswordGenerator({
  onSelectPassword,
  className,
}: PasswordGeneratorProps) {
  const [length, setLength] = useState(20);
  const [useUpper, setUseUpper] = useState(true);
  const [useLower, setUseLower] = useState(true);
  const [useNumbers, setUseNumbers] = useState(true);
  const [useSymbols, setUseSymbols] = useState(true);
  const [generatedPassword, setGeneratedPassword] = useState("");
  const [copied, setCopied] = useState(false);

  const generate = () => {
    let charset = "";
    if (useUpper) charset += UPPERCASE;
    if (useLower) charset += LOWERCASE;
    if (useNumbers) charset += NUMBERS;
    if (useSymbols) charset += SYMBOLS;

    if (!charset) {
      charset = LOWERCASE;
    }

    const randomBytes = getRandomBytes(length);
    let result = "";
    for (let i = 0; i < length; i++) {
      result += charset[randomBytes[i] % charset.length];
    }

    setGeneratedPassword(result);
  };

  useEffect(() => {
    generate();
  }, [length, useUpper, useLower, useNumbers, useSymbols]);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(generatedPassword);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Fallback
    }
  };

  // Calculate approximate entropy
  let poolSize = 0;
  if (useUpper) poolSize += 26;
  if (useLower) poolSize += 26;
  if (useNumbers) poolSize += 10;
  if (useSymbols) poolSize += 28;
  const entropyBits = Math.round(length * Math.log2(poolSize || 1));

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 text-sm font-semibold text-slate-200">
          <ShieldCheck className="w-4 h-4 text-purple-400" />
          <span>Password Generator</span>
        </div>
        <span className="text-xs px-2 py-0.5 rounded-full bg-purple-500/10 text-purple-300 font-mono">
          ~{entropyBits} bits entropy
        </span>
      </div>

      {/* Generated Result Display */}
      <div className="flex items-center gap-2 bg-slate-950 border border-slate-800 rounded-xl px-3 py-2.5">
        <div className="flex-1 font-mono text-sm sm:text-base text-emerald-400 font-medium select-all break-all">
          {generatedPassword}
        </div>
        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={generate}
            className="p-2 text-slate-400 hover:text-slate-200 hover:bg-slate-800 rounded-lg transition-colors min-h-[44px] min-w-[44px] flex items-center justify-center"
            title="Generate new password"
            aria-label="Generate new password"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
          <button
            type="button"
            onClick={handleCopy}
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
        </div>
      </div>

      {/* Length Slider */}
      <div className="space-y-1.5">
        <div className="flex justify-between text-xs text-slate-400">
          <span>Length: {length}</span>
          <span className="font-mono text-slate-500">8 - 64</span>
        </div>
        <input
          type="range"
          min="8"
          max="64"
          value={length}
          onChange={(e) => setLength(Number(e.target.value))}
          className="w-full accent-purple-500 bg-slate-800 rounded-lg cursor-pointer h-2"
        />
      </div>

      {/* Character Type Toggles */}
      <div className="grid grid-cols-2 gap-2 text-xs">
        <label className="flex items-center gap-2 p-2 bg-slate-800/40 rounded-lg cursor-pointer hover:bg-slate-800/70">
          <input
            type="checkbox"
            checked={useUpper}
            onChange={(e) => setUseUpper(e.target.checked)}
            className="rounded accent-purple-500"
          />
          <span className="text-slate-300">A-Z (Uppercase)</span>
        </label>
        <label className="flex items-center gap-2 p-2 bg-slate-800/40 rounded-lg cursor-pointer hover:bg-slate-800/70">
          <input
            type="checkbox"
            checked={useLower}
            onChange={(e) => setUseLower(e.target.checked)}
            className="rounded accent-purple-500"
          />
          <span className="text-slate-300">a-z (Lowercase)</span>
        </label>
        <label className="flex items-center gap-2 p-2 bg-slate-800/40 rounded-lg cursor-pointer hover:bg-slate-800/70">
          <input
            type="checkbox"
            checked={useNumbers}
            onChange={(e) => setUseNumbers(e.target.checked)}
            className="rounded accent-purple-500"
          />
          <span className="text-slate-300">0-9 (Numbers)</span>
        </label>
        <label className="flex items-center gap-2 p-2 bg-slate-800/40 rounded-lg cursor-pointer hover:bg-slate-800/70">
          <input
            type="checkbox"
            checked={useSymbols}
            onChange={(e) => setUseSymbols(e.target.checked)}
            className="rounded accent-purple-500"
          />
          <span className="text-slate-300">!@#$% (Symbols)</span>
        </label>
      </div>

      {onSelectPassword && (
        <button
          type="button"
          onClick={() => onSelectPassword(generatedPassword)}
          className="w-full py-2 px-4 bg-purple-600 hover:bg-purple-500 text-white text-sm font-medium rounded-xl transition-colors min-h-[44px]"
        >
          Use This Password
        </button>
      )}
    </div>
  );
}
