"use client";

import { useRealtimeStore } from "@/stores/realtimeStore";
import { useOrganization } from "@/hooks/auth/useOrganization";
import {
  QueryCache,
  useMutation,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";
import { useParams } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { toast } from "react-toastify";
import { fetchOrgProjects, fetchProject } from "@/apis/projects";
import { subscribeTable } from "@/apis/subscribe";
import { useAuth } from "./auth/useAuth";
import { SupabaseClient } from "@supabase/supabase-js";
import { useSupabaseClient } from "@/apis/supabase";
import { Project } from "@/types/Project";
import { fetchPublicProjectList } from "@/apis/projects/fetchPublicProject";

export const useProject = () => {
  const params = useParams();
  const { getToken } = useAuth();
  const { organization } = useOrganization();
  const { projectStream, setProjectStream } = useRealtimeStore();
  const [toastId, setToastId] = useState(null);
  const isOnlineRef = useRef(false);
  const queryClient = useQueryClient();
  const { supabaseWithoutToken } = useSupabaseClient();

  const { data: projectListData, refetch: refetchProjectListData } = useQuery({
    queryKey: ["projectListData", { orgSlug: params?.org_slug as string }],
    queryFn: async () => {
      const token = await getToken();
      return await fetchOrgProjects(
        {
          organization_slug: params?.org_slug as string,
        },
        token
      );
    },
    enabled: !!params?.org_slug,
  });

  const { data: projectData, refetch: refetchProjectData } = useQuery({
    queryKey: ["projectData", { projectUuid: params?.projectUuid }],
    queryFn: async () =>
      await fetchProject({ uuid: params?.projectUuid as string }),
    enabled: !!params?.projectUuid,
  });

  const { data: publicProjectListData, refetch: refetchPublicProjectListData } =
    useQuery({
      queryKey: ["publicProjectData"],
      queryFn: async () => await fetchPublicProjectList(),
    });

  // useEffect(() => {
  //   console.log("publicProjectListData", publicProjectListData);
  // }, [publicProjectListData]);

  useEffect(() => {
    isOnlineRef.current = projectData?.online;
  }, [projectData?.online]);

  const syncToast = useMemo(
    () => ({
      open: () => {
        if (isOnlineRef.current && !toast.isActive(toastId)) {
          const toastId = toast.loading("Syncing..", {
            toastId: "sync",
            autoClose: 2000,
          });
          setToastId(toastId);
        }
      },
      close: () => toast.dismiss("sync"),
    }),
    [toastId]
  );

  const subscribeToProject = useCallback(async () => {
    if (!organization?.id || !!projectStream) return;
    const newStream: WebSocket = await subscribeTable({
      tableName: "project",
      organization_id: organization?.id,
      onMessage: async (event) => {
        syncToast.open();
        await refetchProjectListData();
        await refetchProjectData();
        syncToast.close();
      },
    });
    setProjectStream(newStream);

    return () => {
      if (!!projectStream) {
        projectStream.close();
      }
    };
  }, [
    organization?.id,
    projectStream,
    setProjectStream,
    refetchProjectData,
    refetchProjectListData,
    syncToast,
  ]);

  const updateIsPublicMutation = useMutation({
    mutationKey: ["updateIsPublic"],
    mutationFn: async ({ isPublic }: { isPublic: boolean }) => {
      const toastId = toast.loading("Converting...");
      await supabaseWithoutToken
        .from("project")
        .update({ is_public: !isPublic })
        .match({ uuid: params?.projectUuid });

      toast.update(toastId, {
        containerId: "default",
        render: "Converted!",
        type: "success",
        isLoading: false,
        autoClose: 1000,
      });
      return { isPublic };
    },
    onSuccess: () => {
      console.log("On Success");
      queryClient.setQueryData<Project>(
        ["projectData", { projectUuid: params?.projectUuid }],
        (oldData) => {
          if (!oldData) return;

          return {
            ...oldData,
            is_public: !oldData.is_public,
          };
        }
      );
    },
  });

  return {
    projectData,
    projectListData,
    publicProjectListData,
    refetchProjectListData,
    projectUuid: params?.projectUuid as string,
    subscribeToProject,
    syncToast,
    updateIsPublicMutation,
  };
};
