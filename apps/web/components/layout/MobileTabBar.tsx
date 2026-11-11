"use client";

import React from "react";
import { Home, KeyRound, Plus, Image as ImageIcon, Settings } from "lucide-react";
import { cn } from "@/lib/utils";
import { NavCategory } from "./Sidebar";

interface MobileTabBarProps {
  currentCategory: NavCategory;
  onSelectCategory: (cat: NavCategory) => void;
  onOpenQuickAdd: () => void;
  className?: string;
}

export function MobileTabBar({
  currentCategory,
  onSelectCategory,
  onOpenQuickAdd,
  className,
}: MobileTabBarProps) {
  const tabs = [
    { id: "all" as NavCategory, label: "Home", icon: Home },
    { id: "login" as NavCategory, label: "Vault", icon: KeyRound },
    { id: "gallery" as NavCategory, label: "Photos", icon: ImageIcon },
    { id: "settings" as NavCategory, label: "Settings", icon: Settings },
  ];

  return (
    <nav
      className={cn(
        "lg:hidden fixed bottom-0 left-0 right-0 z-40 bg-slate-950/95 backdrop-blur-lg border-t border-slate-800/80 px-2 py-1 safe-bottom",
        className
      )}
      aria-label="Mobile Navigation"
    >
      <div className="flex items-center justify-around h-14 max-w-md mx-auto relative">
        {/* Home */}
        <button
          onClick={() => onSelectCategory("all")}
          className={cn(
            "flex flex-col items-center justify-center flex-1 h-full min-w-[44px] min-h-[44px] rounded-xl transition-colors",
            currentCategory === "all" ? "text-purple-400" : "text-slate-400 hover:text-slate-200"
          )}
          aria-label="Home Dashboard"
        >
          <Home className="w-5 h-5" />
          <span className="text-[10px] mt-0.5 font-medium">Home</span>
        </button>

        {/* Vault Items */}
        <button
          onClick={() => onSelectCategory("login")}
          className={cn(
            "flex flex-col items-center justify-center flex-1 h-full min-w-[44px] min-h-[44px] rounded-xl transition-colors",
            currentCategory === "login" || currentCategory === "note" || currentCategory === "document" || currentCategory === "identity"
              ? "text-purple-400"
              : "text-slate-400 hover:text-slate-200"
          )}
          aria-label="Vault Credentials & Notes"
        >
          <KeyRound className="w-5 h-5" />
          <span className="text-[10px] mt-0.5 font-medium">Vault</span>
        </button>

        {/* Center Quick Add Trigger Button */}
        <div className="flex items-center justify-center flex-1">
          <button
            onClick={onOpenQuickAdd}
            className="w-12 h-12 rounded-full bg-purple-600 hover:bg-purple-500 active:scale-95 text-white flex items-center justify-center shadow-lg shadow-purple-600/30 transition-transform -mt-4 border-2 border-slate-950"
            aria-label="Quick Add New Vault Item"
          >
            <Plus className="w-6 h-6" />
          </button>
        </div>

        {/* Gallery */}
        <button
          onClick={() => onSelectCategory("gallery")}
          className={cn(
            "flex flex-col items-center justify-center flex-1 h-full min-w-[44px] min-h-[44px] rounded-xl transition-colors",
            currentCategory === "gallery" ? "text-purple-400" : "text-slate-400 hover:text-slate-200"
          )}
          aria-label="Private Photo Gallery"
        >
          <ImageIcon className="w-5 h-5" />
          <span className="text-[10px] mt-0.5 font-medium">Gallery</span>
        </button>

        {/* Settings */}
        <button
          onClick={() => onSelectCategory("settings")}
          className={cn(
            "flex flex-col items-center justify-center flex-1 h-full min-w-[44px] min-h-[44px] rounded-xl transition-colors",
            currentCategory === "settings" ? "text-purple-400" : "text-slate-400 hover:text-slate-200"
          )}
          aria-label="Settings and Security"
        >
          <Settings className="w-5 h-5" />
          <span className="text-[10px] mt-0.5 font-medium">Settings</span>
        </button>
      </div>
    </nav>
  );
}

