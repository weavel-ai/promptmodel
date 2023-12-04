import axios from "axios";
import { ENDPOINT_URL, SUPABASE_URL, SUPABASE_KEY } from "@/constants";
import { SupabaseClient, createClient } from "@supabase/supabase-js";
import { Database } from "@/supabase.types";
import { useAuth } from "@clerk/nextjs";
import { useCallback, useEffect, useMemo, useState } from "react";
import { parseMultipleJson } from "@/utils";

const AXIOS_HEADERS = {
  "Content-type": "application/json",
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Access-Control-Allow-Headers": "*",
  "Access-Control-Allow-Credentials": "true",
};

export const railwayWebClient = axios.create({
  baseURL: `${ENDPOINT_URL}/web`,
  headers: AXIOS_HEADERS,
});

export const railwayDevClient = axios.create({
  baseURL: `${ENDPOINT_URL}/dev`,
  headers: AXIOS_HEADERS,
});

export const fetchStream = async ({
  url,
  params,
  body,
  onNewData,
}: {
  url: string;
  params?: Record<string, any>;
  body?: Record<string, any>;
  onNewData: (data: Record<string, any>) => void;
}) => {
  let formattedUrl: string = ENDPOINT_URL + url;
  if (params) {
    formattedUrl += `?${Object.keys(params)
      .map((key) => `${key}=${params[key]}`)
      .join("&")}`;
  }

  // Set params
  const response = await fetch(formattedUrl, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });
  const reader = response.body?.getReader();
  console.log(response);

  if (reader) {
    const decoder = new TextDecoder("utf-8");

    while (true) {
      const { value, done } = await reader.read();
      const buffer = decoder.decode(value);
      try {
        const jsonObjects: object[] = parseMultipleJson(buffer);
        for (const jsonObject of jsonObjects) {
          onNewData(jsonObject as Record<string, any>);
        }
      } catch (error) {
        console.error("Error parsing JSON:", error);
      }
      if (done) {
        console.log("Stream complete.");
        break;
      }
    }
  }
};

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
    () => createClient(SUPABASE_URL, SUPABASE_KEY),
    []
  );

  const createSupabaseClient = useCallback(async () => {
    if (!isSignedIn) return null;
    const token = await getToken({ template: "supabase-colab" });
    return createClient(SUPABASE_URL, SUPABASE_KEY, {
      global: {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      },
    });
  }, [isSignedIn, getToken]);

  useEffect(() => {
    if (isSignedIn) {
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
