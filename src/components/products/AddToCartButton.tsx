"use client";

import React, { useState } from "react";
import { ShoppingCart, Loader2, CreditCard } from "lucide-react";
import { useCart } from "@/store/cart";
import { toast } from "sonner";
import { useRouter } from "next/navigation";

declare global {
  interface Window {
    Razorpay: any;
  }
}

interface AddToCartButtonProps {
  inStock: boolean;
  product: any;
  showBuyNow?: boolean;
}

export default function AddToCartButton({ inStock, product, showBuyNow = true }: AddToCartButtonProps) {
  const [isAdding, setIsAdding] = useState(false);
  const [isBuyingNow, setIsBuyingNow] = useState(false);
  const { addItem, items } = useCart();
  const router = useRouter();

  const loadRazorpayScript = (): Promise<boolean> => {
    return new Promise((resolve) => {
      if (typeof window !== "undefined" && window.Razorpay) {
        resolve(true);
        return;
      }
      const script = document.createElement("script");
      script.src = "https://checkout.razorpay.com/v1/checkout.js";
      script.async = true;
      script.onload = () => resolve(true);
      script.onerror = () => resolve(false);
      document.body.appendChild(script);
    });
  };

  const handleAddToCart = async () => {
    if (!inStock || isAdding) return;
    
    setIsAdding(true);
    try {
      await addItem({
        productId: product.id,
        name: product.name,
        sku: product.sku,
        price: Number(product.price),
        dealerPrice: Number(product.dealerPrice),
        image: product.images?.[0]?.url,
        quantity: 1,
        taxRate: Number(product.taxRate || 18),
      });
      
      toast.success("Added to cart");
    } catch (error) {
      console.error(error);
      toast.error("Failed to add to cart");
    } finally {
      setIsAdding(false);
    }
  };

  const handleBuyNow = async () => {
    if (!inStock || isBuyingNow) return;

    setIsBuyingNow(true);
    try {
      // 1. Ensure Razorpay SDK is loaded
      const isScriptLoaded = await loadRazorpayScript();
      
      // 2. Call Razorpay checkout creation API endpoint
      const res = await fetch("/api/checkout/razorpay", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ productId: product.id, quantity: 1 }),
      });

      const json = await res.json();

      if (res.ok && json.success && isScriptLoaded && typeof window !== "undefined" && window.Razorpay) {
        const { orderId, amountInPaise, keyId, providerOrderId } = json.data;
        const razorpayKey = keyId || process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID || "";

        const options = {
          key: razorpayKey,
          amount: amountInPaise,
          currency: "INR",
          name: "CMI Batteries",
          description: product.name,
          image: product.images?.[0]?.url || "/logo2.png",
          order_id: providerOrderId,
          theme: {
            color: "#FAFF00",
          },
          handler: async function (response: any) {
            toast.loading("Verifying payment...", { id: "pay-verify" });
            try {
              const verifyRes = await fetch("/api/payments/verify", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                  orderId,
                  razorpay_order_id: response.razorpay_order_id,
                  razorpay_payment_id: response.razorpay_payment_id,
                  razorpay_signature: response.razorpay_signature,
                }),
              });
              const verifyData = await verifyRes.json();
              if (verifyRes.ok && verifyData.success) {
                toast.success("Payment completed successfully!", { id: "pay-verify" });
                router.push(`/checkout/success?orderId=${orderId}`);
              } else {
                toast.error("Payment verification failed", { id: "pay-verify" });
              }
            } catch {
              toast.error("Error verifying payment", { id: "pay-verify" });
            } finally {
              setIsBuyingNow(false);
            }
          },
          modal: {
            ondismiss: () => {
              setIsBuyingNow(false);
              toast.info("Payment window closed.");
            },
          },
        };

        const rzp = new window.Razorpay(options);
        rzp.open();
      } else {
        // Fallback if Razorpay API or script is unavailable
        await addItem({
          productId: product.id,
          name: product.name,
          sku: product.sku,
          price: Number(product.price),
          dealerPrice: Number(product.dealerPrice),
          image: product.images?.[0]?.url,
          quantity: 1,
          taxRate: Number(product.taxRate || 18),
        });
        router.push("/cart");
        setIsBuyingNow(false);
      }
    } catch (error) {
      console.error(error);
      toast.error("Failed to initiate buy now");
      setIsBuyingNow(false);
    }
  };

  const inCart = items.find((i) => i.productId === product.id);

  // Fallback strictly when out of stock (quantity === 0)
  if (!inStock) {
    return (
      <a
        href="/contact"
        className="flex-1 flex items-center justify-center gap-2 bg-yellow-400 text-black font-heading font-bold py-4 px-6 rounded-xl hover:bg-yellow-400/90 transition-colors text-center w-full"
      >
        Inquire Now
      </a>
    );
  }

  return (
    <div className="flex flex-col sm:flex-row gap-3 flex-1">
      <button
        disabled={isAdding}
        onClick={handleAddToCart}
        className="flex-1 flex items-center justify-center gap-2 bg-yellow-400 text-black font-bold py-4 px-6 rounded-xl hover:bg-yellow-400/90 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
      >
        {isAdding ? (
          <Loader2 className="w-5 h-5 animate-spin" />
        ) : (
          <ShoppingCart className="w-5 h-5 text-black" />
        )}
        {inCart ? "View / Add More" : "Add to Cart"}
      </button>

      {showBuyNow && (
        <button
          disabled={isBuyingNow}
          onClick={handleBuyNow}
          className="flex-1 flex items-center justify-center gap-2 bg-zinc-800 hover:bg-zinc-700 text-white border border-zinc-700 font-bold py-4 px-6 rounded-xl transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
        >
          {isBuyingNow ? (
            <Loader2 className="w-5 h-5 animate-spin" />
          ) : (
            <CreditCard className="w-5 h-5 text-yellow-400" />
          )}
          Buy Now
        </button>
      )}
    </div>
  );
}
