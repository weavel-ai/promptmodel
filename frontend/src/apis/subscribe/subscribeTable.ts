import { ENV } from "@/constants";
import { SubscribeTableRequest } from "@/types/SubscribeTable";
import { webServerClient } from "../base";

/**
 * Subscribe to postgres table's changes.
 * @param {SubscribeTableRequest} requestData - Name of the table to subscribe to.
 */
export async function subscribeTable(
  requestData: SubscribeTableRequest
): Promise<WebSocket> {
  const { tableName, onMessage, ...params } = requestData;

  let endpoint: string;
  // Format websocket endpoint (https:// or http:// -> ws:// or wss://)
  if (ENV.ENDPOINT_URL.startsWith("https://")) {
    endpoint = ENV.ENDPOINT_URL.replace("https://", "wss://");
  } else if (ENV.ENDPOINT_URL.startsWith("http://")) {
    endpoint = ENV.ENDPOINT_URL.replace("http://", "ws://");
  } else {
    throw new Error("Invalid endpoint URL");
  }
  const tokenRes = await webServerClient.post("/subscribe/start");
  const token = tokenRes.data;
  const newParams = { ...params, ...token };
  const queryParams = new URLSearchParams(Object.entries(newParams)).toString();

  const ws = new WebSocket(
    `${endpoint}/web/subscribe/${tableName}?${queryParams}`
  );
  return new Promise((resolve, reject) => {
    ws.onopen = () => {
      setInterval(() => {
        ws.send("ping");
      }, 30000); // 30 seconds
      resolve(ws);
    };
    // ws.onmessage = requestData.onMessage;
    (ws.onmessage = (event) => {
      if (event.data == "ping") {
        ws.send("pong");
        return;
      } else if (event.data == "pong") {
        return;
      }
      onMessage(event);
    }),
      (ws.onclose = (event) => {
        console.log("WebSocket closed", event.code, event.reason);
      }),
      (ws.onerror = (error) => {
        console.error("WebSocket error", error);
        reject(error);
      });
  });
}
