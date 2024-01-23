import Image from "next/image";

export const PromptmodelLogo = ({ size = 40 }: { size?: number }) => (
  <div
    className="rounded-full bg-base-300 p-1 flex justify-center items-center group"
    style={{
      width: size,
      height: size,
    }}
  >
    <Image
      alt="logo"
      draggable="false"
      src="/promptmodel-favicon.png"
      width={size}
      height={size}
      className="transition-transform hover:scale-110 duration-300 ease-in-out"
    />
  </div>
);
