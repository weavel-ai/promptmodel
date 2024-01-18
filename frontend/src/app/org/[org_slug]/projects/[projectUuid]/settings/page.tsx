"use client";

import { useProject } from "@/hooks/useProject";
import { Prism as SyntaxHighlighter } from "react-syntax-highlighter";
import { nightOwl } from "react-syntax-highlighter/dist/esm/styles/prism";
import {
  Check,
  Clipboard,
  PencilSimple,
  TrashSimple,
} from "@phosphor-icons/react";
import { toast } from "react-toastify";
import { useEffect, useMemo, useRef, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { LLMProvider, LLMProviders, env } from "@/constants";
import { Modal } from "@/components/modals/Modal";
import { InputField } from "@/components/InputField";
import { useOrganization } from "@/hooks/auth/useOrganization";
import { ReactSVG } from "react-svg";
import { ClickToConfirmDeleteButton } from "@/components/buttons/ClickToConfirmDeleteButton";
import { SupabaseClient, createClient } from "@supabase/supabase-js";

export default function Page() {
  const { projectData } = useProject();
  const { configuredLLMProviderList } = useOrganization();
  const [isOpen, setIsOpen] = useState(false);

  const supportedProviders = useMemo(
    () =>
      LLMProviders.filter((p) => {
        if (p.cloudUnsupported) return false;
        if (p.requiredParams?.length > 0) return false;
        return true;
      }),
    []
  );

  const api_key_text = useMemo(
    () => `PROMPTMODEL_API_KEY=${projectData?.api_key}`,
    [projectData?.api_key]
  );

  const handleClickCopy = () => {
    navigator.clipboard.writeText(api_key_text);
    toast.success("Copied to clipboard.", {
      autoClose: 2000,
    });
  };

  return (
    <div className="w-full h-full pl-20">
      <div className="w-full h-full min-h-fit flex flex-col justify-start gap-y-6 pt-20 pl-8 pb-20">
        {/* Header */}
        <div className="flex flex-row justify-start items-center">
          <p className="text-2xl font-bold text-base-content">
            Project Settings
          </p>
        </div>
        <div className="w-full h-fit pe-16 flex flex-col gap-y-1">
          <p className="text-lg font-semibold">Promptmodel API Key</p>
          <div className="relative">
            <SyntaxHighlighter language="javascript" style={nightOwl}>
              {api_key_text}
            </SyntaxHighlighter>
            <div className="absolute right-4 bottom-0 top-0 h-full flex justify-center items-center">
              <div className="py-1 tooltip tooltip-secondary" data-tip="Copy">
                <button
                  className="bg-transparent hover:bg-neutral-content/30 text-neutral-content rounded-md p-2"
                  onClick={handleClickCopy}
                >
                  <Clipboard size={20} />
                </button>
              </div>
            </div>
          </div>
        </div>
        <div className="w-full h-fit pe-16 flex flex-col justify-start gap-y-1">
          <div className="flex flex-row justify-start items-center gap-x-4">
            <p className="text-lg font-semibold">LLM Provider API Keys</p>
            <Badge variant="outline" size="md">
              Shared in organization
            </Badge>
          </div>
        </div>
        <div className="w-fit h-fit pe-16 flex flex-wrap justify-start gap-4">
          {supportedProviders?.map((provider: LLMProvider) => (
            <APIKeyInput
              key={provider.name}
              isConfigured={configuredLLMProviderList?.some(
                (providerName: string) => providerName == provider.name
              )}
              provider={provider}
            />
          ))}
        </div>
        <div className="pt-16 flex flex-row gap-x-16 items-start">
          <div className="flex flex-col gap-y-4">
            <p className="text-lg font-semibold">Change Project Visibility</p>
            <p className="text-sm">
              {projectData?.is_public
                ? "Your project is currently public. Anyone can view your prompts and create variants."
                : "Your project is currently private."}
            </p>
          </div>
          <button
            className="btn btn-sm w-fit bg-transparent border-red-500 border-2 text-red-500 hover:bg-red-500 hover:text-base-100"
            onClick={() => {
              setIsOpen(true);
            }}
          >
            {projectData?.is_public ? "Set Private" : "Set Public"}
          </button>
        </div>
        <PublicStateModifyModal
          isOpen={isOpen}
          setIsOpen={setIsOpen}
          isPublic={projectData?.is_public}
          projectUuid={projectData?.uuid}
        />
      </div>
    </div>
  );
}

function APIKeyInput({
  isConfigured,
  provider,
}: {
  provider: LLMProvider;
  isConfigured: boolean;
}) {
  const { deleteLLMProviderConfig } = useOrganization();
  const [isInputModalOpen, setIsInputModalOpen] = useState<boolean>(false);

  function handleDelete() {
    deleteLLMProviderConfig({
      provider_name: provider.name,
    });
  }

  return (
    <div className="w-fit flex flex-row gap-x-2 justify-between items-center rounded-md border p-2">
      {provider.logoPath && (
        <ReactSVG src={provider.logoPath} className="!w-6 !h-6" />
      )}
      <p className="text-base-content/90 pr-2">{provider.label}</p>
      <div className="flex flex-row gap-x-2 justify-start items-center">
        <button
          className="btn btn-sm btn-neutral normal-case group"
          onClick={() => setIsInputModalOpen(true)}
        >
          {isConfigured ? (
            <div className="flex flex-row gap-x-2 justify-start items-center">
              <label className="swap swap-flip group-hover:swap-active">
                <Check
                  size={16}
                  weight="bold"
                  className="text-success swap-off"
                />
                <PencilSimple
                  size={16}
                  weight="fill"
                  className="text-secondary swap-on"
                />
              </label>
              <label className="swap group-hover:swap-active">
                <p className="swap-off">Configured</p>
                <p className="swap-on">Configure</p>
              </label>
            </div>
          ) : (
            <p>Configure</p>
          )}
        </button>
        {isConfigured && (
          <ClickToConfirmDeleteButton handleDelete={handleDelete} />
        )}
      </div>
      <APIKeyInputModal
        provider={provider}
        isOpen={isInputModalOpen}
        setIsOpen={setIsInputModalOpen}
      />
    </div>
  );
}

interface APIKeyInputModalProps {
  provider: LLMProvider;
  isOpen: boolean;
  setIsOpen: (isOpen: boolean) => void;
}

function APIKeyInputModal(props: APIKeyInputModalProps) {
  const { provider } = props;
  const { upsertLLMProviderConfig, upsertLLMProviderConfigStatus } =
    useOrganization();
  const [apiKeys, setApiKeys] = useState<{ [key: string]: string }>(
    provider.requiredEnvVars?.reduce((acc, curr) => {
      acc[curr] = "";
      return acc;
    }, {})
  );

  useEffect(() => {
    if (!props.isOpen) return;
    setApiKeys(
      provider.requiredEnvVars?.reduce((acc, curr) => {
        acc[curr] = "";
        return acc;
      }, {})
    );
  }, [props.isOpen, provider.requiredEnvVars]);

  async function handleSave() {
    upsertLLMProviderConfig({
      provider_name: provider.name,
      env_vars: apiKeys,
    });
    props.setIsOpen(false);
  }

  return (
    <Modal isOpen={props.isOpen} setIsOpen={props.setIsOpen}>
      <div className="bg-popover rounded-box shadow-lg p-6 flex flex-col gap-y-2">
        <div className="flex flex-row justify-start items-center">
          <p className="font-semibold text-lg">
            Configure Environment Variables
          </p>
        </div>
        <Badge className="w-fit" variant="secondary" size="md">
          {provider.label}
        </Badge>
        <div className="flex flex-col gap-y-4 items-start h-fit w-full my-4">
          {provider.requiredEnvVars?.map((envVar) => (
            <InputField
              type="password"
              autoComplete="off"
              key={envVar}
              label={envVar}
              value={apiKeys[envVar]}
              setValue={(value: string) => {
                setApiKeys((prev) => ({ ...prev, [envVar]: value }));
              }}
              inputClassName="!w-min input-password"
            />
          ))}
        </div>
        <div className="flex flex-row w-full justify-end">
          <button
            className="btn btn-sm bg-primary text-primary-content hover:bg-primary/80 normal-case"
            onClick={() => {
              if (upsertLLMProviderConfigStatus == "loading") return;
              handleSave();
            }}
            disabled={provider.requiredEnvVars?.some(
              (envVar) => apiKeys[envVar] == ""
            )}
          >
            {upsertLLMProviderConfigStatus == "loading" ? (
              <div className="loading loading-sm loading-spinner" />
            ) : (
              <p>Save</p>
            )}
          </button>
        </div>
      </div>
    </Modal>
  );
}

function PublicStateModifyModal({ isOpen, setIsOpen, isPublic, projectUuid }) {
  const { updateIsPublicMutation } = useProject();

  return (
    <Modal isOpen={isOpen} setIsOpen={setIsOpen}>
      <div className="bg-popover p-6 rounded-box flex flex-col gap-y-4 items-start">
        <p className="text-base-content text-xl font-semibold">
          Change Project Visibilty
        </p>
        <p>
          {isPublic
            ? "If the project is private, only project contributers can read and add prompts."
            : "If the project is public, anyone can view your prompts and create variants."}
        </p>
        <div className="w-full flex flex-row justify-end items-center gap-x-2 mt-2">
          <button
            className="btn btn-sm btn-ghost normal-case"
            onClick={() => setIsOpen(false)}
          >
            Cancel
          </button>
          <button
            className="btn btn-sm bg-red-500 normal-case text-base-content hover:bg-red-500/80"
            onClick={async () => {
              await updateIsPublicMutation.mutateAsync({ isPublic: isPublic });
              setIsOpen(false);
            }}
          >
            <p>Confirm</p>
          </button>
        </div>
      </div>
    </Modal>
  );
}
