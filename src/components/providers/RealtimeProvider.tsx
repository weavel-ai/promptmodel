import { useRealtimeSubscription } from "@/hooks/useRealtimeSubscription";

export function RealtimeProvider({ children }) {
  useRealtimeSubscription();

  return <>{children}</>;
}
