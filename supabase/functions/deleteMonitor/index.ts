// supabase/functions/deleteMonitor/index.ts
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

// Types
interface DeleteMonitorRequest {
  monitor_id: string;
}

interface ErrorResponse {
  error: string;
}

interface SuccessResponse {
  message: string;
  deleted_id: string;
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, {
      status: 204,
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "DELETE, OPTIONS",
        "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
      },
    });
  }

  // Only accept DELETE requests
  if (req.method !== "DELETE") {
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
    const body: DeleteMonitorRequest = await req.json();

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

    // Verify the monitor exists and belongs to the user (RLS will handle this too)
    const { data: monitorData, error: fetchError } = await supabaseClient
      .from("monitors")
      .select("id, user_id")
      .eq("id", body.monitor_id)
      .single();

    if (fetchError || !monitorData) {
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

    // Delete the monitor (CASCADE will automatically delete monitor_checks)
    const { error: deleteError } = await supabaseClient
      .from("monitors")
      .delete()
      .eq("id", body.monitor_id)
      .eq("user_id", user.id); // Extra safety check

    if (deleteError) {
      console.error("Database delete error:", deleteError);
      return new Response(
        JSON.stringify({
          error: "Failed to delete monitor",
        } as ErrorResponse),
        {
          status: 500,
          headers: { "Content-Type": "application/json" },
        }
      );
    }

    // Return success response
    return new Response(
      JSON.stringify({
        message: "Monitor deleted successfully",
        deleted_id: body.monitor_id,
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
