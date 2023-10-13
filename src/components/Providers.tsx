"use client";

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import "react-toastify/dist/ReactToastify.css";
import { ToastContainer } from "react-toastify";
import { initAmplitude } from "@/services/amplitude";

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
        theme="dark"
      />
      {/* <ThemeProvider> */}
      {children}
      {/* </ThemeProvider> */}
    </QueryClientProvider>
  );
}
