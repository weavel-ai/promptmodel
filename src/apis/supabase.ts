"use client";

import { env } from "@/constants";
import { SupabaseClient, createClient } from "@supabase/supabase-js";
import { Database } from "@/supabase.types";
import { useAuth } from "@/hooks/auth/useAuth";
import { useCallback, useEffect, useMemo, useState } from "react";

interface SupabaseClientStatus {
  initialized: boolean;
  supabase: SupabaseClient | null;
  supabaseWithoutToken: SupabaseClient | null;
}

// Custom supabase hook using Clerk's JWT
export const useSupabaseClient = () => {
  const { isSignedIn, getToken } = useAuth();
  const [status, setStatus] = useState<SupabaseClientStatus>({
    initialized: false,
    supabase: null,
    supabaseWithoutToken: null,
  });

  const supabaseWithoutToken = useMemo(
    () => createClient(env.SUPABASE_URL, env.SUPABASE_KEY),
    []
  );

  const createSupabaseClient = useCallback(async () => {
    if (!isSignedIn) return null;
    const token = await getToken({ template: "supabase-colab" });
    return createClient(env.SUPABASE_URL, env.SUPABASE_KEY, {
      global: {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      },
    });
  }, [isSignedIn]);

  useEffect(() => {
    if (isSignedIn && !env.SELF_HOSTED) {
      createSupabaseClient().then((client) => {
        setStatus((prev) => ({
          ...prev,
          initialized: true,
          supabase: client,
        }));
      });
    } else {
      setStatus((prev) => ({
        ...prev,
        initialized: true,
        supabase: null,
      }));
    }
  }, [isSignedIn, createSupabaseClient]);

  async function fetchAssetUrl(path: string) {
    const url = supabaseWithoutToken.storage.from("images").getPublicUrl(path)
      .data.publicUrl;
    return url;
  }

  return {
    ...status,
    supabaseWithoutToken,
    fetchAssetUrl,
  };
};
