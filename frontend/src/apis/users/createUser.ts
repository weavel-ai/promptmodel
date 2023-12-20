import { User, CreateUserRequest } from "@/types/User";
import { unauthorizedWebServerClient } from "@/apis/base";

/**
 * Creates a new user in the system.
 * @param userData - The data required to create a new user.
 * @returns A promise that resolves to the User interface.
 */
export async function createUser(userData: CreateUserRequest): Promise<User> {
  const response = await unauthorizedWebServerClient.post(
    "/v1/users",
    userData
  );
  return response.data;
}
