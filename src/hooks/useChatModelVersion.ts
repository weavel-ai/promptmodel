import { fetchChatModelVersions } from "@/apis/chat_model_versions";
import { useQuery } from "@tanstack/react-query";
import { useParams } from "next/navigation";

export const useChatModelVersion = () => {
  const params = useParams();

  const {
    data: chatModelVersionListData,
    refetch: refetchChatModelVersionListData,
  } = useQuery({
    queryKey: [
      "chatModelVersionListData",
      { chatModelUuid: params?.chatModelUuid },
    ],
    queryFn: async () =>
      await fetchChatModelVersions({
        chat_model_uuid: params?.chatModelUuid as string,
      }),
    enabled: !!params?.chatModelUuid,
  });

  return {
    chatModelUuid: params?.chatModelUuid as string,
    chatModelVersionListData,
    refetchChatModelVersionListData,
  };
};
