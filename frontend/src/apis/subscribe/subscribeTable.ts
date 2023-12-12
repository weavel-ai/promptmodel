import { env } from "@/constants";
import { SubscribeTableRequest } from "@/types/SubscribeTable";

/**
 * Subscribe to postgres table's changes.
 * @param {SubscribeTableRequest} requestData - Name of the table to subscribe to.
 */
export function subscribeTable(
  requestData: SubscribeTableRequest
): Promise<WebSocket> {
  const { tableName, onMessage, ...params } = requestData;

  const queryParams = new URLSearchParams(Object.entries(params)).toString();
  const ws = new WebSocket(
    `${env.ENDPOINT_URL.replace(
      "https://",
      "wss://"
    )}/web/subscribe/${tableName}?${queryParams}`
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
