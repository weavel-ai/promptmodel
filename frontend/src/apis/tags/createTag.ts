import { railwayWebClient } from "@/apis/base";
import { CreateTagRequest, Tag } from "@/types/Tag";

/**
 * Creates a new Tag in the system.
 * @param requestData - The data required to create a new Tag.
 * @returns A promise that resolves to the Tag interface.
 */
export async function createTag(requestData: CreateTagRequest): Promise<Tag> {
  const response = await railwayWebClient.post("/tags", requestData);
  return response.data;
}
