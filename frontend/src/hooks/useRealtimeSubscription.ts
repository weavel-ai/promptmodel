import { useEffect } from "react";
import { useProject } from "./useProject";
import { useChatModel } from "./useChatModel";
import { useFunctions } from "./useFunction";
import { useFunctionModel } from "./useFunctionModel";
import { useSamples } from "./useSample";

export function useRealtimeSubscription() {
  const { subscribeToProject } = useProject();
  const { subscribeToFunctionModel } = useFunctionModel();
  const { subscribeToChatModel } = useChatModel();
  const { subscribeToFunctions } = useFunctions();
  const { subscribeToSamples } = useSamples();

  // Subscribe to project changes
  useAsyncSubscription(subscribeToProject);

  // Subscribe to FunctionModel changes
  useAsyncSubscription(subscribeToFunctionModel);

  // Subscribe to ChatModel changes
  useAsyncSubscription(subscribeToChatModel);

  // Subscribe to Function changes
  useAsyncSubscription(subscribeToFunctions);

  // Subscribe to Sample changes
  useAsyncSubscription(subscribeToSamples);
}

function useAsyncSubscription(subscribeFunction: () => Promise<() => void>) {
  useEffect(() => {
    let isActive = true;
    let cleanupFunction;
    if (!subscribeFunction) return;

    const doSubscription = async () => {
      try {
        cleanupFunction = await subscribeFunction();
      } catch (error) {
        console.error("Subscription error:", error);
      }
    };

    if (isActive) {
      doSubscription();
    }

    return () => {
      isActive = false;
      if (cleanupFunction) cleanupFunction();
    };
  }, [subscribeFunction]);
}
