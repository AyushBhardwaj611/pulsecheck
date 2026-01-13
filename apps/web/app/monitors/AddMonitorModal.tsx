"use client";

import { useState } from "react";
import { createMonitor, Monitor, CreateMonitorPayload } from "../lib/supabaseClient";

interface AddMonitorModalProps {
  onMonitorCreated: (monitor: Monitor) => void;
}

/**
 * AddMonitorModal Component
 * Modal form to create a new monitor
 * Validates input and calls the createMonitor Edge Function
 * Closes modal and refreshes monitor list on success
 */
export default function AddMonitorModal({ onMonitorCreated }: AddMonitorModalProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [formData, setFormData] = useState<CreateMonitorPayload>({
    name: "",
    url: "",
    type: "https",
    interval_seconds: 300,
  });

  // Handle form input changes
  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>
  ) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: name === "interval_seconds" ? parseInt(value) : value,
    }));
  };

  // Handle form submission
  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError(null);

    // Validate form data
    if (!formData.name.trim()) {
      setError("Monitor name is required");
      return;
    }
    if (!formData.url.trim()) {
      setError("URL is required");
      return;
    }

    // Validate URL format
    try {
      new URL(formData.url);
    } catch {
      setError("Invalid URL format");
      return;
    }

    setIsLoading(true);
    try {
      // Call Edge Function to create monitor
      const newMonitor = await createMonitor(formData);

      // Notify parent component and close modal
      onMonitorCreated(newMonitor);
      setIsOpen(false);

      // Reset form
      setFormData({
        name: "",
        url: "",
        type: "https",
        interval_seconds: 300,
      });
    } catch (err) {
      console.error("Error creating monitor:", err);
      setError(
        err instanceof Error ? err.message : "Failed to create monitor"
      );
    } finally {
      setIsLoading(false);
    }
  };

  // Handle modal close
  const closeModal = () => {
    setIsOpen(false);
    setError(null);
    setFormData({
      name: "",
      url: "",
      type: "https",
      interval_seconds: 300,
    });
  };

  return (
    <>
      {/* Trigger button */}
      <button
        onClick={() => setIsOpen(true)}
        className="px-4 py-2 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition"
      >
        + Add Monitor
      </button>

      {/* Modal overlay */}
      {isOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          {/* Modal content */}
          <div className="bg-white rounded-lg p-6 w-full max-w-md shadow-lg">
            <h2 className="text-2xl font-bold mb-4">Create New Monitor</h2>

            {/* Error message */}
            {error && (
              <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded text-red-600 text-sm">
                {error}
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              {/* Monitor name input */}
              <div>
                <label className="block text-sm font-medium mb-2">
                  Monitor Name *
                </label>
                <input
                  type="text"
                  name="name"
                  value={formData.name}
                  onChange={handleChange}
                  placeholder="e.g., My Website"
                  className="w-full border border-gray-300 rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  disabled={isLoading}
                />
              </div>

              {/* URL input */}
              <div>
                <label className="block text-sm font-medium mb-2">URL *</label>
                <input
                  type="url"
                  name="url"
                  value={formData.url}
                  onChange={handleChange}
                  placeholder="e.g., https://example.com"
                  className="w-full border border-gray-300 rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  disabled={isLoading}
                />
              </div>

              {/* Monitor type select */}
              <div>
                <label className="block text-sm font-medium mb-2">Type</label>
                <select
                  name="type"
                  value={formData.type}
                  onChange={handleChange}
                  className="w-full border border-gray-300 rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  disabled={isLoading}
                >
                  <option value="http">HTTP</option>
                  <option value="https">HTTPS</option>
                  <option value="ping">Ping</option>
                </select>
              </div>

              {/* Check interval input */}
              <div>
                <label className="block text-sm font-medium mb-2">
                  Check Interval (seconds)
                </label>
                <input
                  type="number"
                  name="interval_seconds"
                  value={formData.interval_seconds}
                  onChange={handleChange}
                  min={60}
                  step={60}
                  className="w-full border border-gray-300 rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  disabled={isLoading}
                />
                <p className="text-xs text-gray-500 mt-1">Minimum 60 seconds</p>
              </div>

              {/* Form actions */}
              <div className="flex gap-2 pt-4">
                <button
                  type="button"
                  onClick={closeModal}
                  disabled={isLoading}
                  className="flex-1 px-4 py-2 bg-gray-200 text-gray-800 rounded-lg hover:bg-gray-300 disabled:opacity-50 font-medium transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isLoading}
                  className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 font-medium transition"
                >
                  {isLoading ? "Creating..." : "Create Monitor"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
