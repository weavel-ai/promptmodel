"use client";

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import "react-toastify/dist/ReactToastify.css";
import { ToastContainer, toast } from "react-toastify";
import { initAmplitude } from "@/services/amplitude";
import { RealtimeProvider } from "./providers/RealtimeProvider";
import { useEffect } from "react";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 3600,
    },
  },
});

export function Providers({ children }) {
  if (typeof window !== "undefined") {
    initAmplitude();
  }

  return (
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
      />
      {/* <ThemeProvider> */}
      <RealtimeProvider>{children}</RealtimeProvider>
      {/* </ThemeProvider> */}
    </QueryClientProvider>
  );
}
