"use client";

import { SessionProvider } from "next-auth/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import "react-toastify/dist/ReactToastify.css";
import { ToastContainer, toast } from "react-toastify";
import { initAmplitude } from "@/services/amplitude";
import { RealtimeProvider } from "./providers/RealtimeProvider";
import { useCallback, useEffect, useState } from "react";
import { env } from "@/constants";
import { internalServerClient, webServerClient } from "@/apis/base";
import { useAuth } from "@/hooks/auth/useAuth";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 3600,
    },
  },
});

export function Providers({ children, session }) {
  if (typeof window !== "undefined") {
    initAmplitude();
  }

  const content = (
    <QueryClientProvider client={queryClient}>
      <ToastContainer
        position="top-right"
        autoClose={3000}
        hideProgressBar={false}
        newestOnTop={false}
        closeOnClick
        rtl={false}
        pauseOnFocusLoss={false}
        pauseOnHover={false}
        containerId="default"
        theme="dark"
        className="z-[9999999999]"
      />
      <AuthProvider>
        {/* <ThemeProvider> */}
        <RealtimeProvider>{children}</RealtimeProvider>
        {/* </ThemeProvider> */}
      </AuthProvider>
    </QueryClientProvider>
  );

  if (env.SELF_HOSTED) {
    return <SessionProvider session={session}>{content}</SessionProvider>;
  }

  return content;
}

function AuthProvider({ children }) {
  const { getToken, isSignedIn, isLoaded } = useAuth();

  const getAndSetToken = useCallback(async () => {
    getToken().then((token: string) => {
      localStorage.setItem("token", token);
    });
  }, [getToken]);

  useEffect(() => {
    getAndSetToken();
    // Refresh local token every 50 seconds
    setInterval(getAndSetToken, 1000 * 50);
  }, [getAndSetToken]);

  const configCallback = useCallback(
    async (config: any) => {
      const token = await getToken();
      config.headers.Authorization = token ? `Bearer ${token}` : "";
      return config;
    },
    [getToken]
  );

  useEffect(() => {
    const requestInterceptor =
      webServerClient.interceptors.request.use(configCallback);
    const internalRequestInterceptor =
      internalServerClient.interceptors.request.use(configCallback);

    return () => {
      // Eject the interceptor when the component unmounts to prevent memory leaks
      webServerClient.interceptors.request.eject(requestInterceptor);
      internalServerClient.interceptors.request.eject(
        internalRequestInterceptor
      );
    };
  }, [configCallback]);

  if (!isLoaded) {
    return (
      <div className="w-full h-full flex justify-center items-center">
        <div className="loading loading-lg loading-ring" />
      </div>
    );
  }

  return <>{children}</>;
}
