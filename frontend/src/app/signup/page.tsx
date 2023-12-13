"use client";

import { SignUp } from "@clerk/nextjs";
import { useRouter, useSearchParams } from "next/navigation";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { env } from "@/constants";
import { PromptmodelLogo } from "@/components/PromptmodelLogo";
import Link from "next/link";
import { toast } from "react-toastify";
import { createUser } from "@/apis/users";
import { CreateUserRequest } from "@/types/User";
import { useSession } from "next-auth/react";

let validationSchema = z
  .object({
    first_name: z.string().min(2).max(32),
    last_name: z.string().min(2).max(32),
    email: z.string().email(),
    password: z.string().min(4).max(32),
  })
  .required();

export default function Page() {
  const params = useSearchParams();

  if (env.SELF_HOSTED) {
    return <SelfHostedSignUp />;
  }

  return (
    <div className="w-screen h-screen flex justify-center items-center bg-base-100">
      <SignUp
        signInUrl={`/signin?${params.toString()}`}
        redirectUrl={`/signin/redirect?${params.toString()}`}
      />
    </div>
  );
}

function SelfHostedSignUp() {
  const router = useRouter();
  const {
    setError,
    reset,
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<CreateUserRequest>({
    resolver: zodResolver(validationSchema),
  });
  const { data: session, status, update } = useSession();

  async function handleFormSubmit(data: CreateUserRequest) {
    const toastId = toast.loading("Signing up...");
    try {
      const resData = await createUser(data);
      console.log(resData)
      toast.update(toastId, {
        render: "Sign up successful",
        type: "success",
        isLoading: false,
        autoClose: 2000,
      });
      update({
        ...session,
        user: {
          email: resData.email,
          name: resData.first_name + " " + resData.last_name,
        },
      });
      router.push("/org/redirect")
      reset();
    } catch (error: any) {
      toast.update(toastId, {
        render: "Sign up failed",
        type: "error",
        isLoading: false,
        autoClose: 2000,
      });
      setError("email", {
        message:
          error?.response?.data?.detail ??
          error?.message ??
          "User Registration Failed",
        type: "error",
      });
    }
  }

  return (
    <div className="w-screen h-screen flex justify-center items-center bg-base-100">
      <div className="w-[400px] h-fit bg-base-200 shadow-xl p-8 rounded-2xl flex flex-col justify-center items-start">
        <PromptmodelLogo />
        <p className="text-xl font-semibold mt-10 mb-1">Create your account</p>
        <p className="mb-8">to continue to Promptmodel</p>
        <form
          className="flex flex-col gap-y-4 mb-4 w-full"
          onSubmit={handleSubmit(handleFormSubmit)}
          autoComplete="off"
        >
          <div className="flex flex-row items-start justify-between w-full gap-x-4">
            <div>
              <label
                htmlFor="first_name"
                className="block mb-2 text-sm font-medium text-base-content"
              >
                First name
              </label>
              <input
                type="text"
                id="first_name"
                {...register("first_name")}
                className="w-full input input-bordered h-10 bg-input text-base-content !outline-none"
              />
              {errors["first_name"] ? (
                <div className="text-sm text-red-500">
                  {errors["first_name"].message.toString()}
                </div>
              ) : null}
            </div>
            <div>
              <label
                htmlFor="last_name"
                className="block mb-2 text-sm font-medium text-base-content"
              >
                Last name
              </label>
              <input
                type="text"
                id="last_name"
                {...register("last_name")}
                className="w-full input input-bordered h-10 bg-input text-base-content !outline-none"
              />
              {errors["last_name"] ? (
                <div className="text-sm text-red-500">
                  {errors["last_name"].message.toString()}
                </div>
              ) : null}
            </div>
          </div>
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
          Have an account?{" "}
          <Link href="/signin" className="link link-primary link-hover">
            Sign in
          </Link>
        </p>
      </div>
    </div>
  );
}
