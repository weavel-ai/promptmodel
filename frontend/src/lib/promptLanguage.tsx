import { Monaco } from "@monaco-editor/react";

export function registerCustomLanguage(monaco: Monaco) {
  // Define the new language
  monaco.languages.register({ id: "promptmodel" });

  monaco.languages.setMonarchTokensProvider("promptmodel", {
    tokenizer: {
      root: [
        [/{{[^}\s]+}}/, "variable"],
        [/\w+(?=\s*type=)/, "output-key"],
        [/\w+(?=\s*\])/, "output-key"],
        // [/\/(\w+)(?=\s*\])/, "output-key"],
        [/\[\[\//, "end-tag-start"],
        [/\[\//, "end-tag-start"],
        [/\<\//, "end-tag-start"],
        [/\[\[/, "start-tag-start"],
        [/\[/, "start-tag-start"],
        [/\</, "start-tag-start"],
        [/type=/, "type-tag"],
        [/\]\]/, "tag-end"],
        [/\]/, "tag-end"],
        [/\>/, "tag-end"],
      ],
    },
  });
}

export function registerCustomTheme(monaco: Monaco) {
  // Define the styling
  monaco.editor.defineTheme("promptmodelTheme", {
    base: "vs-dark",
    inherit: true,
    rules: [
      { token: "variable", fontStyle: "bold", foreground: "5FBFF9" }, // light blue and bold
      { token: "output-key", foreground: "EE82EE" }, // violet
      // { token: "start-tag-start", foreground: "EE82EE" }, // violet
      { token: "start-tag-start", foreground: "808080" }, // gray
      { token: "tag-end", foreground: "808080" }, // gray
      { token: "end-tag-start", foreground: "808080" }, // gray
      { token: "end-tag", foreground: "808080" }, // gray
      { token: "type-tag", foreground: "9bd9fc" }, // light blue
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

export function registerCustomThemeAndLanguage(monaco: Monaco) {
  registerCustomLanguage(monaco);
  registerCustomTheme(monaco);
}
