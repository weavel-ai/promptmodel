import { User, AuthorizeUserRequest } from "@/types/User";
import { railwayWebServerClient } from "@/apis/base";

/**
 * @memo This can only be called from the Next.js server.
 * Creates a new user in the system.
 * @param userData - The data required to create a new user.
 * @returns A promise that resolves to the User interface.
 */
export async function authorizeUser(
  userData: AuthorizeUserRequest
): Promise<User> {
  const response = await railwayWebServerClient.post("/v1/users/authorize", userData);
  return response.data;
}
