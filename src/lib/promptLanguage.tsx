import { Monaco } from "@monaco-editor/react";

export function registerCustomTheme(monaco: Monaco) {
  // Define the new language
  monaco.languages.register({ id: "promptmodel" });

  monaco.languages.setMonarchTokensProvider("promptmodel", {
    tokenizer: {
      root: [
        [/{[^}\s]+}/, "variable"],
        [/\[\[\//, "end-tag-start"],
        [/\[\//, "end-tag-start"],
        [/\<\//, "end-tag-start"],
        [/\[\[/, "start-tag-start"],
        [/\[/, "start-tag-start"],
        [/\</, "start-tag-start"],
        [/(?<=\[\[)(.*?)(?=type=)/, "output-key"],
        [/(?<=\[\[\/)(.*?)(?=\])/, "output-key"],
        [/\]\]/, "tag-end"],
        [/\]/, "tag-end"],
        [/\>/, "tag-end"],
        [/type=\<([^>]+)\>/, "type-content"],
      ],
    },
  });

  // Define the styling
  monaco.editor.defineTheme("promptmodelTheme", {
    base: "vs-dark",
    inherit: true,
    rules: [
      { token: "variable", fontStyle: "bold", foreground: "5FBFF9" }, // light blue and bold
      { token: "output-key", fontStyle: "bold", foreground: "5FBFF9" }, // light blue and bold
      { token: "start-tag-start", foreground: "EE82EE" }, // violet
      { token: "tag-end", foreground: "EE82EE" }, // violet
      { token: "end-tag-start", foreground: "EE82EE" }, // violet
      { token: "end-tag", foreground: "EE82EE" }, // violet
      { token: "type-content", foreground: "FFAD05" }, // vanilla
    ],
    colors: {
      "editor.foreground": "#d6deeb",
      "editor.background": "#011627",
      "editor.selectionBackground": "#5f7e97",
      "editor.lineHighlightBackground": "#010E17",
      "editorCursor.foreground": "#80a4c2",
      "editorWhitespace.foreground": "#2e2040",
      "editorIndentGuide.background": "#5e81ce52",
      "editor.selectionHighlightBorder": "#122d42",
    },
  });
}
