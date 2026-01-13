"use client";

/**
 * MonitorHistory Component
 * Displays historical check data for a specific monitor
 * Can show as a chart (uptime trend) or table (detailed check logs)
 * Supports filtering by time range
 */

interface MonitorHistoryProps {
  monitorId: string;
  monitorName: string;
}

export default function MonitorHistory({
  monitorId,
  monitorName,
}: MonitorHistoryProps) {
  return (
    <div className="bg-white rounded-lg border p-6">
      {/* Header */}
      <h2 className="text-2xl font-bold mb-4">Monitor History: {monitorName}</h2>

      {/* Time range filter */}
      <div className="flex gap-2 mb-6">
        <button className="px-3 py-1 bg-gray-100 rounded hover:bg-gray-200 text-sm">
          Last 24h
        </button>
        <button className="px-3 py-1 bg-gray-100 rounded hover:bg-gray-200 text-sm">
          Last 7d
        </button>
        <button className="px-3 py-1 bg-gray-100 rounded hover:bg-gray-200 text-sm">
          Last 30d
        </button>
      </div>

      {/* Chart placeholder */}
      <div className="h-64 bg-gray-50 rounded border border-dashed flex items-center justify-center mb-6">
        <p className="text-gray-500">
          {/* TODO: Add chart using recharts or chart.js */}
          Uptime chart placeholder - {monitorId}
        </p>
      </div>

      {/* Recent checks table */}
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b">
              <th className="text-left py-2 px-2">Time</th>
              <th className="text-left py-2 px-2">Status</th>
              <th className="text-left py-2 px-2">Response Time</th>
              <th className="text-left py-2 px-2">Details</th>
            </tr>
          </thead>
          <tbody>
            {/* TODO: Map through monitor_checks and display rows */}
            <tr className="border-b">
              <td className="py-2 px-2 text-gray-500">Loading...</td>
              <td className="py-2 px-2"></td>
              <td className="py-2 px-2"></td>
              <td className="py-2 px-2"></td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  );
}
