import { NextRequest, NextResponse } from "next/server";
import { NextAuthMiddlewareOptions, withAuth } from "next-auth/middleware";
import { env } from "./constants";

function defaultMiddleware(req: NextRequest) {
  return NextResponse.next();
}

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
const middleware = !env.SELF_HOSTED
  ? withAuth(selfHostedMiddleware, authMiddlewareConfig)
  : defaultMiddleware;

export default middleware;

// Do not use next-auth middleware on /signin and /signup pages
export const config = {
  matcher: ["/((?!signin|signup).*)"],
};
