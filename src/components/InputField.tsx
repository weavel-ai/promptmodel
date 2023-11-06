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
  }, [props.value]);

  return (
    <div
      className={classNames(
        "flex flex-col gap-y-2 justify-center items-start",
        props.className
      )}
    >
      <p className="label-text text-sm font-semibold mb-1">{props.label}</p>
      {props.textarea ? (
        <textarea
          className={classNames(
            "bg-base-100 outline-none hover:outline-none focus:outline-none",
            "textarea textarea-bordered",
            props.inputClassName,
            validatorError && "input-error"
          )}
          value={props.value}
          onChange={(e) => props.setValue(e.target.value)}
        />
      ) : (
        <input
          {...props}
          className={classNames(
            "bg-base-100 outline-none hover:outline-none focus:outline-none",
            "input input-bordered",
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
