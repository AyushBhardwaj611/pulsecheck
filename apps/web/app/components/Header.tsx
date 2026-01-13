"use client";

import { useState, useEffect } from "react";
import { supabase } from "../lib/supabaseClient";

interface HeaderProps {
  onRefresh?: () => void;
}

/**
 * Header Component
 * Top navigation bar with logo, user info, and actions
 * Shows current user email and refresh button
 */
export default function Header({ onRefresh }: HeaderProps) {
  const [userEmail, setUserEmail] = useState<string | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Fetch current user on mount
  useEffect(() => {
    const getUser = async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      setUserEmail(user?.email || null);
    };
    getUser();
  }, []);

  // Handle refresh button click
  const handleRefresh = async () => {
    if (!onRefresh) return;
    setIsRefreshing(true);
    try {
      await onRefresh();
    } finally {
      setIsRefreshing(false);
    }
  };

  // Handle logout
  const handleLogout = async () => {
    try {
      await supabase.auth.signOut();
      // Redirect to login page - implement based on your auth setup
      window.location.href = "/auth/login";
    } catch (error) {
      console.error("Error logging out:", error);
    }
  };

  return (
    <header className="bg-white border-b border-gray-200 shadow-sm sticky top-0 z-40">
      <div className="container mx-auto px-4 py-4 flex justify-between items-center">
        {/* App logo/name */}
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-blue-600 rounded-full flex items-center justify-center flex-shrink-0">
            <span className="text-white font-bold text-sm">P</span>
          </div>
          <h1 className="text-2xl font-bold hidden sm:block">PulseCheck</h1>
        </div>

        {/* Right side actions */}
        <div className="flex items-center gap-4">
          {/* Refresh button */}
          {onRefresh && (
            <button
              onClick={handleRefresh}
              disabled={isRefreshing}
              className="px-3 py-2 text-gray-600 hover:text-gray-900 font-medium text-sm disabled:opacity-50 transition"
              title="Refresh monitors"
            >
              ↻ Refresh
            </button>
          )}

          {/* User email */}
          {userEmail && (
            <span className="text-gray-600 text-sm hidden sm:inline">
              {userEmail}
            </span>
          )}

          {/* Logout button */}
          <button
            onClick={handleLogout}
            className="px-4 py-2 text-sm font-medium text-red-600 border border-red-300 rounded-lg hover:bg-red-50 transition"
          >
            Logout
          </button>
        </div>
      </div>
    </header>
  );
}
