"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Menu, X, ChevronRight, ShoppingCart, User } from "lucide-react";
import { COMPANY_INFO } from "@/lib/constants";
import { cn } from "@/lib/utils";
import { motion, AnimatePresence } from "framer-motion";
import { useCart } from "@/store/cart";
import { UserProfileDropdown } from "./UserProfileDropdown";

const PUBLIC_NAV = [
  { name: "Home", href: "/" },
  { name: "About", href: "/about" },
  { name: "Products", href: "/products" },
  { name: "Warranty", href: "/warranty" },
  { name: "Services", href: "/services" },
  { name: "Gallery", href: "/gallery" },
  { name: "Contact", href: "/contact" },
];

export default function Navbar() {
  const [scrolled, setScrolled] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [isSplash, setIsSplash] = useState(true);
  const [mounted, setMounted] = useState(false);
  const pathname = usePathname();
  const { totalItems } = useCart();

  const cartCount = mounted ? totalItems : 0;

  useEffect(() => {
    setMounted(true);

    // Only show splash screen on the Home page, and only once per session
    if (window.location.pathname === "/") {
      const hasSeenSplash = sessionStorage.getItem("hasSeenSplash");
      if (hasSeenSplash) {
        setIsSplash(false);
      } else {
        sessionStorage.setItem("hasSeenSplash", "true");
        setTimeout(() => setIsSplash(false), 2200);
      }
    } else {
      setIsSplash(false);
    }

    const handleScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener("scroll", handleScroll);

    return () => {
      window.removeEventListener("scroll", handleScroll);
    };
  }, []);

  // Close mobile menu on route change
  useEffect(() => setMobileOpen(false), [pathname]);

  // Hide on admin/dealer/customer routes
  if (
    pathname.startsWith("/admin") ||
    pathname.startsWith("/dealer") ||
    pathname.startsWith("/customer")
  ) {
    return null;
  }

  const isActiveLink = (href: string) => {
    if (href === "/") return pathname === "/";
    return pathname.startsWith(href);
  };

  return (
    <>
      <AnimatePresence>
        {isSplash && mounted && (
          <motion.div
            initial={{ opacity: 1 }}
            exit={{ opacity: 0, transition: { duration: 0.8, ease: "easeInOut" } }}
            className="fixed inset-0 z-[100] flex flex-col items-center justify-center bg-[#050505]"
          >
            <div className="flex flex-col items-center gap-6">
              <motion.div layoutId="logo-image" className="relative w-36 h-36 rounded-full overflow-hidden bg-black/60 p-2 border border-yellow-400/30">
                <img src={COMPANY_INFO.logo} alt="CMI Logo" className="object-contain w-full h-full" />
              </motion.div>
              <motion.div layoutId="logo-text" className="flex flex-col items-center text-center">
                <span className="font-heading font-bold text-5xl tracking-tighter leading-none text-white">PERFECT</span>
                <span className="text-lg mt-2 text-yellow-400 font-bold tracking-[0.2em] uppercase leading-none">BATTERIES</span>
              </motion.div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <header
        className={cn(
          "fixed top-0 left-0 right-0 z-50 transition-all duration-300",
          scrolled
            ? "bg-black/95 border-b border-white/10 py-3 backdrop-blur-md"
            : "bg-black/90 py-4 backdrop-blur-sm"
        )}
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex items-center justify-between">
          {/* Left: Circular Logo & Brand */}
          <Link href="/" className="flex items-center gap-3 shrink-0">
            <motion.div layoutId="logo-image" className="relative w-10 h-10 md:w-12 md:h-12 rounded-full overflow-hidden bg-zinc-900 border border-zinc-800 p-1 shrink-0 flex items-center justify-center">
              <img src={COMPANY_INFO.logo} alt="CMI Logo" className="object-contain w-full h-full rounded-full" />
            </motion.div>
            <motion.div layoutId="logo-text" className="flex flex-col">
              <span className="font-heading font-bold text-lg md:text-xl tracking-tighter leading-none text-white">PERFECT</span>
              <span className="text-[10px] md:text-xs mt-0.5 text-yellow-400 font-bold tracking-[0.2em] uppercase leading-none">BATTERIES</span>
            </motion.div>
          </Link>

          {/* Center: Links */}
          <nav className="hidden lg:flex items-center gap-7">
            {PUBLIC_NAV.map((link) => {
              const active = isActiveLink(link.href);
              return (
                <Link
                  key={link.href}
                  href={link.href}
                  className={cn(
                    "text-sm font-medium transition-colors hover:text-yellow-400 relative py-1.5",
                    active ? "text-yellow-400" : "text-white/70"
                  )}
                >
                  {link.name}
                  {active && (
                    <span className="absolute bottom-0 left-0 right-0 h-[2px] bg-yellow-400 rounded-full" />
                  )}
                </Link>
              );
            })}
          </nav>

          {/* Right Actions: Cart & User Profile */}
          <div className="flex items-center gap-3 shrink-0">
            {/* Cart Button */}
            <Link
              href="/cart"
              className="relative bg-zinc-900 border border-zinc-800 p-2.5 rounded-xl hover:border-zinc-700 transition-colors flex items-center justify-center text-white shrink-0"
              aria-label="Shopping Cart"
            >
              <ShoppingCart className="w-5 h-5 text-white hover:text-yellow-400 transition-colors" />
              {cartCount > 0 && (
                <span className="absolute -top-1.5 -right-1.5 bg-yellow-400 text-black font-extrabold text-xs w-5 h-5 rounded-full flex items-center justify-center border border-black shadow">
                  {cartCount > 99 ? "99+" : cartCount}
                </span>
              )}
            </Link>

            {/* User Profile Dropdown */}
            <UserProfileDropdown />


            {/* Mobile menu toggle */}
            <div className="lg:hidden flex items-center ml-1 shrink-0">
              <button
                onClick={() => setMobileOpen(!mobileOpen)}
                className="text-white p-1"
                aria-label="Toggle menu"
              >
                {mobileOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
              </button>
            </div>
          </div>
        </div>

        {/* Mobile Menu */}
        {mobileOpen && (
          <div className="lg:hidden bg-black/95 backdrop-blur-lg border-t border-white/10 px-4 py-6 space-y-3">
            {PUBLIC_NAV.map((link) => {
              const active = isActiveLink(link.href);
              return (
                <Link
                  key={link.href}
                  href={link.href}
                  className={cn(
                    "flex items-center justify-between text-base font-heading font-bold py-2.5 px-3 rounded-lg transition-colors",
                    active ? "text-yellow-400 bg-zinc-900/60" : "text-white/80 hover:text-yellow-400 hover:bg-zinc-900/40"
                  )}
                >
                  <span>{link.name}</span>
                  <ChevronRight className={cn("w-4 h-4", active ? "text-yellow-400" : "text-gray-500")} />
                </Link>
              );
            })}
          </div>
        )}
      </header>
    </>
  );
}
