import { ReadUserRequest, User } from "@/types/User";
import { railwayWebClient, railwayWebServerClient } from "../base";

/**
 * Reads a user's information from the system.
 * @param requestData - The data required to read a user's information.
 * @param {"client" | "server"} from - Whether the function is called from client or server side.
 * @returns A promise that resolves to the User interface.
 */
export async function fetchUser(requestData: ReadUserRequest, from: "client" | "server"="client"): Promise<User> {
  const response = await (from == "server" ? railwayWebServerClient :railwayWebClient).get(`/v1/users/me`, {
    params: requestData,
  });
  if (response.status !== 200) {
    throw new Error("Error reading user: " + response.statusText);
  }
  return response.data;
}
