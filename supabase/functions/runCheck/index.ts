// supabase/functions/runCheck/index.ts
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

// Types
interface RunCheckRequest {
  monitor_id: string;
}

interface ErrorResponse {
  error: string;
}

interface CheckResult {
  monitor_id: string;
  status: "up" | "down";
  response_time_ms: number | null;
  error_message: string | null;
  checked_at: string;
}

interface SuccessResponse {
  data: CheckResult;
}

/**
 * Performs an HTTP/HTTPS check on a URL
 * @param url - The URL to check
 * @param type - The monitor type ('http', 'https', or 'ping')
 * @returns CheckResult with status, response time, and any error message
 */
async function performCheck(
  url: string,
  type: string
): Promise<Omit<CheckResult, "monitor_id" | "checked_at">> {
  const startTime = Date.now();

  try {
    // For HTTP/HTTPS checks, make a request
    if (type === "http" || type === "https") {
      const response = await fetch(url, {
        method: "GET",
        signal: AbortSignal.timeout(10000), // 10 second timeout
      });

      const responseTime = Date.now() - startTime;

      // Consider 2xx and 3xx status codes as "up"
      if (response.ok || (response.status >= 300 && response.status < 400)) {
        return {
          status: "up",
          response_time_ms: responseTime,
          error_message: null,
        };
      } else {
        return {
          status: "down",
          response_time_ms: responseTime,
          error_message: `HTTP ${response.status}: ${response.statusText}`,
        };
      }
    }

    // For ping checks (simplified - just check if host is reachable)
    if (type === "ping") {
      const urlObj = new URL(url);
      const response = await fetch(`${urlObj.protocol}//${urlObj.host}`, {
        method: "HEAD",
        signal: AbortSignal.timeout(5000), // 5 second timeout for ping
      });

      const responseTime = Date.now() - startTime;

      return {
        status: "up",
        response_time_ms: responseTime,
        error_message: null,
      };
    }

    // Unsupported type
    return {
      status: "down",
      response_time_ms: null,
      error_message: "Unsupported monitor type",
    };
  } catch (error) {
    const responseTime = Date.now() - startTime;
    const errorMessage = error instanceof Error ? error.message : "Unknown error";

    return {
      status: "down",
      response_time_ms: responseTime,
      error_message: errorMessage,
    };
  }
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, {
      status: 204,
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "POST, OPTIONS",
        "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
      },
    });
  }

  // Only accept POST requests
  if (req.method !== "POST") {
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

    // Parse and validate request body
    const body: RunCheckRequest = await req.json();

    if (!body.monitor_id) {
      return new Response(
        JSON.stringify({
          error: "Missing required field: monitor_id",
        } as ErrorResponse),
        {
          status: 400,
          headers: { "Content-Type": "application/json" },
        }
      );
    }

    // Fetch the monitor to get URL and type
    // RLS will ensure the user owns this monitor
    const { data: monitor, error: fetchError } = await supabaseClient
      .from("monitors")
      .select("id, url, type, user_id")
      .eq("id", body.monitor_id)
      .single();

    if (fetchError || !monitor) {
      return new Response(
        JSON.stringify({
          error: "Monitor not found or access denied",
        } as ErrorResponse),
        {
          status: 404,
          headers: { "Content-Type": "application/json" },
        }
      );
    }

    // Perform the check
    console.log(`Performing check for monitor ${monitor.id} (${monitor.url})`);
    const checkResult = await performCheck(monitor.url, monitor.type);

    // Insert the check result into monitor_checks table
    const { data: insertedCheck, error: insertError } = await supabaseClient
      .from("monitor_checks")
      .insert({
        monitor_id: monitor.id,
        status: checkResult.status,
        response_time_ms: checkResult.response_time_ms,
        error_message: checkResult.error_message,
      })
      .select()
      .single();

    if (insertError) {
      console.error("Database insert error:", insertError);
      return new Response(
        JSON.stringify({
          error: "Failed to record check result",
        } as ErrorResponse),
        {
          status: 500,
          headers: { "Content-Type": "application/json" },
        }
      );
    }

    // Return success response with check result
    return new Response(
      JSON.stringify({
        data: {
          monitor_id: insertedCheck.monitor_id,
          status: insertedCheck.status,
          response_time_ms: insertedCheck.response_time_ms,
          error_message: insertedCheck.error_message,
          checked_at: insertedCheck.checked_at,
        },
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
