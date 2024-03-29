import { NextRequest, NextResponse } from "next/server";
import { NextAuthMiddlewareOptions, withAuth } from "next-auth/middleware";
import { ENV } from "./constants";
import clerkMiddleware from "./clerkMiddleware";
import { clerkMiddlewareConfig } from "./clerkMiddleware";

// function defaultMiddleware(req: NextRequest) {
//   return NextResponse.next();
// }

function selfHostedMiddleware(req: NextRequest) {
  return NextResponse.next();
}

const authMiddlewareConfig: NextAuthMiddlewareOptions = {
  pages: {
    signIn: "/signin",
    newUser: "/signup",
  },
};

// Export a middleware function that decides which middleware to use
const middleware = ENV.SELF_HOSTED
  ? withAuth(selfHostedMiddleware, authMiddlewareConfig)
  : clerkMiddleware;

export default middleware;

// Do not use next-auth middleware on /signin and /signup pages
export const config = ENV.SELF_HOSTED
  ? {
    matcher: ["/((?!signin|signup).*)"],
  } : clerkMiddlewareConfig;
