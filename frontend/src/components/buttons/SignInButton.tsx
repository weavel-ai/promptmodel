import { UserButton } from "@clerk/nextjs";
import { useAuth } from "@/hooks/auth/useAuth";

import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { AnimatedUnderline } from "../AnimatedUnderline";
import { env } from "@/constants";
import { useEffect, useRef, useState } from "react";
import classNames from "classnames";
import { motion } from "framer-motion";
import { ModalPortal } from "../ModalPortal";
import { useWindowWidth } from "@react-hook/window-size";
import { SignOut } from "@phosphor-icons/react";
import { signOut } from "next-auth/react";

export function SignInButton() {
  const { isSignedIn } = useAuth();
  const params = useSearchParams();
  const pathname = usePathname();
  if (pathname.includes("signin") || pathname.includes("signup")) {
    return <></>;
  }

  if (env.SELF_HOSTED) {
    return <SelfHostedSignInButton />;
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

function SelfHostedSignInButton() {
  const { isSignedIn, user } = useAuth();
  const windowWidth = useWindowWidth();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalPosition, setModalPosition] = useState({
    top: 0,
    right: 0,
  });
  const buttonRef = useRef(null);
  const modalRef = useRef(null);
  const isOpenRef = useRef(null);

  useEffect(() => {
    isOpenRef.current = isModalOpen; // Always keep it updated with the latest state
  }, [isModalOpen]);

  // Use useEffect to add an event listener to the document
  useEffect(() => {
    function handleOutsideClick(event) {
      if (
        modalRef.current &&
        !modalRef.current.contains(event.target) &&
        !buttonRef.current.contains(event.target)
      ) {
        if (isOpenRef.current) {
          setIsModalOpen(false);
          console.log("outside click");
        }
      }
    }
    // Attach the click event listener
    document.addEventListener("mousedown", handleOutsideClick);
    // Clean up the listener when the component is unmounted
    return () => {
      document.removeEventListener("mousedown", handleOutsideClick);
    };
  }, []);

  function handleClickOpen() {
    if (!isModalOpen) {
      const buttonRect = buttonRef.current?.getBoundingClientRect();
      setModalPosition({
        top: buttonRect.top + buttonRect.height,
        right: windowWidth - buttonRect.right,
      });
    }
    setIsModalOpen(!isModalOpen);
  }

  function handleClickSignOut() {
    setIsModalOpen(false);
    signOut();
  }

  return isSignedIn ? (
    <div className="relative shrink-0">
      <button
        ref={buttonRef}
        className={classNames("w-fit p-2 rounded-full bg-base-300 shrink-0")}
        onClick={handleClickOpen}
      >
        {user?.firstName && user?.lastName
          ? user?.firstName?.charAt(0) + user?.lastName?.charAt(0)
          : user?.name?.slice(0, 2)}
      </button>
      {isModalOpen && (
        <ModalPortal>
          <motion.div
            ref={modalRef}
            initial={{
              opacity: 0,
              height: 0,
              top: modalPosition?.top - 30,
              right: modalPosition?.right,
            }}
            animate={{
              opacity: isModalOpen ? 1 : 0,
              height: isModalOpen ? "auto" : 0,
              top: modalPosition?.top + 8,
              right: modalPosition?.right,
            }}
            className={classNames(
              `fixed z-[999999]`,
              "mt-2 w-[240px] bg-base-200 pt-6 rounded-xl",
              "shadow-lg shadow-base-300/30",
              "flex flex-col gap-y-2 items-start justify-start"
            )}
          >
            <p className="text-sm font-semibold mx-6">{user?.name}</p>
            <p className="text-xs mb-4 mx-6">{user?.email}</p>
            <button
              className={classNames(
                "px-6 py-4 flex flex-row justify-start items-center gap-x-6 text-sm",
                "transition-colors hover:bg-base-content/10 w-full rounded-lg"
              )}
              onClick={handleClickSignOut}
            >
              <SignOut size={16} className="text-muted-content" />
              <p>Sign out</p>
            </button>
          </motion.div>
        </ModalPortal>
      )}
    </div>
  ) : (
    <Link
      href="/signup"
      className="btn border-base-content text-base-content rounded-full hover:cursor-pointer btn-outline px-6 !min-h-0 !h-10"
    >
      Sign up
      <AnimatedUnderline />
    </Link>
  );
}
