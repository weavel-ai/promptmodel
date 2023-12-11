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
  //   const response = await railwayWebClient.post("/v1/users", userData);
  //   if (response.status !== 201) {
  //     throw new Error("Error creating user: " + response.status);
  //   }
  //   return response.data;
  /**
   * @todo: Implement this function.
   */
  return {} as User;
}
