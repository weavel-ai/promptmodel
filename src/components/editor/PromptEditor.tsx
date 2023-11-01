import React, { ReactNode } from "react";
import Editor, {
  DiffEditor,
  DiffEditorProps,
  EditorProps,
} from "@monaco-editor/react";
import { registerCustomTheme } from "@/lib/promptLanguage";

export const PromptEditor: React.FC<EditorProps> = (props: EditorProps) => {
  return (
    <Editor
      {...props}
      defaultLanguage="promptmodel"
      language="promptmodel"
      theme="promptmodelTheme"
      beforeMount={registerCustomTheme}
      options={{
        ...props.options,
        scrollBeyondLastLine: false,
        wordWrap: "on",
        scrollbar: {
          alwaysConsumeMouseWheel: false,
        },
        minimap: {
          enabled: false,
        },
      }}
    />
  ) as ReactNode;
};

export const PromptDiffEditor: React.FC<DiffEditorProps> = (
  props: DiffEditorProps
) => {
  return (
    <DiffEditor
      {...props}
      language="promptmodel"
      theme="promptmodelTheme"
      options={{
        ...props.options,
        scrollBeyondLastLine: false,
        wordWrap: "on",
        scrollbar: {
          alwaysConsumeMouseWheel: false,
        },
        minimap: {
          enabled: false,
        },
      }}
      beforeMount={registerCustomTheme}
    />
  ) as ReactNode;
};
