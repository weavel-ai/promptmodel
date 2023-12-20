import axios from "axios";
import { env } from "@/constants";

import { parseMultipleJson } from "@/utils";
import { useAuth } from "@/hooks/auth/useAuth";

const AXIOS_HEADERS = {
  "Content-type": "application/json",
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Access-Control-Allow-Headers": "*",
  "Access-Control-Allow-Credentials": "true",
};

export const webServerClient = axios.create({
  baseURL: `${env.ENDPOINT_URL}/web`,
  headers: AXIOS_HEADERS,
});

export const unauthorizedWebServerClient = axios.create({
  baseURL: `${env.ENDPOINT_URL}/web`,
  headers: AXIOS_HEADERS,
});

export const internalServerClient = axios.create({
  baseURL: `${env.ENDPOINT_URL_INTERNAL}/web`,
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
  let formattedUrl: string = env.ENDPOINT_URL + url;
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
