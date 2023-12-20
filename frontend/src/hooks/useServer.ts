import { useQuery } from "@tanstack/react-query";
import { useAuth } from "./auth/useAuth";
import { useMemo } from "react";
import axios from "axios";
import { env } from "@/constants";

const AXIOS_HEADERS = {
  "Content-type": "application/json",
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Access-Control-Allow-Headers": "*",
  "Access-Control-Allow-Credentials": "true",
};

export function useServer() {
  const { isSignedIn, userId, getToken } = useAuth();
  const { data: accessToken } = useQuery({
    queryKey: ["accessToken", userId],
    queryFn: getToken,
    enabled: isSignedIn,
  });

  const serverClient = useMemo(() => {
    return axios.create({
      baseURL: `${env.ENDPOINT_URL}/web`,
      headers: {
        ...AXIOS_HEADERS,
        Authorization: `Bearer ${accessToken}`,
      },
    });
  }, [accessToken]);

  //   const;
}
