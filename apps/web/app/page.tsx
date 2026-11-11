"use client";

import React, { useState, useEffect, useRef, useMemo } from "react";
import { AppShell } from "@/components/layout/AppShell";
import { NavCategory } from "@/components/layout/Sidebar";
import { VaultLockScreen } from "@/components/vault/VaultLockScreen";
import { OnboardingWizard } from "@/components/vault/OnboardingWizard";
import { DashboardOverview } from "@/components/vault/DashboardOverview";
import { ItemCard } from "@/components/vault/ItemCard";
import { ItemModal } from "@/components/vault/ItemModal";
import { GalleryGrid } from "@/components/vault/GalleryGrid";
import { SettingsView } from "@/components/vault/SettingsView";
import { EmptyState } from "@/components/vault/EmptyState";
import {
  DecryptedVaultItem,
  ItemKind,
  ItemEncryptionEnvelope,
  VaultKeyEnvelope,
} from "@aegis/shared";
import {
  generateVaultRootKey,
  generateKdfSalt,
  deriveKeyArgon2id,
  importRawKey,
  exportRawKey,
  wrapVaultRootKey,
  unwrapVaultRootKey,
  encryptItemEnvelope,
  decryptItemEnvelope,
  deriveRecoveryKey,
  wrapWithRecoveryKey,
  unwrapWithRecoveryKey,
  DEFAULT_ARGON2_PARAMS,
  uint8ArrayToBase64,
  base64ToUint8Array,
} from "@aegis/crypto";
import {
  saveEncryptedEnvelopesToStorage,
  loadEncryptedEnvelopesFromStorage,
  saveKeyEnvelopeToStorage,
  loadKeyEnvelopeFromStorage,
} from "@/lib/offline-storage";

// Synthetic initial demonstration data (Purely fake test accounts)
const SYNTHETIC_USER_ID = "00000000-0000-4000-8000-000000000001";
const SYNTHETIC_VAULT_ID = "00000000-0000-4000-8000-000000000002";
const DEFAULT_PASSPHRASE = "12345678";

export default function VaultPage() {
  const [isInitialized, setIsInitialized] = useState(false);
  const [isLocked, setIsLocked] = useState(true);
  const [currentCategory, setCurrentCategory] = useState<NavCategory>("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [autoLockMinutes, setAutoLockMinutes] = useState(5);
  const [isOnline, setIsOnline] = useState(true);

  // Search input ref for keyboard shortcut focusing
  const searchInputRef = useRef<HTMLInputElement | null>(null);

  // Cryptographic In-Memory Key References (Purged on Lock)
  const vrkRef = useRef<CryptoKey | null>(null);
  const keyEnvelopeRef = useRef<VaultKeyEnvelope | null>(null);

  // Online / Offline Network Listener
  useEffect(() => {
    setIsOnline(typeof navigator !== "undefined" ? navigator.onLine : true);
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);
    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, []);

  // Global Keyboard Shortcuts (Ctrl+K: Search, Ctrl+N: Quick Add, Ctrl+L: Lock)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const isCmdOrCtrl = e.metaKey || e.ctrlKey;

      if (isCmdOrCtrl && e.key.toLowerCase() === "k") {
        e.preventDefault();
        const searchInput = document.querySelector('input[type="search"]') as HTMLInputElement;
        searchInput?.focus();
      } else if (isCmdOrCtrl && e.key.toLowerCase() === "n") {
        e.preventDefault();
        setSelectedItem(null);
        setModalKind("login");
        setIsModalOpen(true);
      } else if (isCmdOrCtrl && e.key.toLowerCase() === "l") {
        e.preventDefault();
        handleLockVault();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isLocked]);

  // In-Memory Persistent Envelopes (Ciphertext only)
  const [envelopes, setEnvelopes] = useState<ItemEncryptionEnvelope[]>([]);

  // In-Memory Decrypted Items (Purged on lock)
  const [decryptedItems, setDecryptedItems] = useState<DecryptedVaultItem[]>([]);

  // Item Modal & Editing State
  const [selectedItem, setSelectedItem] = useState<DecryptedVaultItem | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalKind, setModalKind] = useState<ItemKind>("login");

  // Inactivity Auto-Lock Timer
  const inactivityTimerRef = useRef<NodeJS.Timeout | null>(null);

  const resetInactivityTimer = () => {
    if (inactivityTimerRef.current) clearTimeout(inactivityTimerRef.current);
    if (!isLocked && autoLockMinutes > 0) {
      inactivityTimerRef.current = setTimeout(() => {
        handleLockVault();
      }, autoLockMinutes * 60 * 1000);
    }
  };

  useEffect(() => {
    const handleActivity = () => resetInactivityTimer();
    window.addEventListener("mousemove", handleActivity);
    window.addEventListener("keydown", handleActivity);
    window.addEventListener("touchstart", handleActivity);

    // Lock on browser tab visibility hidden if user departs
    const handleVisibilityChange = () => {
      if (document.hidden && autoLockMinutes <= 1) {
        handleLockVault();
      }
    };
    document.addEventListener("visibilitychange", handleVisibilityChange);

    return () => {
      window.removeEventListener("mousemove", handleActivity);
      window.removeEventListener("keydown", handleActivity);
      window.removeEventListener("touchstart", handleActivity);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      if (inactivityTimerRef.current) clearTimeout(inactivityTimerRef.current);
    };
  }, [isLocked, autoLockMinutes]);

  // Initial synthetic setup on first mount for instant usability
  useEffect(() => {
    async function setupDemoVault() {
      try {
        // 1. Check if user already has cached key envelope and ciphertext envelopes
        const cachedKeyEnvelope = loadKeyEnvelopeFromStorage();
        const cachedEnvelopes = loadEncryptedEnvelopesFromStorage();
        if (cachedKeyEnvelope && cachedEnvelopes && cachedEnvelopes.length > 0) {
          keyEnvelopeRef.current = cachedKeyEnvelope;
          setEnvelopes(cachedEnvelopes);
          setIsInitialized(true);
          setIsLocked(true);
          return;
        }

        const vrk = await generateVaultRootKey();
        const salt = generateKdfSalt();
        const testParams = { m: 16384, t: 1, p: 1 }; // Fast for dev client UI
        const kekBytes = await deriveKeyArgon2id(DEFAULT_PASSPHRASE, salt, testParams);
        const kek = await importRawKey(kekBytes);

        const { wrappedRootKey, wrapNonce } = await wrapVaultRootKey(
          vrk,
          kek,
          SYNTHETIC_VAULT_ID,
          SYNTHETIC_USER_ID
        );

        keyEnvelopeRef.current = {
          vaultId: SYNTHETIC_VAULT_ID,
          cryptoVersion: 1,
          wrappedRootKey,
          wrapNonce,
          kdfSalt: uint8ArrayToBase64(salt),
          kdfParams: testParams,
        };

        // Create initial synthetic encrypted demo items
        const initialLogins = [
          {
            id: "10000000-0000-4000-8000-000000000001",
            kind: "login" as ItemKind,
            data: {
              name: "ProtonMail (Synthetic)",
              username: "owner@proton.me",
              password: "pW9#zK7!vM2$qR5*",
              url: "https://mail.proton.me",
              notes: "Zero-knowledge email account",
              isFavorite: true,
              tags: ["email", "priority"],
            },
          },
          {
            id: "10000000-0000-4000-8000-000000000002",
            kind: "login" as ItemKind,
            data: {
              name: "GitHub Enterprise (Synthetic)",
              username: "lead-architect",
              password: "gH8%bV4@jN9^wX1&",
              url: "https://github.com",
              notes: "Code repository authentication",
              isFavorite: true,
              tags: ["dev", "work"],
            },
          },
          {
            id: "10000000-0000-4000-8000-000000000003",
            kind: "note" as ItemKind,
            data: {
              title: "Server Deployment Recovery Procedures",
              content: "1. Primary database failover keys\n2. S3 lifecycle policy verification\n3. HSTS preload configuration",
              tags: ["devops", "security"],
              isFavorite: false,
            },
          },
          {
            id: "10000000-0000-4000-8000-000000000004",
            kind: "card" as ItemKind,
            data: {
              cardholderName: "Alex Vance",
              cardNumber: "4532 8901 2345 7890",
              expiryMonth: "08",
              expiryYear: "2029",
              cvv: "789",
              notes: "Virtual spending card",
              tags: ["finance"],
              isFavorite: true,
            },
          },
        ];

        const initialEnvelopes: ItemEncryptionEnvelope[] = [];
        for (const item of initialLogins) {
          const env = await encryptItemEnvelope(
            vrk,
            SYNTHETIC_VAULT_ID,
            item.id,
            item.kind,
            1,
            item.data
          );
          initialEnvelopes.push(env);
        }

        saveKeyEnvelopeToStorage(keyEnvelopeRef.current);
        saveEncryptedEnvelopesToStorage(initialEnvelopes);
        setEnvelopes(initialEnvelopes);
        setIsInitialized(true);
        setIsLocked(true);
      } catch (err) {
        console.error("Initialization error:", err);
      }
    }

    setupDemoVault();
  }, []);

  // Unlock Vault Handler
  const handleUnlock = async (passphrase: string): Promise<boolean> => {
    if (!keyEnvelopeRef.current) return false;

    try {
      const { wrappedRootKey, wrapNonce, kdfSalt, kdfParams } = keyEnvelopeRef.current;
      const saltBytes = base64ToUint8Array(kdfSalt);
      const kekBytes = await deriveKeyArgon2id(passphrase, saltBytes, kdfParams);
      const kek = await importRawKey(kekBytes);

      const vrk = await unwrapVaultRootKey(
        wrappedRootKey,
        wrapNonce,
        kek,
        SYNTHETIC_VAULT_ID,
        SYNTHETIC_USER_ID
      );

      vrkRef.current = vrk;

      // Decrypt all envelopes in memory
      const items: DecryptedVaultItem[] = [];
      for (const env of envelopes) {
        try {
          const payload = await decryptItemEnvelope(vrk, env);
          items.push({
            id: env.itemId,
            vaultId: env.vaultId,
            kind: env.kind,
            revision: env.revision,
            isDeleted: false,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
            payload,
          });
        } catch (decryptErr) {
          console.error("Item decryption failed:", decryptErr);
        }
      }

      setDecryptedItems(items);
      setIsLocked(false);
      resetInactivityTimer();
      return true;
    } catch {
      return false;
    }
  };

  // Recovery Unlock Handler
  const handleRecoveryUnlock = async (recoveryPhrase: string): Promise<boolean> => {
    if (!keyEnvelopeRef.current || !keyEnvelopeRef.current.recoveryWrappedKey) return false;

    try {
      const recoveryKek = await deriveRecoveryKey(recoveryPhrase);
      const vrk = await unwrapWithRecoveryKey(
        keyEnvelopeRef.current.recoveryWrappedKey,
        (keyEnvelopeRef.current.recoveryMetadata as any)?.nonce || "",
        recoveryKek,
        SYNTHETIC_VAULT_ID
      );

      vrkRef.current = vrk;
      setIsLocked(false);
      return true;
    } catch {
      return false;
    }
  };

  // Lock Vault Handler
  const handleLockVault = () => {
    vrkRef.current = null; // Clear key from memory
    setDecryptedItems([]); // Purge decrypted secrets from state
    setIsLocked(true);
    setSelectedItem(null);
    setIsModalOpen(false);
    if (inactivityTimerRef.current) clearTimeout(inactivityTimerRef.current);
  };

  // Save Item (Create or Update)
  const handleSaveItem = async (payload: any, kind: ItemKind, itemId?: string) => {
    const vrk = vrkRef.current;
    if (!vrk) return;

    const id = itemId || crypto.randomUUID();
    const existingIndex = decryptedItems.findIndex((i) => i.id === id);
    const revision = existingIndex >= 0 ? decryptedItems[existingIndex].revision + 1 : 1;

    // Encrypt envelope in browser
    const newEnvelope = await encryptItemEnvelope(
      vrk,
      SYNTHETIC_VAULT_ID,
      id,
      kind,
      revision,
      payload
    );

    // Update envelopes (ciphertext)
    setEnvelopes((prev) => {
      const idx = prev.findIndex((e) => e.itemId === id);
      let next: ItemEncryptionEnvelope[];
      if (idx >= 0) {
        next = [...prev];
        next[idx] = newEnvelope;
      } else {
        next = [newEnvelope, ...prev];
      }
      saveEncryptedEnvelopesToStorage(next);
      return next;
    });

    // Update decrypted in-memory items
    const newItem: DecryptedVaultItem = {
      id,
      vaultId: SYNTHETIC_VAULT_ID,
      kind,
      revision,
      isDeleted: false,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      payload,
    };

    setDecryptedItems((prev) => {
      const idx = prev.findIndex((i) => i.id === id);
      if (idx >= 0) {
        const next = [...prev];
        next[idx] = newItem;
        return next;
      }
      return [newItem, ...prev];
    });

    resetInactivityTimer();
  };

  // Delete Item (Soft Delete / Trash)
  const handleDeleteItem = async (itemId: string) => {
    setDecryptedItems((prev) =>
      prev.map((i) => (i.id === itemId ? { ...i, isDeleted: true } : i))
    );

    const vrk = vrkRef.current;
    if (vrk) {
      const item = decryptedItems.find((i) => i.id === itemId);
      if (item) {
        const updatedPayload = { ...(item.payload as any), isDeleted: true };
        const newEnvelope = await encryptItemEnvelope(
          vrk,
          SYNTHETIC_VAULT_ID,
          itemId,
          item.kind,
          item.revision + 1,
          updatedPayload
        );
        setEnvelopes((prev) => {
          const next = prev.map((e) => (e.itemId === itemId ? newEnvelope : e));
          saveEncryptedEnvelopesToStorage(next);
          return next;
        });
      }
    }
  };

  // Toggle Favorite
  const handleToggleFavorite = (item: DecryptedVaultItem) => {
    const payload = { ...item.payload, isFavorite: !(item.payload as any).isFavorite };
    handleSaveItem(payload, item.kind, item.id);
  };

  // Onboarding Completion
  const handleOnboardingComplete = async (passphrase: string, recoveryPhrase: string) => {
    const vrk = await generateVaultRootKey();
    const salt = generateKdfSalt();
    const testParams = DEFAULT_ARGON2_PARAMS;
    const kekBytes = await deriveKeyArgon2id(passphrase, salt, testParams);
    const kek = await importRawKey(kekBytes);

    const { wrappedRootKey, wrapNonce } = await wrapVaultRootKey(
      vrk,
      kek,
      SYNTHETIC_VAULT_ID,
      SYNTHETIC_USER_ID
    );

    const recoveryKek = await deriveRecoveryKey(recoveryPhrase);
    const { recoveryWrappedKey, recoveryNonce } = await wrapWithRecoveryKey(
      vrk,
      recoveryKek,
      SYNTHETIC_VAULT_ID
    );

    keyEnvelopeRef.current = {
      vaultId: SYNTHETIC_VAULT_ID,
      cryptoVersion: 1,
      wrappedRootKey,
      wrapNonce,
      kdfSalt: uint8ArrayToBase64(salt),
      kdfParams: testParams,
      recoveryWrappedKey,
      recoveryMetadata: { nonce: recoveryNonce },
    };

    saveKeyEnvelopeToStorage(keyEnvelopeRef.current);
    saveEncryptedEnvelopesToStorage([]);

    vrkRef.current = vrk;
    setEnvelopes([]);
    setDecryptedItems([]);
    setIsInitialized(true);
    setIsLocked(false);
  };

  // Change Passphrase
  const handleChangePassphrase = async (oldPass: string, newPass: string): Promise<boolean> => {
    if (!keyEnvelopeRef.current) return false;
    const vrk = vrkRef.current;
    if (!vrk) return false;

    try {
      const newSalt = generateKdfSalt();
      const newKekBytes = await deriveKeyArgon2id(newPass, newSalt, DEFAULT_ARGON2_PARAMS);
      const newKek = await importRawKey(newKekBytes);

      const { wrappedRootKey, wrapNonce } = await wrapVaultRootKey(
        vrk,
        newKek,
        SYNTHETIC_VAULT_ID,
        SYNTHETIC_USER_ID
      );

      keyEnvelopeRef.current = {
        ...keyEnvelopeRef.current,
        wrappedRootKey,
        wrapNonce,
        kdfSalt: uint8ArrayToBase64(newSalt),
      };

      saveKeyEnvelopeToStorage(keyEnvelopeRef.current);
      return true;
    } catch {
      return false;
    }
  };

  // Export Encrypted Vault
  const handleExportVault = () => {
    const exportBundle = {
      exportVersion: 1,
      vaultId: SYNTHETIC_VAULT_ID,
      exportedAt: new Date().toISOString(),
      keyEnvelope: keyEnvelopeRef.current,
      envelopes,
    };
    const jsonStr = JSON.stringify(exportBundle, null, 2);
    const blob = new Blob([jsonStr], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `aegis-vault-encrypted-backup-${Date.now()}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  // Import Encrypted Vault
  const handleImportVault = async (jsonStr: string) => {
    try {
      const bundle = JSON.parse(jsonStr);
      if (bundle.exportVersion !== 1 || !Array.isArray(bundle.envelopes)) {
        alert("Invalid Aegis Vault export format.");
        return;
      }
      setEnvelopes(bundle.envelopes);
      saveEncryptedEnvelopesToStorage(bundle.envelopes);
      alert("Envelopes imported successfully. Unlock vault to view contents.");
    } catch {
      alert("Failed to parse vault backup JSON file.");
    }
  };

  // Upload Media Handler (Simulated Client-Side Image Encryption)
  const handleUploadMedia = async (file: File) => {
    const vrk = vrkRef.current;
    if (!vrk) return;

    const payload = {
      fileName: file.name,
      mimeType: file.type || "image/jpeg",
      fileSize: file.size,
      fileObjectId: crypto.randomUUID(),
      tags: ["media", "encrypted"],
      isFavorite: false,
    };

    await handleSaveItem(payload, "document");
  };

  // Filtered Items Computation
  const activeItems = useMemo(
    () => decryptedItems.filter((item) => (currentCategory === "trash" ? item.isDeleted : !item.isDeleted)),
    [decryptedItems, currentCategory]
  );

  const filteredItems = useMemo(() => {
    let result = activeItems;

    // Category filter
    if (currentCategory === "login") result = result.filter((i) => i.kind === "login");
    if (currentCategory === "note") result = result.filter((i) => i.kind === "note");
    if (currentCategory === "gallery") {
      result = result.filter((i) => (i.payload as any).mimeType?.startsWith("image/"));
    }
    if (currentCategory === "document") result = result.filter((i) => i.kind === "document");
    if (currentCategory === "identity") result = result.filter((i) => i.kind === "card" || i.kind === "identity");
    if (currentCategory === "favorites") result = result.filter((i) => (i.payload as any).isFavorite);

    // Search query filter (In-memory transient matching)
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      result = result.filter((item) => {
        const p = item.payload as any;
        const nameMatch = (p.name || p.title || p.cardholderName || p.fileName || p.fullName || "").toLowerCase().includes(q);
        const userMatch = (p.username || "").toLowerCase().includes(q);
        const urlMatch = (p.url || "").toLowerCase().includes(q);
        const tagMatch = (p.tags || []).some((t: string) => t.toLowerCase().includes(q));
        return nameMatch || userMatch || urlMatch || tagMatch;
      });
    }

    return result;
  }, [activeItems, currentCategory, searchQuery]);

  const itemCounts = useMemo(() => {
    const nonDeleted = decryptedItems.filter((i) => !i.isDeleted);
    return {
      all: nonDeleted.length,
      login: nonDeleted.filter((i) => i.kind === "login").length,
      note: nonDeleted.filter((i) => i.kind === "note").length,
      gallery: nonDeleted.filter((i) => (i.payload as any).mimeType?.startsWith("image/")).length,
      document: nonDeleted.filter((i) => i.kind === "document").length,
      identity: nonDeleted.filter((i) => i.kind === "card" || i.kind === "identity").length,
      favorites: nonDeleted.filter((i) => (i.payload as any).isFavorite).length,
      trash: decryptedItems.filter((i) => i.isDeleted).length,
    };
  }, [decryptedItems]);

  return (
    <>
      {/* 1. First-Run Setup Wizard */}
      {!isInitialized && (
        <OnboardingWizard onComplete={handleOnboardingComplete} />
      )}

      {/* 2. Security Lock Screen */}
      {isInitialized && isLocked && (
        <VaultLockScreen
          isLocked={isLocked}
          onUnlock={handleUnlock}
          onRecoveryUnlock={handleRecoveryUnlock}
        />
      )}

      {/* 3. Main Unlocked Application Shell */}
      {isInitialized && !isLocked && (
        <AppShell
          currentCategory={currentCategory}
          onSelectCategory={setCurrentCategory}
          onLockVault={handleLockVault}
          onOpenQuickAdd={() => {
            setSelectedItem(null);
            setModalKind("login");
            setIsModalOpen(true);
          }}
          searchQuery={searchQuery}
          onSearchChange={setSearchQuery}
          itemCounts={itemCounts}
          syncStatus={isOnline ? "synced" : "offline"}
        >
          {/* Offline Warning Banner */}
          {!isOnline && (
            <div className="mb-4 p-3.5 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-amber-300 text-xs flex items-center justify-between">
              <span>You are currently offline. Vault entries remain accessible in memory. Edits will sync once connection resumes.</span>
              <span className="font-mono text-[10px] px-2 py-0.5 rounded bg-amber-500/20">Offline Mode</span>
            </div>
          )}
          {/* Dashboard Overview */}
          {currentCategory === "all" && !searchQuery && (
            <DashboardOverview
              items={decryptedItems}
              onSelectCategory={setCurrentCategory}
              onSelectItem={(item) => {
                setSelectedItem(item);
                setIsModalOpen(true);
              }}
              onOpenQuickAdd={() => {
                setSelectedItem(null);
                setModalKind("login");
                setIsModalOpen(true);
              }}
              onToggleFavorite={handleToggleFavorite}
            />
          )}

          {/* Photo Gallery View */}
          {currentCategory === "gallery" && (
            <GalleryGrid
              items={decryptedItems}
              onUploadMedia={handleUploadMedia}
              onDeleteMedia={handleDeleteItem}
            />
          )}

          {/* Settings & Security View */}
          {currentCategory === "settings" && (
            <SettingsView
              onExportVault={handleExportVault}
              onImportVault={handleImportVault}
              autoLockMinutes={autoLockMinutes}
              onSetAutoLock={setAutoLockMinutes}
              onChangePassphrase={handleChangePassphrase}
            />
          )}

          {/* Item List Views (Passwords, Notes, Documents, Records, Favorites, Trash, Search) */}
          {currentCategory !== "gallery" && currentCategory !== "settings" && (currentCategory !== "all" || searchQuery) && (
            <div className="space-y-4">
              <div className="flex items-center justify-between pb-2 border-b border-slate-800/80">
                <div className="flex items-center gap-2">
                  <h1 className="text-lg font-bold text-white capitalize">
                    {searchQuery ? `Search Results for "${searchQuery}"` : currentCategory}
                  </h1>
                  <span className="text-xs px-2 py-0.5 rounded-full bg-slate-800 text-slate-400 font-mono">
                    {filteredItems.length}
                  </span>
                </div>

                <button
                  type="button"
                  onClick={() => {
                    setSelectedItem(null);
                    setModalKind(currentCategory === "note" ? "note" : "login");
                    setIsModalOpen(true);
                  }}
                  className="text-xs text-purple-400 hover:text-purple-300 font-semibold"
                >
                  + Add Item
                </button>
              </div>

              {filteredItems.length === 0 ? (
                <EmptyState
                  title={searchQuery ? "No matching records found" : `No ${currentCategory} items`}
                  description={
                    searchQuery
                      ? "Try searching for a different term or clear the filter."
                      : "Create your first encrypted record using the quick add button."
                  }
                  actionLabel="+ Create Entry"
                  onAction={() => {
                    setSelectedItem(null);
                    setModalKind(currentCategory === "note" ? "note" : "login");
                    setIsModalOpen(true);
                  }}
                />
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {filteredItems.map((item) => (
                    <ItemCard
                      key={item.id}
                      item={item}
                      onSelect={(i) => {
                        setSelectedItem(i);
                        setIsModalOpen(true);
                      }}
                      onToggleFavorite={handleToggleFavorite}
                    />
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Item Create / Edit Modal */}
          {isModalOpen && (
            <ItemModal
              isOpen={isModalOpen}
              item={selectedItem}
              defaultKind={modalKind}
              onClose={() => {
                setIsModalOpen(false);
                setSelectedItem(null);
              }}
              onSave={handleSaveItem}
              onDelete={handleDeleteItem}
            />
          )}
        </AppShell>
      )}
    </>
  );
}

