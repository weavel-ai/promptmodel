import Image from "next/image";

export const PromptmodelLogo = () => (
  <div className="w-10 h-10 rounded-full bg-base-300 p-1 flex justify-center items-center group">
    <Image
      alt="logo"
      src="/promptmodel-favicon.png"
      width={32}
      height={32}
      className="transition-transform hover:scale-110 duration-300 ease-in-out"
    />
  </div>
);
