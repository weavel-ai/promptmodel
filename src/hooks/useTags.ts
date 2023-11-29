import { useSupabaseClient } from "@/apis/base";
import { fetchTags } from "@/apis/tags";
import { useQuery } from "@tanstack/react-query";
import { useParams } from "next/navigation";

export const EMPTY_INPUTS_LABEL = "No Inputs";

export const useTags = () => {
  const params = useParams();
  const { createSupabaseClient } = useSupabaseClient();

  const { data: tagsListData, refetch: refetchTagsListData } = useQuery({
    queryKey: ["tagsListData", { projectUuid: params?.projectUuid }],
    queryFn: async () =>
      await fetchTags(
        await createSupabaseClient(),
        params?.projectUuid as string
      ),
    enabled: params?.projectUuid != undefined && params?.projectUuid != null,
  });

  return {
    tagsListData,
    refetchTagsListData,
  };
};
