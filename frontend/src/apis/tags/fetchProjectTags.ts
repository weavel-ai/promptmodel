import { railwayWebClient } from "@/apis/base";
import { ReadProjectTagsRequest, Tag } from "@/types/Tag";

/**
 * Reads a Tag's information.
 * @param {ReadProjectTagsRequest} requestData - The data required to fetch a Tag.
 * @returns A promise that resolves to a Tag interface.
 */
export async function fetchProjectTags(
  requestData: ReadProjectTagsRequest
): Promise<Array<Tag>> {
  const response = await railwayWebClient.get("tags", {
    params: requestData,
  });
  return response.data;
}
