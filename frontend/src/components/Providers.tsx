"use client";

import { SessionProvider } from "next-auth/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import "react-toastify/dist/ReactToastify.css";
import { ToastContainer, toast } from "react-toastify";
import { initAmplitude } from "@/services/amplitude";
import { RealtimeProvider } from "./providers/RealtimeProvider";
import { useEffect } from "react";
import { env } from "@/constants";

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
      {/* <ThemeProvider> */}
      <RealtimeProvider>{children}</RealtimeProvider>
      {/* </ThemeProvider> */}
    </QueryClientProvider>
  );

  if (env.SELF_HOSTED) {
    return <SessionProvider session={session}>{content}</SessionProvider>;
  }

  return content;
}
