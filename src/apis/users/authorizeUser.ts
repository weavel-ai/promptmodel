import { User, AuthorizeUserRequest } from "@/types/user";
import { railwayWebClient } from "@/apis/base";

/**
 * Creates a new user in the system.
 * @param userData - The data required to create a new user.
 * @returns A promise that resolves to the User interface.
 */
export async function authorizeUser(
  userData: AuthorizeUserRequest
): Promise<User> {
  const response = await railwayWebClient.post("/v1/users/authorize", userData);

  return response.data;
}
