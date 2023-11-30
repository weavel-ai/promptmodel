import { useSupabaseClient } from "@/apis/base";
import { fetchOrganization } from "@/apis/organization";
import { fetchProject, fetchProjects, subscribeProject } from "@/apis/project";
import { fetchUser } from "@/apis/user";
import { useRealtimeStore } from "@/stores/realtimeStore";
import { useOrganization } from "@clerk/nextjs";
import { useQuery } from "@tanstack/react-query";
import { useParams } from "next/navigation";
import { useEffect } from "react";
import { toast } from "react-toastify";

export const useProject = () => {
  const params = useParams();
  const { organization } = useOrganization();
  const { createSupabaseClient } = useSupabaseClient();
  const { projectStream, setProjectStream } = useRealtimeStore();

  const { data: projectListData, refetch: refetchProjectListData } = useQuery({
    queryKey: ["projectListData", { orgId: organization?.id }],
    queryFn: async () =>
      await fetchProjects(await createSupabaseClient(), organization?.id),
    enabled: organization != undefined && organization != null,
  });

  const { data: projectData } = useQuery({
    queryKey: ["projectData", { projectUuid: params?.projectUuid }],
    queryFn: async () =>
      await fetchProject(
        await createSupabaseClient(),
        params?.projectUuid as string
      ),
    enabled: params?.projectUuid != undefined && params?.projectUuid != null,
  });

  // Subscribe to project changes
  useEffect(() => {
    if (!params?.projectUuid) return;
    if (!projectStream) {
      createSupabaseClient().then(async (client) => {
        const newStream = await subscribeProject(
          client,
          organization?.id,
          () => {
            toast("Syncing project...");
            refetchProjectListData();
          }
        );
        setProjectStream(newStream);
      });
    }
    // Cleanup function that will be called when the component unmounts or when isRealtime becomes false
    return () => {
      if (projectStream) {
        projectStream.unsubscribe();
        createSupabaseClient().then((client) => {
          client.removeChannel(projectStream);
        });
      }
    };
  }, [params?.projectUuid, projectStream]);

  return {
    projectData,
    projectListData,
    refetchProjectListData,
    projectUuid: params?.projectUuid as string,
  };
};
