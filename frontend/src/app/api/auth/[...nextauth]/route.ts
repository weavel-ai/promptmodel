import NextAuth from "next-auth";
import { NextRequest, NextResponse } from "next/server";
import { authOptions } from "@/apis/auth";
import { NextApiRequest, NextApiResponse } from "next";

// This function will handle all types of HTTP requests
async function handler(req: NextRequest, res: NextResponse) {
  // Convert NextRequest to compatible format if necessary
  const adaptedReq = req as any as NextApiRequest;
  const adaptedRes = res as any as NextApiResponse;

  return NextAuth(adaptedReq, adaptedRes, authOptions);
}

// Export the handler as named exports for each HTTP method you want to support
export const GET = handler;
export const POST = handler;
// Add other methods if needed (put, delete, etc.), all pointing to the same handler
