"use client";

import { useState } from "react";
import { Monitor, runCheck, deleteMonitor } from "../lib/supabaseClient";

interface MonitorCardProps {
  monitor: Monitor;
  onDeleted: (monitorId: string) => void;
  onCheckCompleted: (monitorId: string, status: "up" | "down") => void;
}

/**
 * MonitorCard Component
 * Displays a single monitor with its current status and actions
 * Handles running checks, deleting monitors, and shows last check info
 */
export default function MonitorCard({
  monitor,
  onDeleted,
  onCheckCompleted,
}: MonitorCardProps) {
  const [isCheckRunning, setIsCheckRunning] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Get current status - latest_status if available, otherwise unknown
  const currentStatus = monitor.latest_status?.status || null;
  const lastChecked = monitor.latest_status?.checked_at
    ? new Date(monitor.latest_status.checked_at)
    : null;
  const responseTime = monitor.latest_status?.response_time_ms;

  // Format timestamp to readable string
  const formatTime = (date: Date) => {
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);

    if (diffMins < 1) return "just now";
    if (diffMins < 60) return `${diffMins}m ago`;

    const diffHours = Math.floor(diffMins / 60);
    if (diffHours < 24) return `${diffHours}h ago`;

    const diffDays = Math.floor(diffHours / 24);
    return `${diffDays}d ago`;
  };

  // Handle running a check
  const handleRunCheck = async () => {
    setIsCheckRunning(true);
    setError(null);
    try {
      const result = await runCheck(monitor.id);
      // Notify parent to update UI
      onCheckCompleted(monitor.id, result.status);
    } catch (err) {
      console.error("Error running check:", err);
      setError("Failed to run check");
    } finally {
      setIsCheckRunning(false);
    }
  };

  // Handle deleting the monitor
  const handleDelete = async () => {
    if (!confirm(`Delete monitor "${monitor.name}"? This cannot be undone.`)) {
      return;
    }

    setIsDeleting(true);
    setError(null);
    try {
      await deleteMonitor(monitor.id);
      // Notify parent to remove from list
      onDeleted(monitor.id);
    } catch (err) {
      console.error("Error deleting monitor:", err);
      setError("Failed to delete monitor");
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <div className="bg-white rounded-lg border border-gray-200 shadow-sm hover:shadow-md transition-shadow">
      {/* Monitor header with name and status */}
      <div className="p-4 border-b border-gray-200">
        <div className="flex justify-between items-start gap-4">
          <div className="flex-1 min-w-0">
            <h3 className="font-semibold text-lg truncate">{monitor.name}</h3>
            <p className="text-sm text-gray-600 truncate">{monitor.url}</p>
          </div>

          {/* Status badge */}
          <div
            className={`flex-shrink-0 px-3 py-1 rounded-full text-xs font-bold whitespace-nowrap ${
              currentStatus === "up"
                ? "bg-green-100 text-green-700"
                : currentStatus === "down"
                ? "bg-red-100 text-red-700"
                : "bg-gray-100 text-gray-600"
            }`}
          >
            {currentStatus ? currentStatus.toUpperCase() : "UNKNOWN"}
          </div>
        </div>
      </div>

      {/* Monitor details */}
      <div className="p-4 bg-gray-50 text-sm text-gray-600 space-y-2">
        <div className="flex justify-between">
          <span>Type:</span>
          <span className="font-medium text-gray-900">{monitor.type.toUpperCase()}</span>
        </div>
        <div className="flex justify-between">
          <span>Interval:</span>
          <span className="font-medium text-gray-900">{monitor.interval_seconds}s</span>
        </div>
        {lastChecked && (
          <div className="flex justify-between">
            <span>Last checked:</span>
            <span className="font-medium text-gray-900">{formatTime(lastChecked)}</span>
          </div>
        )}
        {responseTime !== null && responseTime !== undefined && (
          <div className="flex justify-between">
            <span>Response time:</span>
            <span className="font-medium text-gray-900">{responseTime}ms</span>
          </div>
        )}
      </div>

      {/* Error message */}
      {error && <div className="px-4 pt-2 text-xs text-red-600">{error}</div>}

      {/* Action buttons */}
      <div className="p-4 flex gap-2">
        <button
          onClick={handleRunCheck}
          disabled={isCheckRunning}
          className="flex-1 px-3 py-2 bg-blue-50 text-blue-600 rounded text-sm font-medium hover:bg-blue-100 disabled:opacity-50 disabled:cursor-not-allowed transition"
        >
          {isCheckRunning ? "Checking..." : "Check Now"}
        </button>
        <button
          onClick={handleDelete}
          disabled={isDeleting}
          className="flex-1 px-3 py-2 bg-red-50 text-red-600 rounded text-sm font-medium hover:bg-red-100 disabled:opacity-50 disabled:cursor-not-allowed transition"
        >
          {isDeleting ? "Deleting..." : "Delete"}
        </button>
      </div>
    </div>
  );
}
