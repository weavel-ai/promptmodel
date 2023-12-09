import { ReadUserRequest, User } from "@/types/User";
import { railwayWebClient } from "../base";

/**
 * Reads a user's information from the system.
 * @param requestData - The data required to read a user's information.
 * @returns A promise that resolves to the User interface.
 */
export async function getUser(requestData: ReadUserRequest): Promise<User> {
  const response = await railwayWebClient.get(`/v1/users/me`, {
    params: requestData,
  });
  if (response.status !== 200) {
    throw new Error("Error reading user: " + response.statusText);
  }
  return response.data;
}
