import { DotsSixVertical, Trash } from "@phosphor-icons/react";
import { InputField } from "../InputField";

export interface KeyValueInput {
  id: string;
  key: string;
  value: string;
}

interface KeyValueInputFieldProps {
  input: KeyValueInput;
  setInput: (input: KeyValueInput) => void;
  onDelete: () => void;
  isKeyEditable?: boolean;
}

export function KeyValueInputField({
  input,
  setInput,
  onDelete,
  isKeyEditable = true,
}: KeyValueInputFieldProps) {
  return (
    <div className="flex flex-row gap-x-2 items-start justify-start w-full py-1">
      {isKeyEditable && (
        <div className="mt-6 p-1 hover:bg-base-content/10 rounded-md cursor-pointer drag-handle">
          <DotsSixVertical className="text-base-content" size={20} />
        </div>
      )}
      <InputField
        disabled={!isKeyEditable}
        inputClassName="disabled:cursor-default"
        value={input?.key}
        setValue={(key) => setInput({ ...input, key })}
        placeholder="Key"
        label="Key"
        type="text"
        autoComplete="off"
      />
      <InputField
        textarea
        value={input?.value}
        setValue={(value) => setInput({ ...input, value })}
        placeholder="Value"
        label="Value"
        type="text"
        autoComplete="off"
        className="w-full"
        inputClassName="leading-snug"
      />
      {isKeyEditable && (
        <button
          className="mt-6 p-1 hover:bg-red-500/20 rounded-md cursor-pointer"
          onClick={onDelete}
        >
          <Trash className="text-red-500" size={20} />
        </button>
      )}
    </div>
  );
}
