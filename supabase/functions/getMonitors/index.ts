// supabase/functions/getMonitors/index.ts
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

// Types
interface Monitor {
  id: string;
  user_id: string;
  name: string;
  url: string;
  type: string;
  interval_seconds: number;
  created_at: string;
}

interface MonitorWithStatus extends Monitor {
  latest_status?: {
    status: string;
    checked_at: string;
    response_time_ms?: number;
  } | null;
}

interface ErrorResponse {
  error: string;
}

interface SuccessResponse {
  data: MonitorWithStatus[];
  count: number;
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, {
      status: 204,
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "GET, OPTIONS",
        "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
      },
    });
  }

  // Only accept GET requests
  if (req.method !== "GET") {
    return new Response(
      JSON.stringify({ error: "Method not allowed" } as ErrorResponse),
      {
        status: 405,
        headers: { "Content-Type": "application/json" },
      }
    );
  }

  try {
    // Initialize Supabase client with auth context
    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_ANON_KEY") ?? "",
      {
        global: {
          headers: { Authorization: req.headers.get("Authorization")! },
        },
      }
    );

    // Verify user is authenticated
    const {
      data: { user },
      error: authError,
    } = await supabaseClient.auth.getUser();

    if (authError || !user) {
      return new Response(
        JSON.stringify({ error: "Unauthorized - please log in" } as ErrorResponse),
        {
          status: 401,
          headers: { "Content-Type": "application/json" },
        }
      );
    }

    // Fetch all monitors for the authenticated user
    // RLS policies will automatically filter by user_id
    const { data: monitors, error: fetchError } = await supabaseClient
      .from("monitors")
      .select("*")
      .order("created_at", { ascending: false });

    if (fetchError) {
      console.error("Database fetch error:", fetchError);
      return new Response(
        JSON.stringify({
          error: "Failed to fetch monitors",
        } as ErrorResponse),
        {
          status: 500,
          headers: { "Content-Type": "application/json" },
        }
      );
    }

    // For each monitor, fetch the latest status using the helper function
    const monitorsWithStatus: MonitorWithStatus[] = await Promise.all(
      (monitors || []).map(async (monitor) => {
        // Call the get_latest_monitor_status helper function
        const { data: statusData, error: statusError } = await supabaseClient
          .rpc("get_latest_monitor_status", {
            monitor_uuid: monitor.id,
          });

        // If we have status data, attach it to the monitor
        let latestStatus = null;
        if (!statusError && statusData && statusData.length > 0) {
          const status = statusData[0];
          latestStatus = {
            status: status.status,
            checked_at: status.checked_at,
            response_time_ms: status.response_time_ms,
          };
        }

        return {
          ...monitor,
          latest_status: latestStatus,
        };
      })
    );

    // Return success response
    return new Response(
      JSON.stringify({
        data: monitorsWithStatus,
        count: monitorsWithStatus.length,
      } as SuccessResponse),
      {
        status: 200,
        headers: {
          "Content-Type": "application/json",
          "Access-Control-Allow-Origin": "*",
        },
      }
    );
  } catch (error) {
    console.error("Unexpected error:", error);
    return new Response(
      JSON.stringify({
        error: "Internal server error",
      } as ErrorResponse),
      {
        status: 500,
        headers: { "Content-Type": "application/json" },
      }
    );
  }
});
