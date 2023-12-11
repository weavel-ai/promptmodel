import { useEffect } from "react";
import { useProject } from "./useProject";
import { useChatModel } from "./useChatModel";
import { useFunctions } from "./useFunction";
import { useFunctionModel } from "./useFunctionModel";
import { useSamples } from "./useSample";

export function useRealtimeSubscription() {
  const { subscribeToProject, subscriptionDep: projectSubscriptionDep } =
    useProject();
  const {
    subscribeToFunctionModel,
    subscriptionDep: functionModelSubscriptionDep,
  } = useFunctionModel();
  const { subscribeToChatModel, subscriptionDep: chatModelSubscriptionDep } =
    useChatModel();
  const { subscribeToFunctions, subscriptionDep: functionSubscriptionDep } =
    useFunctions();
  const { subscribeToSamples, subscriptionDep: sampleSubscriptionDep } =
    useSamples();

  // Subscribe to project changes
  useAsyncSubscription(subscribeToProject, projectSubscriptionDep);

  // Subscribe to FunctionModel changes
  useAsyncSubscription(subscribeToFunctionModel, functionModelSubscriptionDep);

  // Subscribe to ChatModel changes
  useAsyncSubscription(subscribeToChatModel, chatModelSubscriptionDep);

  // Subscribe to Function changes
  useAsyncSubscription(subscribeToFunctions, functionSubscriptionDep);

  // Subscribe to Sample changes
  useAsyncSubscription(subscribeToSamples, sampleSubscriptionDep);
}

function useAsyncSubscription(
  subscribeFunction: () => Promise<() => void>,
  dependencies: Array<any>
) {
  useEffect(() => {
    let isActive = true;
    let cleanupFunction;

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
  }, [...dependencies, subscribeFunction]);
}
