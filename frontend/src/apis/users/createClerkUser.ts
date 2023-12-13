import { User, CreateClerkUserRequest } from "@/types/User";
import { railwayWebClient } from "@/apis/base";

/**
 * Creates a new Clerk registered user in the system.
 * @param userData - The data required to create a new Clerk registered user.
 * @returns A promise that resolves to the User interface.
 */
export async function createClerkUser(
  userData: CreateClerkUserRequest
): Promise<User> {
  const response = await railwayWebClient.post("/users", userData);
  return response.data;
}
