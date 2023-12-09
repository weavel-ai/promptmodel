import { useSupabaseClient } from "@/apis/supabase";
import { useQuery } from "@tanstack/react-query";
import { useParams } from "next/navigation";
import { fetchChatModelVersions } from "@/apis/chatModelVersion";
import { useChatModelVersionStore } from "@/stores/chatModelVersionStore";

export const useChatModelVersion = () => {
  const params = useParams();
  const { supabase } = useSupabaseClient();

  const {
    data: chatModelVersionListData,
    refetch: refetchChatModelVersionListData,
  } = useQuery({
    queryKey: [
      "chatModelVersionListData",
      { chatModelUuid: params?.chatModelUuid },
    ],
    queryFn: async () =>
      await fetchChatModelVersions(supabase, params?.chatModelUuid as string),
    enabled: !!supabase && !!params?.chatModelUuid,
  });

  return {
    chatModelUuid: params?.chatModelUuid as string,
    chatModelVersionListData,
    refetchChatModelVersionListData,
  };
};
