"use client";

import { useRealtimeStore } from "@/stores/realtimeStore";
import { useOrganization } from "@/hooks/auth/useOrganization";
import { useQuery } from "@tanstack/react-query";
import { useParams } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { toast } from "react-toastify";
import { fetchOrgProjects, fetchProject } from "@/apis/projects";
import { subscribeTable } from "@/apis/subscribe";
import { useAuth } from "./auth/useAuth";

export const useProject = () => {
  const params = useParams();
  const {isSignedIn} = useAuth()
  const { organization } = useOrganization();
  const { projectStream, setProjectStream } = useRealtimeStore();
  const [toastId, setToastId] = useState(null);
  const isOnlineRef = useRef(false);

  const { data: projectListData, refetch: refetchProjectListData } = useQuery({
    queryKey: ["projectListData", { orgId: organization?.id }],
    queryFn: async () =>
      await fetchOrgProjects({ organization_id: organization?.id }),
    enabled: !!organization?.id && isSignedIn,
  });

  const { data: projectData, refetch: refetchProjectData } = useQuery({
    queryKey: ["projectData", { projectUuid: params?.projectUuid }],
    queryFn: async () =>
      await fetchProject({ uuid: params?.projectUuid as string }),
    enabled: !!params?.projectUuid,
  });

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

  return {
    projectData,
    projectListData,
    refetchProjectListData,
    projectUuid: params?.projectUuid as string,
    subscribeToProject,
    syncToast,
  };
};
