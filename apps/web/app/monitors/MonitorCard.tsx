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
    <div className="bg-white rounded-lg border border-gray-200 shadow-sm hover:shadow-md transition-all duration-300">
      {/* Monitor header with name and status */}
      <div className="p-4 border-b border-gray-200">
        <div className="flex justify-between items-start gap-4">
          <div className="flex-1 min-w-0">
            <h3 className="font-semibold text-lg truncate">{monitor.name}</h3>
            <p className="text-sm text-gray-600 truncate">{monitor.url}</p>
          </div>

          {/* Status badge with colored dot */}
          {/* 
            Status mapping (visual indicators for quick recognition):
            - UP: Green dot + label (service is healthy)
            - DOWN: Red dot + label (service is unavailable)
            - UNKNOWN: Gray dot + label (no data yet)
          */}
          <div className="flex-shrink-0 flex items-center gap-2 px-3 py-1 bg-gray-50 rounded-full transition-all duration-300">
            {/* Colored status dot */}
            <div
              className={`w-2 h-2 rounded-full flex-shrink-0 transition-all ${
                currentStatus === "up"
                  ? "bg-green-500 shadow-sm"
                  : currentStatus === "down"
                  ? "bg-red-500 shadow-sm"
                  : "bg-gray-400"
              }`}
            />
            {/* Status label */}
            <span
              className={`text-xs font-semibold whitespace-nowrap transition-colors ${
                currentStatus === "up"
                  ? "text-green-700"
                  : currentStatus === "down"
                  ? "text-red-700"
                  : "text-gray-600"
              }`}
            >
              {currentStatus ? currentStatus.toUpperCase() : "UNKNOWN"}
            </span>
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
          <div className="flex justify-between items-center">
            <span>Response time:</span>
            {/* Response time in monospace font with subtle transition */}
            <span className="font-mono text-xs bg-white px-2 py-1 rounded text-gray-800 transition-all duration-300">
              {responseTime}
              <span className="text-gray-500 ml-0.5">ms</span>
            </span>
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
