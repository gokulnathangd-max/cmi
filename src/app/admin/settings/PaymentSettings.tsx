"use client";

import React, { useState } from "react";
import { CreditCard } from "lucide-react";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardAction,
  CardContent,
} from "@/components/ui/card"; // Adjust import path based on your folder structure

export default function PaymentSettings() {
  // 1. Manage state only for whether the gateway is active or inactive
  const [isRazorpayActive, setIsRazorpayActive] = useState(true);
  const [loading, setLoading] = useState(false);

  const handleToggle = async () => {
    setLoading(true);
    try {
      // Optional: Call your API route here to save the active status to SQLite
      // await fetch('/api/admin/settings/payment', { 
      //   method: 'POST', 
      //   body: JSON.stringify({ active: !isRazorpayActive }) 
      // });
      setIsRazorpayActive(!isRazorpayActive);
    } catch (error) {
      console.error("Failed to update gateway status", error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-heading font-bold text-white">Payment Gateways</h1>
        <p className="text-gray-400 text-sm mt-0.5">
          Toggle available payment providers for checkout.
        </p>
      </div>

      <Card className="bg-white/[0.02] border-white/10">
        <CardHeader className="relative">
          <div className="flex gap-4">
            {/* Visual Icon Badge */}
            <div className="p-3 bg-blue-500/10 rounded-xl text-blue-400 h-fit">
              <CreditCard className="w-6 h-6" />
            </div>

            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <CardTitle className="text-white">Razorpay Integration</CardTitle>
                <span
                  className={`text-[10px] font-bold px-2 py-0.5 rounded-full tracking-wider transition-colors ${
                    isRazorpayActive
                      ? "bg-green-500/10 text-green-400"
                      : "bg-white/10 text-gray-400"
                  }`}
                >
                  {isRazorpayActive ? "ACTIVE" : "INACTIVE"}
                </span>
              </div>
              <CardDescription className="text-gray-400 max-w-xl">
                Accept customer payments securely via UPI, Credit/Debit Cards, NetBanking, and digital wallets.
              </CardDescription>
            </div>
          </div>

          {/* Action Slot: Clean Toggle Switch instead of an Input Box */}
          <CardAction>
            <button
              type="button"
              disabled={loading}
              onClick={handleToggle}
              className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                isRazorpayActive ? "bg-primary" : "bg-white/10"
              } ${loading ? "opacity-50 cursor-not-allowed" : ""}`}
            >
              <span
                className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                  isRazorpayActive ? "translate-x-5" : "translate-x-0"
                }`}
              />
            </button>
          </CardAction>
        </CardHeader>
      </Card>
    </div>
  );
}