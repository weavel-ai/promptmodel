import classNames from "classnames";
import { useMemo } from "react";

interface InputFieldProps {
  label?: string;
  value: string;
  setValue: (value: string) => void;
  className?: string;
  inputClassName?: string;
  textarea?: boolean;
  validator?: (value: string) => string | null;
}

export const InputField = (
  props: InputFieldProps & React.HTMLProps<HTMLInputElement>
) => {
  const validatorError = useMemo(() => {
    if (!props.validator) return null;
    return props.validator(props.value);
  }, [props]);

  return (
    <div
      className={classNames(
        "flex flex-col gap-y-2 justify-center items-start",
        props.className
      )}
    >
      <p className="label-text text-sm font-semibold mb-1">{props.label}</p>
      {props.textarea ? (
        <div className="bg-input border-2 border-muted rounded-lg w-full px-4 py-2 resize-y">
          <textarea
            className={classNames(
              "bg-transparent outline-none hover:outline-none focus:outline-none",
              "w-full text-sm",
              props.inputClassName,
              validatorError && "input-error"
            )}
            value={props.value}
            onChange={(e) => props.setValue(e.target.value)}
          />
        </div>
      ) : (
        <input
          {...props}
          className={classNames(
            "bg-base-100 outline-none hover:outline-none focus:outline-none",
            "input input-bordered w-full",
            props.inputClassName,
            validatorError && "input-error"
          )}
          value={props.value}
          onChange={(e) => props.setValue(e.target.value)}
        />
      )}
      {validatorError && (
        <p className="text-sm text-destructive font-medium ml-1">
          {validatorError}
        </p>
      )}
    </div>
  );
};
