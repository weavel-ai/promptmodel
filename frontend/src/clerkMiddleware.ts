import { authMiddleware as clerkMiddleware} from "@clerk/nextjs";

export default clerkMiddleware({
  publicRoutes: ["/signin", "/signup"],
});

export const clerkMiddlewareConfig = {
  matcher: ["/((?!.+\\.[\\w]+$|_next).*)", "/", "/(api|trpc)(.*)"],
};
