export function cloneDeep(obj: any): any {
  return JSON.parse(JSON.stringify(obj));
}

export function parseMultipleJson(response: string): Record<string, any>[] {
  try {
    const singleJsonObject = JSON.parse(response);
    return [singleJsonObject];
  } catch (error) {
    // Continue with existing logic if parsing as a single JSON object fails
  }
  const jsonObjects: Record<string, any>[] = [];
  let braceCount = 0;
  let startIndex: number | null = null;

  for (let i = 0; i < response.length; i++) {
    const char = response[i];

    if (char === "{") {
      if (braceCount === 0) {
        startIndex = i;
      }
      braceCount++;
    } else if (char === "}") {
      braceCount--;

      if (braceCount === 0 && startIndex !== null) {
        const jsonString = response.substring(startIndex, i + 1);
        try {
          const jsonObject = JSON.parse(jsonString);
          jsonObjects.push(jsonObject);
        } catch (error) {
          // Skip the current substring if JSON parsing fails
        }
        startIndex = null;
      }
    }
  }
  return jsonObjects;
}

export function parsePrompt(
  prompt: string
): { text: string; className: string }[] {
  const inputPattern = /{([^}]+)}/g;
  const outputPattern = /\[\[(.*?) start\]\](.*?)\[\[\1 end\]\]/gs;

  let segments = [];

  let match;
  let lastIndex = 0;

  while ((match = outputPattern.exec(prompt)) !== null) {
    if (match.index !== lastIndex) {
      segments.push({
        text: prompt.slice(lastIndex, match.index),
        className: "normal-text",
      });
    }

    segments.push({ text: match[0], className: "highlighted-output" });
    lastIndex = outputPattern.lastIndex;
  }

  if (lastIndex !== prompt.length) {
    segments.push({ text: prompt.slice(lastIndex), className: "normal-text" });
  }

  return segments.flatMap((segment) => {
    if (segment.className === "highlighted-output") {
      const innerSegments = [];
      let innerText = segment.text;
      let innerMatch;
      let innerLastIndex = 0;

      while ((innerMatch = inputPattern.exec(innerText)) !== null) {
        if (innerMatch.index !== innerLastIndex) {
          innerSegments.push({
            text: innerText.slice(innerLastIndex, innerMatch.index),
            className: "highlighted-output",
          });
        }

        innerSegments.push({ text: innerMatch[1], className: "highlighted" });
        innerLastIndex = inputPattern.lastIndex;
      }

      if (innerLastIndex !== innerText.length) {
        innerSegments.push({
          text: innerText.slice(innerLastIndex),
          className: "highlighted-output",
        });
      }

      return innerSegments;
    }

    return segment;
  });
}
