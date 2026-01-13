"use client";

import { useEffect, useState } from "react";
import Header from "./components/Header";
import AddMonitorModal from "./monitors/AddMonitorModal";
import MonitorCard from "./monitors/MonitorCard";
import { getMonitors, Monitor } from "./lib/supabaseClient";

/**
 * Dashboard page
 * Displays all monitors for the authenticated user
 * Fetches monitors on load and provides refresh functionality
 */
export default function DashboardPage() {
  const [monitors, setMonitors] = useState<Monitor[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Fetch monitors on component mount
  useEffect(() => {
    fetchMonitors();
  }, []);

  // Auto-refresh monitors every 30 seconds in the background
  // This creates a "live" dashboard experience similar to UptimeRobot
  // Updates happen silently without blocking user interactions or showing loading state
  useEffect(() => {
    const pollInterval = setInterval(async () => {
      try {
        const data = await getMonitors();
        setMonitors(data || []);
      } catch (err) {
        // Silently log background refresh errors
        // Don't show alerts or loading states to avoid disrupting UX
        console.error("Background monitor refresh failed:", err);
      }
    }, 30000); // 30 seconds

    // Cleanup: clear interval on unmount to prevent memory leaks
    return () => clearInterval(pollInterval);
  }, []);

  // Fetch monitors from API
  const fetchMonitors = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const data = await getMonitors();
      setMonitors(data || []);
    } catch (err) {
      console.error("Error loading monitors:", err);
      setError("Failed to load monitors. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  // Remove a monitor from local state (optimistic update)
  const handleMonitorDeleted = (monitorId: string) => {
    setMonitors((prev) => prev.filter((m) => m.id !== monitorId));
  };

  // Update monitor status after a check (optimistic update)
  const handleCheckCompleted = (monitorId: string, newStatus: "up" | "down") => {
    setMonitors((prev) =>
      prev.map((m) =>
        m.id === monitorId && m.latest_status
          ? {
              ...m,
              latest_status: {
                ...m.latest_status,
                status: newStatus,
                checked_at: new Date().toISOString(),
              },
            }
          : m
      )
    );
  };

  // Add newly created monitor to the list
  const handleMonitorCreated = (newMonitor: Monitor) => {
    setMonitors((prev) => [newMonitor, ...prev]);
  };

  return (
    <main className="min-h-screen bg-gray-50">
      {/* Page header */}
      <Header onRefresh={fetchMonitors} />

      {/* Main content area */}
      <div className="container mx-auto px-4 py-8">
        {/* Error message */}
        {error && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded text-red-700">
            {error}
          </div>
        )}

        {/* Page title and actions */}
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-3xl font-bold">Monitors</h1>
          <AddMonitorModal onMonitorCreated={handleMonitorCreated} />
        </div>

        {/* Loading state */}
        {isLoading && (
          <div className="text-center py-12">
            <p className="text-gray-600">Loading monitors...</p>
          </div>
        )}

        {/* Empty state */}
        {!isLoading && monitors.length === 0 && (
          <div className="text-center py-12 bg-white rounded-lg border border-gray-200">
            <p className="text-gray-600 mb-4">No monitors yet</p>
            <p className="text-gray-500 text-sm">Create your first monitor to get started</p>
          </div>
        )}

        {/* Monitors grid */}
        {!isLoading && monitors.length > 0 && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {monitors.map((monitor) => (
              <MonitorCard
                key={monitor.id}
                monitor={monitor}
                onDeleted={handleMonitorDeleted}
                onCheckCompleted={handleCheckCompleted}
              />
            ))}
          </div>
        )}
      </div>
    </main>
  );
}
