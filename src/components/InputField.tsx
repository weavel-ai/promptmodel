import classNames from "classnames";

interface InputFieldProps {
  label?: string;
  value: string;
  onChange: (value: string) => void;
  className?: string;
}

export const InputField = (props: InputFieldProps) => {
  return (
    <div className="flex flex-col gap-y-3 justify-center items-start">
      <p className="text-base-content text-sm font-semibold">{props.label}</p>
      <input
        className={classNames("input input-bordered", props.className)}
        value={props.value}
        onChange={(e) => props.onChange(e.target.value)}
      />
    </div>
  );
};
