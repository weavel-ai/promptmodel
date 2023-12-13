"use client";

import { SignIn } from "@clerk/nextjs";
import { useAuth } from "@/hooks/auth/useAuth";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect } from "react";
import { PRODUCT_NAME, env } from "@/constants";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { signIn } from "next-auth/react";
import { z } from "zod";
import { PromptmodelLogo } from "@/components/PromptmodelLogo";
import Link from "next/link";
import { toast } from "react-toastify";

let validationSchema = z
  .object({
    email: z.string().email(),
    password: z.string().min(6).max(32),
  })
  .required();

export default function Page() {
  const params = useSearchParams();
  const router = useRouter();
  const { isSignedIn } = useAuth();

  useEffect(() => {
    if (isSignedIn) {
      if (env.SELF_HOSTED) {
        router.push("/org/redirect");
      } else {
        router.push("/signin/redirect");
      }
    }
  }, [isSignedIn, router]);

  if (env.SELF_HOSTED) {
    return <SelfHostedSignIn />;
  }

  return (
    <div className="w-screen h-screen flex justify-center items-center bg-base-100">
      <SignIn
        signUpUrl={`/signup?${params.toString()}`}
        redirectUrl={`/signin/redirect?${params.toString()}`}
      />
    </div>
  );
}

function SelfHostedSignIn() {
  const searchParams = useSearchParams();
  const {
    setError,
    reset,
    register,
    handleSubmit,
    formState: { errors },
  } = useForm({
    resolver: zodResolver(validationSchema),
  });

  const handleFormSubmit = async (data: {
    email: string;
    password: string;
  }) => {
    const toastId = toast.loading("Signing in...");
    await signIn("credentials", {
      email: data.email,
      password: data.password,
      // redirect: false,
      redirect: true,
    }).then((res) => {
      if (res?.error) {
        setError("email", { message: "Something went wrong.", type: "error" });
        toast.update(toastId, {
          render: "Something went wrong.",
          type: "error",
          isLoading: false,
          autoClose: 2000,
        });
      } else {
        toast.update(toastId, {
          render: "Sign in successful",
          type: "success",
          isLoading: false,
          autoClose: 2000,
        });
      }
    });
  };

  useEffect(() => {
    const error = searchParams?.get("error");
    if (!!error) {
      setError("email", { message: error, type: "error" });
    }
  }, [searchParams, setError]);

  return (
    <div className="w-screen h-screen flex justify-center items-center bg-base-100">
      <div className="w-[400px] h-fit bg-base-200 shadow-xl p-8 rounded-2xl flex flex-col justify-center items-start">
        <PromptmodelLogo />
        <p className="text-xl font-semibold mt-10 mb-1">Sign in</p>
        <p className="mb-8">to continue to Promptmodel</p>
        <form
          className="flex flex-col gap-y-4 mb-4 w-full"
          onSubmit={handleSubmit(handleFormSubmit)}
          autoComplete="off"
        >
          <div>
            <label
              htmlFor="email"
              className="block mb-1 text-sm font-medium text-base-content"
            >
              Email address
            </label>
            <input
              type="email"
              id="email"
              {...register("email")}
              className="w-full input input-bordered h-10 bg-input text-base-content !outline-none"
            />
            {errors["email"] ? (
              <div className="text-sm text-red-500">
                {errors["email"].message.toString()}
              </div>
            ) : null}
          </div>
          <div>
            <label
              htmlFor="password"
              className="block mb-1 text-sm font-medium text-base-content"
            >
              Password
            </label>
            <input
              type="password"
              id="password"
              {...register("password")}
              className="w-full input input-bordered h-10 bg-input text-base-content !outline-none"
            />
            {errors["password"] ? (
              <div className="text-sm text-red-500">
                {errors["password"].message.toString()}
              </div>
            ) : null}
          </div>
          <button
            type="submit"
            className="btn btn-primary btn-sm h-10 text-xs w-full mt-2 mb-1"
          >
            Continue
          </button>
        </form>
        <p className="my-2 text-sm">
          No account?{" "}
          <Link href="/signup" className="link link-primary link-hover">
            Sign up
          </Link>
        </p>
      </div>
    </div>
  );
}
