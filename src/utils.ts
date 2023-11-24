export function firstLetterToUppercase(str: string): string {
  return str.charAt(0).toUpperCase() + str.slice(1);
}

export function cloneDeep(obj: any): any {
  return JSON.parse(JSON.stringify(obj));
}

export function arePrimitiveListsEqual(list1, list2) {
  if (list1.length !== list2.length) {
    return false;
  }

  const sortedList1 = [...list1].sort();
  const sortedList2 = [...list2].sort();

  return sortedList1.every((value, index) => value === sortedList2[index]);
}

// Function to escape special characters in a string
export function escapeCSV(str: string | null) {
  if (!str) return null;
  if (typeof str !== "string") {
    str = JSON.stringify(str);
  }
  // Escape quotes and newline characters
  return `"${str.replace(/"/g, '""').replace(/\n/g, "\\n")}"`;
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

export function checkIfValidUUID(str: string): boolean {
  // Regular expression to check if string is a valid UUID
  const regexExp =
    /^[0-9a-fA-F]{8}\b-[0-9a-fA-F]{4}\b-[0-9a-fA-F]{4}\b-[0-9a-fA-F]{4}\b-[0-9a-fA-F]{12}$/gi;
  return regexExp.test(str);
}
