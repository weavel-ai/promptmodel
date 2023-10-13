import { UserButton, useAuth } from "@clerk/nextjs";
import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { AnimatedUnderline } from "../AnimatedUnderline";

export function SignInButton() {
  const { isSignedIn } = useAuth();
  const params = useSearchParams();
  const pathname = usePathname();
  if (pathname.includes("signin") || pathname.includes("signup")) {
    return <></>;
  }
  return isSignedIn ? (
    <div className="flex flex-row items-center gap-x-5">
      <UserButton afterSignOutUrl="/" />
    </div>
  ) : (
    <Link
      href={`/signup?${params.toString()}`}
      className="btn border-base-content text-base-content rounded-full hover:cursor-pointer btn-outline px-6 !min-h-0 !h-10"
    >
      Sign up
      <AnimatedUnderline />
    </Link>
  );
}
