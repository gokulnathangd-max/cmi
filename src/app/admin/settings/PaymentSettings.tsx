"use client";

import React, { useState } from "react";
import { toast } from "sonner";
import { CreditCard, Zap, ShieldAlert, RefreshCw } from "lucide-react";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";

interface PaymentSettingsProps {
  initialValue: boolean;
  integrationId: string;
  providerName: string;
  description: string;
}

export default function PaymentSettings({
  initialValue,
  integrationId,
  providerName,
  description,
}: PaymentSettingsProps) {
  const [isActive, setIsActive] = useState(initialValue);
  const [isSyncing, setIsSyncing] = useState(false);

  const handleToggle = async () => {
    if (isSyncing) return; // Prevent double-submission loops

    const previousState = isActive;
    const nextState = !previousState;

    // 1. Optimistic Update
    setIsActive(nextState);
    setIsSyncing(true);

    try {
      // 2. Network Sync Handshake
      const response = await fetch(`/api/admin/integrations/${integrationId}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ isActive: nextState }),
      });

      if (!response.ok) {
        throw new Error("Failed to persist toggle state on the server.");
      }

      toast.success(
        `${providerName} integration has been ${
          nextState ? "enabled" : "disabled"
        } successfully.`
      );
    } catch (error) {
      console.error("[SETTINGS_TOGGLE_ERROR]", error);
      
      // 3. Rollback State on Failure
      setIsActive(previousState);
      
      toast.error(
        `Failed to update settings: Connection lost or server returned an error. Reverted to previous state.`,
        {
          icon: <ShieldAlert className="w-5 h-5 text-red-500" />,
        }
      );
    } finally {
      setIsSyncing(false);
    }
  };

  return (
    <div className="bg-white/5 border border-white/10 rounded-[2rem] p-6 md:p-8 backdrop-blur-xl relative overflow-hidden max-w-xl shadow-2xl">
      {/* Subtle Background Glows */}
      <div className="absolute -top-10 -left-10 w-32 h-32 bg-primary/5 blur-[50px] rounded-full pointer-events-none" />
      <div className="absolute -bottom-10 -right-10 w-32 h-32 bg-primary/5 blur-[50px] rounded-full pointer-events-none" />

      <div className="relative z-10 flex items-start justify-between gap-6">
        <div className="flex gap-4">
          <div className="w-12 h-12 rounded-2xl bg-primary/10 border border-primary/20 flex items-center justify-center text-primary shrink-0">
            <CreditCard className="w-6 h-6" />
          </div>
          <div>
            <h3 className="text-lg font-heading font-bold text-white uppercase tracking-wider flex items-center gap-2">
              {providerName} Gateway
              {isSyncing && (
                <RefreshCw className="w-3.5 h-3.5 text-primary animate-spin" />
              )}
            </h3>
            <p className="text-gray-400 text-sm mt-1 leading-relaxed">
              {description}
            </p>
          </div>
        </div>

        {/* Custom Toggle Switch */}
        <button
          onClick={handleToggle}
          disabled={isSyncing}
          className={cn(
            "relative inline-flex h-7 w-12 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out outline-none focus:ring-1 focus:ring-primary focus:ring-offset-1 focus:ring-offset-black disabled:opacity-50 disabled:cursor-not-allowed",
            isActive ? "bg-primary" : "bg-white/10"
          )}
          role="switch"
          aria-checked={isActive}
        >
          <span className="sr-only">Toggle Integration</span>
          <span
            className={cn(
              "pointer-events-none inline-block h-6 w-6 transform rounded-full bg-black shadow ring-0 transition duration-200 ease-in-out flex items-center justify-center",
              isActive ? "translate-x-5 bg-black" : "translate-x-0 bg-gray-400"
            )}
          >
            {isActive && <Zap className="w-3.5 h-3.5 text-primary fill-primary" />}
          </span>
        </button>
      </div>

      <div className="mt-6 pt-6 border-t border-white/5 flex items-center gap-2 text-xs text-gray-500 font-mono">
        <div
          className={cn(
            "w-2 h-2 rounded-full",
            isActive ? "bg-green-500 animate-pulse" : "bg-red-500"
          )}
        />
        <span>STATUS: {isActive ? "LIVE / RUNNING" : "DEACTIVATED"}</span>
      </div>
    </div>
  );
}