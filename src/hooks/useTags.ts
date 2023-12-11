import { fetchProjectTags } from "@/apis/tags";
import { useQuery } from "@tanstack/react-query";
import { useParams } from "next/navigation";

export const EMPTY_INPUTS_LABEL = "No Inputs";

export const useTags = () => {
  const params = useParams();

  const { data: tagsListData, refetch: refetchTagsListData } = useQuery({
    queryKey: ["tagsListData", { projectUuid: params?.projectUuid }],
    queryFn: async () =>
      await fetchProjectTags({ project_uuid: params?.projectUuid as string }),
    enabled: !!params?.projectUuid,
  });

  return {
    tagsListData,
    refetchTagsListData,
  };
};
