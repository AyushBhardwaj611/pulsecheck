import { createClient } from "@supabase/supabase-js";

/**
 * Type definitions for monitors and checks
 */
export interface Monitor {
  id: string;
  user_id: string;
  name: string;
  url: string;
  type: "http" | "https" | "ping";
  interval_seconds: number;
  created_at: string;
  latest_status?: {
    status: "up" | "down";
    checked_at: string;
    response_time_ms?: number | null;
  } | null;
}

export interface MonitorCheck {
  id: string;
  monitor_id: string;
  status: "up" | "down";
  response_time_ms: number | null;
  error_message: string | null;
  checked_at: string;
}

export interface CreateMonitorPayload {
  name: string;
  url: string;
  type: "http" | "https" | "ping";
  interval_seconds?: number;
}

/**
 * Supabase Client Configuration
 * Creates and exports a single Supabase client instance for use throughout the app
 */
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "";
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "";

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error(
    "Missing required Supabase environment variables. Add NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY to your .env.local"
  );
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

/**
 * Helper function to get current authenticated user
 */
export async function getCurrentUser() {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return user;
}

/**
 * Fetch all monitors for the authenticated user
 * @returns Array of monitors with latest status
 */
export async function getMonitors(): Promise<Monitor[]> {
  try {
    const { data, error } = await supabase.functions.invoke("getMonitors", {
      method: "GET",
    });

    if (error) {
      console.error("Error fetching monitors:", error);
      throw error;
    }

    return data?.data || [];
  } catch (error) {
    console.error("Failed to fetch monitors:", error);
    throw new Error("Failed to fetch monitors");
  }
}

/**
 * Create a new monitor
 * @param payload - Monitor creation payload
 * @returns Created monitor object
 */
export async function createMonitor(payload: CreateMonitorPayload): Promise<Monitor> {
  try {
    const { data, error } = await supabase.functions.invoke("createMonitor", {
      method: "POST",
      body: payload,
    });

    if (error) {
      console.error("Error creating monitor:", error);
      throw error;
    }

    return data?.data;
  } catch (error) {
    console.error("Failed to create monitor:", error);
    throw new Error("Failed to create monitor");
  }
}

/**
 * Delete a monitor by ID
 * @param monitorId - UUID of the monitor to delete
 */
export async function deleteMonitor(monitorId: string): Promise<void> {
  try {
    const { error } = await supabase.functions.invoke("deleteMonitor", {
      method: "DELETE",
      body: { monitor_id: monitorId },
    });

    if (error) {
      console.error("Error deleting monitor:", error);
      throw error;
    }
  } catch (error) {
    console.error("Failed to delete monitor:", error);
    throw new Error("Failed to delete monitor");
  }
}

/**
 * Run a check for a specific monitor
 * @param monitorId - UUID of the monitor to check
 * @returns Check result with status and response time
 */
export async function runCheck(monitorId: string): Promise<MonitorCheck> {
  try {
    const { data, error } = await supabase.functions.invoke("runCheck", {
      method: "POST",
      body: { monitor_id: monitorId },
    });

    if (error) {
      console.error("Error running check:", error);
      throw error;
    }

    return data?.data;
  } catch (error) {
    console.error("Failed to run check:", error);
    throw new Error("Failed to run check");
  }
}
