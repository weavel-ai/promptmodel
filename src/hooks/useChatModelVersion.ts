import { useSupabaseClient } from "@/apis/base";
import { useQuery } from "@tanstack/react-query";
import { useParams } from "next/navigation";
import { fetchChatModelVersions } from "@/apis/chatModelVersion";

export const useChatModelVersion = () => {
  const params = useParams();
  const { createSupabaseClient } = useSupabaseClient();

  const {
    data: chatModelVersionListData,
    refetch: refetchChatModelVersionListData,
  } = useQuery({
    queryKey: [
      "chatModelVersionListData",
      { chatModelUuid: params?.chatModelUuid },
    ],
    queryFn: async () =>
      await fetchChatModelVersions(
        await createSupabaseClient(),
        params?.chatModelUuid as string
      ),
    enabled:
      params?.chatModelUuid != undefined && params?.chatModelUuid != null,
  });

  return {
    chatModelUuid: params?.chatModelUuid as string,
    chatModelVersionListData,
    refetchChatModelVersionListData,
  };
};
