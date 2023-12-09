"use client";

import { useSupabaseClient } from "@/apis/supabase";
import { fetchProject, fetchProjects, subscribeProject } from "@/apis/project";
import { useRealtimeStore } from "@/stores/realtimeStore";
import { useOrganization } from "@/hooks/auth/useOrganization";
import { useQuery } from "@tanstack/react-query";
import { useParams } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
import { toast } from "react-toastify";

export const useProject = () => {
  const params = useParams();
  const { organization } = useOrganization();
  const { supabase } = useSupabaseClient();
  const { projectStream, setProjectStream } = useRealtimeStore();
  const [toastId, setToastId] = useState(null);
  const isOnlineRef = useRef(false);

  const { data: projectListData, refetch: refetchProjectListData } = useQuery({
    queryKey: ["projectListData", { orgId: organization?.id }],
    queryFn: async () => await fetchProjects(supabase, organization?.id),
    enabled: !!supabase && !!organization?.id,
  });

  const { data: projectData, refetch: refetchProjectData } = useQuery({
    queryKey: ["projectData", { projectUuid: params?.projectUuid }],
    queryFn: async () =>
      await fetchProject(supabase, params?.projectUuid as string),
    enabled: !!supabase && !!params?.projectUuid,
  });

  useEffect(() => {
    isOnlineRef.current = projectData?.online;
  }, [projectData?.online]);

  const syncToast = {
    open: useCallback(() => {
      if (isOnlineRef.current && !toast.isActive(toastId)) {
        const toastId = toast.loading("Syncing..", {
          toastId: "sync",
          autoClose: 2000,
        });
        setToastId(toastId);
      }
    }, [toastId]),
    close: useCallback(() => {
      toast.dismiss("sync");
    }, []),
  };

  async function subscribeToProject() {
    if (!params?.projectUuid || !organization?.id || projectStream || !supabase)
      return;
    const newStream = await subscribeProject(
      supabase,
      organization?.id,
      async () => {
        syncToast.open();
        await refetchProjectListData();
        await refetchProjectData();
        syncToast.close();
      }
    );
    setProjectStream(newStream);

    return () => {
      if (projectStream) {
        projectStream.unsubscribe();
        supabase.removeChannel(projectStream);
      }
    };
  }

  const subscriptionDep = [
    params?.projectUuid,
    organization?.id,
    projectStream,
    supabase,
  ];

  return {
    projectData,
    projectListData,
    refetchProjectListData,
    projectUuid: params?.projectUuid as string,
    subscribeToProject,
    subscriptionDep,
    syncToast,
  };
};
