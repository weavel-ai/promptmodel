"use client";

import { useProject } from "@/hooks/useProject";
import { Prism as SyntaxHighlighter } from "react-syntax-highlighter";
import { nightOwl } from "react-syntax-highlighter/dist/esm/styles/prism";
import { Clipboard } from "@phosphor-icons/react";
import { toast } from "react-toastify";

export default function Page() {
  const { projectData } = useProject();

  const handleClickCopy = () => {
    navigator.clipboard.writeText(`API_KEY=${projectData?.api_key}`);
    toast.success("Copied to clipboard.", {
      autoClose: 2000,
    });
  };

  return (
    <div className="w-full h-full pl-20">
      <div className="w-full h-full flex flex-col gap-y-6 pt-20 pl-8 pb-8">
        {/* Header */}
        <div className="flex flex-row justify-start items-center">
          <p className="text-2xl font-bold text-base-content">
            Project Settings
          </p>
        </div>
        <div className="w-full h-full pe-16 flex flex-col gap-y-1">
          <p className="text-lg font-semibold">API Key</p>
          <div className="relative">
            <SyntaxHighlighter language="javascript" style={nightOwl}>
              {`PROMPTMODEL_API_KEY=${projectData?.api_key}`}
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
      </div>
    </div>
  );
}
