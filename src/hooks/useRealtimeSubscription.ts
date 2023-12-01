import { useEffect } from "react";
import { useProject } from "./useProject";
import { useChatModel } from "./useChatModel";
import { useFunctions } from "./useFunction";
import { usePromptModel } from "./usePromptModel";
import { useSamples } from "./useSample";
import { toast } from "react-toastify";

export function useRealtimeSubscription() {
  const { subscribeToProject, subscriptionDep: projectSubscriptionDep } =
    useProject();
  const {
    subscribeToPromptModel,
    subscriptionDep: promptModelSubscriptionDep,
  } = usePromptModel();
  const { subscribeToChatModel, subscriptionDep: chatModelSubscriptionDep } =
    useChatModel();
  const { subscribeToFunctions, subscriptionDep: functionSubscriptionDep } =
    useFunctions();
  const { subscribeToSamples, subscriptionDep: sampleSubscriptionDep } =
    useSamples();

  // Subscribe to project changes
  useEffect(subscribeToProject, projectSubscriptionDep);

  // Subscribe to PromptModel changes
  useEffect(subscribeToPromptModel, promptModelSubscriptionDep);

  // Subscribe to ChatModel changes
  useEffect(subscribeToChatModel, chatModelSubscriptionDep);

  // Subscribe to Function changes
  useEffect(subscribeToFunctions, functionSubscriptionDep);

  // Subscribe to Sample changes
  useEffect(subscribeToSamples, sampleSubscriptionDep);
}
