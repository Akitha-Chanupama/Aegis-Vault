"use client";

import React, { useState } from "react";
import {
  X,
  KeyRound,
  FileText,
  CreditCard,
  FolderArchive,
  Save,
  Trash2,
  Sparkles,
  ExternalLink,
  Plus,
} from "lucide-react";
import {
  DecryptedVaultItem,
  ItemKind,
  LoginPayload,
  NotePayload,
  CardPayload,
  DocumentPayload,
  IdentityPayload,
  CustomField,
} from "@aegis/shared";
import { SecretField } from "./SecretField";
import { PasswordGenerator } from "./PasswordGenerator";
import { cn } from "@/lib/utils";

interface ItemModalProps {
  item?: DecryptedVaultItem | null;
  defaultKind?: ItemKind;
  isOpen: boolean;
  onClose: () => void;
  onSave: (payload: any, kind: ItemKind, itemId?: string) => Promise<void>;
  onDelete?: (itemId: string) => Promise<void>;
}

export function ItemModal({
  item,
  defaultKind = "login",
  isOpen,
  onClose,
  onSave,
  onDelete,
}: ItemModalProps) {
  const [kind, setKind] = useState<ItemKind>(item?.kind || defaultKind);
  const [name, setName] = useState((item?.payload as any)?.name || (item?.payload as any)?.title || (item?.payload as any)?.cardholderName || (item?.payload as any)?.fileName || (item?.payload as any)?.fullName || "");
  const [username, setUsername] = useState((item?.payload as LoginPayload)?.username || "");
  const [password, setPassword] = useState((item?.payload as LoginPayload)?.password || "");
  const [url, setUrl] = useState((item?.payload as LoginPayload)?.url || "");
  const [content, setContent] = useState((item?.payload as NotePayload)?.content || "");
  const [notes, setNotes] = useState((item?.payload as any)?.notes || "");
  const [tags, setTags] = useState<string>((item?.payload as any)?.tags?.join(", ") || "");
  const [isFavorite, setIsFavorite] = useState(Boolean((item?.payload as any)?.isFavorite));
  const [showGenerator, setShowGenerator] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Credit card fields
  const [cardNumber, setCardNumber] = useState((item?.payload as CardPayload)?.cardNumber || "");
  const [expiryMonth, setExpiryMonth] = useState((item?.payload as CardPayload)?.expiryMonth || "12");
  const [expiryYear, setExpiryYear] = useState((item?.payload as CardPayload)?.expiryYear || "2028");
  const [cvv, setCvv] = useState((item?.payload as CardPayload)?.cvv || "");

  // Personal record fields
  const [idNumber, setIdNumber] = useState((item?.payload as IdentityPayload)?.idNumber || "");

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      const parsedTags = tags
        .split(",")
        .map((t) => t.trim())
        .filter(Boolean);

      let payload: any = {};
      if (kind === "login") {
        payload = {
          name,
          username,
          password,
          url,
          notes,
          tags: parsedTags,
          isFavorite,
        };
      } else if (kind === "note") {
        payload = {
          title: name,
          content,
          tags: parsedTags,
          isFavorite,
        };
      } else if (kind === "card") {
        payload = {
          cardholderName: name,
          cardNumber,
          expiryMonth,
          expiryYear,
          cvv,
          notes,
          tags: parsedTags,
          isFavorite,
        };
      } else if (kind === "identity") {
        payload = {
          fullName: name,
          idNumber,
          notes,
          tags: parsedTags,
          isFavorite,
        };
      } else {
        payload = {
          fileName: name,
          description: notes,
          fileSize: 1024,
          fileObjectId: item?.id || "00000000-0000-0000-0000-000000000000",
          tags: parsedTags,
          isFavorite,
        };
      }

      await onSave(payload, kind, item?.id);
      onClose();
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/80 backdrop-blur-md overflow-y-auto">
      <div className="w-full max-w-lg bg-slate-900 border border-slate-800 rounded-3xl shadow-2xl overflow-hidden my-auto">
        {/* Modal Header */}
        <div className="flex items-center justify-between p-4 sm:p-6 border-b border-slate-800">
          <div className="flex items-center gap-2">
            <h2 className="text-base sm:text-lg font-bold text-white">
              {item ? "Edit Vault Item" : "New Encrypted Entry"}
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-white rounded-xl hover:bg-slate-800 min-h-[44px] min-w-[44px] flex items-center justify-center"
            aria-label="Close"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-4 sm:p-6 space-y-4 max-h-[75vh] overflow-y-auto">
          {/* Item Kind Selector (only if creating new) */}
          {!item && (
            <div className="grid grid-cols-4 gap-2 pb-2">
              {[
                { id: "login" as ItemKind, label: "Login", icon: KeyRound },
                { id: "note" as ItemKind, label: "Note", icon: FileText },
                { id: "card" as ItemKind, label: "Card", icon: CreditCard },
                { id: "identity" as ItemKind, label: "Record", icon: FolderArchive },
              ].map((k) => {
                const Icon = k.icon;
                const isSelected = kind === k.id;
                return (
                  <button
                    key={k.id}
                    type="button"
                    onClick={() => setKind(k.id)}
                    className={cn(
                      "flex flex-col items-center justify-center p-2.5 rounded-xl text-xs font-medium border transition-colors min-h-[50px]",
                      isSelected
                        ? "bg-purple-600/20 text-purple-300 border-purple-500/40"
                        : "bg-slate-950 border-slate-800 text-slate-400 hover:text-slate-200"
                    )}
                  >
                    <Icon className="w-4 h-4 mb-1" />
                    <span>{k.label}</span>
                  </button>
                );
              })}
            </div>
          )}

          {/* Name / Title */}
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-slate-300">
              {kind === "note" ? "Note Title" : kind === "card" ? "Cardholder Name" : "Item Name"}
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder={kind === "login" ? "e.g. GitHub Account" : "Title"}
              className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-sm text-slate-100 focus:border-purple-500 focus:outline-none"
              required
            />
          </div>

          {/* Login Fields */}
          {kind === "login" && (
            <>
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-slate-300">Username / Email</label>
                <input
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="user@example.com"
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-sm text-slate-100 focus:border-purple-500 focus:outline-none"
                />
              </div>

              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-medium text-slate-300">Password</label>
                  <button
                    type="button"
                    onClick={() => setShowGenerator(!showGenerator)}
                    className="text-xs text-purple-400 hover:text-purple-300 flex items-center gap-1"
                  >
                    <Sparkles className="w-3.5 h-3.5" />
                    <span>{showGenerator ? "Hide Generator" : "Generate Secure"}</span>
                  </button>
                </div>
                <input
                  type="text"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••••••"
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-sm font-mono text-slate-100 focus:border-purple-500 focus:outline-none"
                />
              </div>

              {showGenerator && (
                <PasswordGenerator
                  onSelectPassword={(gen) => {
                    setPassword(gen);
                    setShowGenerator(false);
                  }}
                />
              )}

              <div className="space-y-1.5">
                <label className="text-xs font-medium text-slate-300">Website URL</label>
                <input
                  type="url"
                  value={url}
                  onChange={(e) => setUrl(e.target.value)}
                  placeholder="https://example.com"
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-sm text-slate-100 focus:border-purple-500 focus:outline-none"
                />
              </div>
            </>
          )}

          {/* Secure Note Content */}
          {kind === "note" && (
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-slate-300">Encrypted Note Content</label>
              <textarea
                rows={6}
                value={content}
                onChange={(e) => setContent(e.target.value)}
                placeholder="Type confidential notes here..."
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-sm text-slate-100 focus:border-purple-500 focus:outline-none resize-y"
              />
            </div>
          )}

          {/* Payment Card Fields */}
          {kind === "card" && (
            <>
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-slate-300">Card Number</label>
                <input
                  type="text"
                  value={cardNumber}
                  onChange={(e) => setCardNumber(e.target.value)}
                  placeholder="•••• •••• •••• ••••"
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-sm font-mono text-slate-100 focus:border-purple-500 focus:outline-none"
                />
              </div>
              <div className="grid grid-cols-3 gap-2">
                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-slate-300">Month</label>
                  <input
                    type="text"
                    value={expiryMonth}
                    onChange={(e) => setExpiryMonth(e.target.value)}
                    placeholder="12"
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-sm font-mono text-slate-100 focus:border-purple-500 focus:outline-none"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-slate-300">Year</label>
                  <input
                    type="text"
                    value={expiryYear}
                    onChange={(e) => setExpiryYear(e.target.value)}
                    placeholder="2028"
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-sm font-mono text-slate-100 focus:border-purple-500 focus:outline-none"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-slate-300">CVV</label>
                  <input
                    type="password"
                    value={cvv}
                    onChange={(e) => setCvv(e.target.value)}
                    placeholder="•••"
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-sm font-mono text-slate-100 focus:border-purple-500 focus:outline-none"
                  />
                </div>
              </div>
            </>
          )}

          {/* Identity Record Fields */}
          {kind === "identity" && (
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-slate-300">Identification / License Number</label>
              <input
                type="text"
                value={idNumber}
                onChange={(e) => setIdNumber(e.target.value)}
                placeholder="ID-987654321"
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-sm font-mono text-slate-100 focus:border-purple-500 focus:outline-none"
              />
            </div>
          )}

          {/* Tags */}
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-slate-300">Tags (comma separated)</label>
            <input
              type="text"
              value={tags}
              onChange={(e) => setTags(e.target.value)}
              placeholder="personal, banking, priority"
              className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-sm text-slate-100 focus:border-purple-500 focus:outline-none"
            />
          </div>

          {/* Notes */}
          {kind !== "note" && (
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-slate-300">Notes</label>
              <textarea
                rows={2}
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Additional private notes..."
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-sm text-slate-100 focus:border-purple-500 focus:outline-none resize-none"
              />
            </div>
          )}

          {/* Favorite Toggle */}
          <label className="flex items-center gap-2 p-3 bg-slate-950 border border-slate-800 rounded-xl cursor-pointer hover:bg-slate-800/40">
            <input
              type="checkbox"
              checked={isFavorite}
              onChange={(e) => setIsFavorite(e.target.checked)}
              className="rounded accent-purple-500"
            />
            <span className="text-xs font-medium text-slate-300">Mark as Favorite</span>
          </label>

          {/* Modal Actions */}
          <div className="flex items-center justify-between pt-4 border-t border-slate-800">
            {item && onDelete ? (
              <button
                type="button"
                onClick={async () => {
                  if (confirm("Move this encrypted item to trash?")) {
                    await onDelete(item.id);
                    onClose();
                  }
                }}
                className="px-3.5 py-2.5 text-red-400 hover:text-red-300 hover:bg-red-500/10 rounded-xl text-xs font-medium transition-colors flex items-center gap-1.5 min-h-[44px]"
              >
                <Trash2 className="w-4 h-4" />
                <span>Delete</span>
              </button>
            ) : <div />}

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-xs font-semibold transition-colors min-h-[44px]"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isSubmitting || !name}
                className="px-5 py-2.5 bg-purple-600 hover:bg-purple-500 text-white rounded-xl text-xs font-semibold shadow-md shadow-purple-600/20 transition-colors flex items-center gap-1.5 min-h-[44px]"
              >
                <Save className="w-4 h-4" />
                <span>{isSubmitting ? "Encrypting..." : "Save Encrypted"}</span>
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}

