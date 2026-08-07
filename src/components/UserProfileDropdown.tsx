"use client";

import React, { useState, useRef, useEffect } from "react";
import Link from "next/link";
import { useSession, signOut } from "next-auth/react";
import { User, LayoutDashboard, LogOut } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

export interface UserProfileDropdownProps {
  /** Optional custom dashboard URL (defaults to "/dashboard") */
  dashboardHref?: string;
  /** Optional fallback name when session is empty (defaults to "CMI Admin") */
  fallbackName?: string;
  /** Optional fallback email when session is empty (defaults to "admin@cmibattery.com") */
  fallbackEmail?: string;
  /** Optional additional class name for the wrapper container */
  className?: string;
}

export function UserProfileDropdown({
  dashboardHref = "/dashboard",
  fallbackName = "CMI Admin",
  fallbackEmail = "admin@cmibattery.com",
  className = "",
}: UserProfileDropdownProps) {
  const { data: session } = useSession();
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // User details derived from NextAuth session with fallback values
  const userName = session?.user?.name || fallbackName;
  const userEmail = session?.user?.email || fallbackEmail;

  // Toggle dropdown open/close state
  const toggleDropdown = () => setIsOpen((prev) => !prev);

  // Click-outside detection to auto-close dropdown when clicking elsewhere
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent | TouchEvent) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false);
      }
    };

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside);
      document.addEventListener("touchstart", handleClickOutside);
      document.addEventListener("keydown", handleKeyDown);
    }

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("touchstart", handleClickOutside);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [isOpen]);

  const handleSignOut = async () => {
    setIsOpen(false);
    await signOut({ callbackUrl: "/" });
  };

  return (
    <div className={`relative inline-block text-left ${className}`} ref={dropdownRef}>
      {/* Trigger Button: Circular icon button (<User/>) with dark translucent background */}
      <button
        type="button"
        onClick={toggleDropdown}
        aria-expanded={isOpen}
        aria-haspopup="true"
        aria-label="User profile menu"
        className="relative flex items-center justify-center w-10 h-10 rounded-full bg-[#27272a]/60 border border-zinc-800/80 text-white hover:bg-[#27272a] hover:border-zinc-700/80 focus:outline-none focus:ring-2 focus:ring-yellow-400/50 transition-all duration-200 cursor-pointer shadow-sm active:scale-95"
      >
        <User className="w-5 h-5 text-white" />
      </button>

      {/* Dropdown Menu Card */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 8, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 6, scale: 0.96 }}
            transition={{ duration: 0.18, ease: "easeOut" }}
            className="absolute right-0 top-full mt-2 w-64 rounded-2xl bg-[#141415] border border-zinc-800/80 shadow-2xl z-50 overflow-hidden backdrop-blur-md"
          >
            {/* Section 1: Header - User Info */}
            <div className="px-4 py-3.5 border-b border-zinc-800/80">
              <p className="text-sm font-bold text-white truncate tracking-tight">
                {userName}
              </p>
              <p className="text-xs text-zinc-400 truncate mt-0.5 font-medium">
                {userEmail}
              </p>
            </div>

            {/* Section 2: Middle Section - Dashboard Action */}
            <div className="p-1.5 border-b border-zinc-800/80">
              <Link
                href={dashboardHref}
                onClick={() => setIsOpen(false)}
                className="flex items-center gap-3 px-3 py-2.5 text-sm font-medium text-zinc-200 rounded-xl hover:bg-zinc-800/40 hover:text-white transition-all duration-150 group"
              >
                <LayoutDashboard className="w-4 h-4 text-[#eab308] group-hover:scale-110 transition-transform duration-150" />
                <span>Dashboard</span>
              </Link>
            </div>

            {/* Section 3: Bottom Section - Sign out Action */}
            <div className="p-1.5">
              <button
                type="button"
                onClick={handleSignOut}
                className="w-full flex items-center gap-3 px-3 py-2.5 text-sm font-medium text-red-400 rounded-xl hover:bg-zinc-800/40 transition-all duration-150 group cursor-pointer"
              >
                <LogOut className="w-4 h-4 text-red-400 group-hover:scale-110 transition-transform duration-150" />
                <span>Sign out</span>
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export default UserProfileDropdown;
