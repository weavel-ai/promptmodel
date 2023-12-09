import { useSupabaseClient } from "@/apis/supabase";
import { fetchTags } from "@/apis/tags";
import { useQuery } from "@tanstack/react-query";
import { useParams } from "next/navigation";

export const EMPTY_INPUTS_LABEL = "No Inputs";

export const useTags = () => {
  const params = useParams();
  const { supabase } = useSupabaseClient();

  const { data: tagsListData, refetch: refetchTagsListData } = useQuery({
    queryKey: ["tagsListData", { projectUuid: params?.projectUuid }],
    queryFn: async () =>
      await fetchTags(supabase, params?.projectUuid as string),
    enabled: !!supabase && !!params?.projectUuid,
  });

  return {
    tagsListData,
    refetchTagsListData,
  };
};
