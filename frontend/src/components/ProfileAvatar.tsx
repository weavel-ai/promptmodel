import Image from "next/image";
import { ReactSVG } from "react-svg";

export function ProfileAvatar({ imageUrl }: { imageUrl?: string }) {
  return imageUrl ? (
    <Image
      src={imageUrl}
      alt="Author profile"
      width={32}
      height={32}
      className="rounded-full"
    />
  ) : (
    <div className="w-8 h-8 rounded-full bg-gray-500 p-1">
      <ReactSVG src="/avatar.svg" />
    </div>
  );
}
