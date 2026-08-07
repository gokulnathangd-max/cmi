"use client";

import { useState, useEffect } from "react";
import { CreditCard, Key, ShieldCheck, Loader2, CheckCircle2, XCircle } from "lucide-react";
import { toast } from "sonner";

interface PaymentSettingsData {
  razorpayEnabled: boolean;
  keyId: string;
  keySecretMasked: string;
  keySecretConfigured: boolean;
  webhookSecretMasked: string;
  webhookSecretConfigured: boolean;
}

/**
 * PaymentSettings Component
 * Admin UI for managing dynamic Razorpay Gateway settings
 * Features optimistic UI updates, toast alerts, and atomic backend persistence.
 */
export default function PaymentSettings() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [razorpayEnabled, setRazorpayEnabled] = useState(true);
  const [keyId, setKeyId] = useState("");
  const [keySecret, setKeySecret] = useState("");
  const [webhookSecret, setWebhookSecret] = useState("");

  const [keySecretMasked, setKeySecretMasked] = useState("");
  const [webhookSecretMasked, setWebhookSecretMasked] = useState("");

  useEffect(() => {
    fetchSettings();
  }, []);

  const fetchSettings = async () => {
    try {
      setLoading(true);
      const res = await fetch("/api/admin/settings/payment");
      const data = await res.json();

      if (res.ok && data.success) {
        const settings: PaymentSettingsData = data.data;
        setRazorpayEnabled(settings.razorpayEnabled);
        setKeyId(settings.keyId || "");
        setKeySecretMasked(settings.keySecretMasked || "");
        setWebhookSecretMasked(settings.webhookSecretMasked || "");
      } else {
        toast.error("Failed to load payment settings");
      }
    } catch (error) {
      console.error("[PaymentSettings Fetch]", error);
      toast.error("Error fetching payment configuration");
    } finally {
      setLoading(false);
    }
  };

  /**
   * Optimistic toggle for enabling/disabling Razorpay gateway
   */
  const handleToggleEnable = async (newValue: boolean) => {
    const previousValue = razorpayEnabled;
    // 1. Optimistic Update
    setRazorpayEnabled(newValue);

    try {
      const res = await fetch("/api/admin/settings/payment", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ razorpayEnabled: newValue }),
      });

      const responseData = await res.json();
      if (!res.ok || !responseData.success) {
        // Rollback on error
        setRazorpayEnabled(previousValue);
        toast.error("Failed to update gateway status. Reverted.");
      } else {
        toast.success(
          `Razorpay Gateway ${newValue ? "enabled" : "disabled"} successfully!`
        );
      }
    } catch (error) {
      // Rollback on network failure
      setRazorpayEnabled(previousValue);
      toast.error("Network error updating gateway toggle. Reverted.");
    }
  };

  const handleSaveCredentials = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);

    try {
      const payload: Record<string, unknown> = {
        razorpayEnabled,
        keyId,
      };

      if (keySecret && !keySecret.includes("••••")) {
        payload.keySecret = keySecret;
      }

      if (webhookSecret && !webhookSecret.includes("••••")) {
        payload.webhookSecret = webhookSecret;
      }

      const res = await fetch("/api/admin/settings/payment", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const responseData = await res.json();

      if (res.ok && responseData.success) {
        toast.success("Razorpay credentials saved successfully!");
        setKeySecret("");
        setWebhookSecret("");
        await fetchSettings();
      } else {
        toast.error(responseData.error || "Failed to save credentials");
      }
    } catch (error) {
      console.error("[PaymentSettings Save]", error);
      toast.error("Error saving payment credentials");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-12 text-gray-400 gap-3">
        <Loader2 className="w-5 h-5 animate-spin text-primary" />
        <span>Loading payment settings...</span>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-300">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h2 className="text-xl font-heading font-bold text-white mb-1">
            Payment Gateways
          </h2>
          <p className="text-sm text-gray-400">
            Manage Razorpay zero-trust integration & administrative settings.
          </p>
        </div>
      </div>

      <div className="p-6 rounded-2xl border border-white/10 bg-black/60 space-y-6">
        {/* Header Toggle Row */}
        <div className="flex items-center justify-between pb-6 border-b border-white/10">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center text-primary shrink-0">
              <CreditCard className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-3">
                <h3 className="font-bold text-white text-lg">Razorpay Integration</h3>
                {razorpayEnabled ? (
                  <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-green-500/20 text-green-400 border border-green-500/30 uppercase tracking-wider">
                    <CheckCircle2 className="w-3 h-3" /> Active
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-red-500/20 text-red-400 border border-red-500/30 uppercase tracking-wider">
                    <XCircle className="w-3 h-3" /> Disabled
                  </span>
                )}
              </div>
              <p className="text-xs text-gray-400 mt-1">
                Accept UPI, Cards, NetBanking with zero-trust server validation.
              </p>
            </div>
          </div>

          {/* Optimistic Switch */}
          <label className="relative inline-flex items-center cursor-pointer">
            <input
              type="checkbox"
              checked={razorpayEnabled}
              onChange={(e) => handleToggleEnable(e.target.checked)}
              className="sr-only peer"
            />
            <div className="w-12 h-7 bg-white/10 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-black after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-6 after:w-6 after:transition-all peer-checked:bg-primary"></div>
          </label>
        </div>

        {/* Credentials Form */}
        <form onSubmit={handleSaveCredentials} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-xs uppercase tracking-widest text-gray-400 font-semibold flex items-center gap-1.5">
                <Key className="w-3.5 h-3.5 text-primary" /> Razorpay Key ID (Public)
              </label>
              <input
                type="text"
                value={keyId}
                onChange={(e) => setKeyId(e.target.value)}
                placeholder="rzp_test_xxxxxxxxxxxx"
                className="w-full bg-black/80 border border-white/10 rounded-xl px-4 py-2.5 text-white text-sm font-mono focus:outline-none focus:border-primary transition-colors"
              />
              <p className="text-[11px] text-gray-500">
                Bound to NEXT_PUBLIC_RAZORPAY_KEY_ID for client checkout.
              </p>
            </div>

            <div className="space-y-2">
              <label className="text-xs uppercase tracking-widest text-gray-400 font-semibold flex items-center gap-1.5">
                <ShieldCheck className="w-3.5 h-3.5 text-primary" /> Razorpay Key Secret (Server Only)
              </label>
              <input
                type="password"
                value={keySecret}
                onChange={(e) => setKeySecret(e.target.value)}
                placeholder={keySecretMasked || "Enter new secret key"}
                className="w-full bg-black/80 border border-white/10 rounded-xl px-4 py-2.5 text-white text-sm font-mono focus:outline-none focus:border-primary transition-colors"
              />
              <p className="text-[11px] text-gray-500">
                Used for server-side HMAC-SHA256 verification. Never exposed to browser.
              </p>
            </div>

            <div className="space-y-2 md:col-span-2">
              <label className="text-xs uppercase tracking-widest text-gray-400 font-semibold flex items-center gap-1.5">
                <ShieldCheck className="w-3.5 h-3.5 text-primary" /> Razorpay Webhook Secret
              </label>
              <input
                type="password"
                value={webhookSecret}
                onChange={(e) => setWebhookSecret(e.target.value)}
                placeholder={webhookSecretMasked || "Enter webhook secret for x-razorpay-signature"}
                className="w-full bg-black/80 border border-white/10 rounded-xl px-4 py-2.5 text-white text-sm font-mono focus:outline-none focus:border-primary transition-colors"
              />
              <p className="text-[11px] text-gray-500">
                Validates background event notifications at /api/webhooks/razorpay.
              </p>
            </div>
          </div>

          <div className="pt-4 flex justify-end">
            <button
              type="submit"
              disabled={saving}
              className="flex items-center gap-2 bg-primary text-black font-semibold px-5 py-2.5 rounded-xl hover:bg-primary/90 transition-all shadow-[0_0_15px_rgba(204,255,0,0.2)] disabled:opacity-50 cursor-pointer"
            >
              {saving ? (
                <Loader2 className="w-4 h-4 animate-spin text-black" />
              ) : (
                <ShieldCheck className="w-4 h-4" />
              )}
              Save Payment Credentials
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
