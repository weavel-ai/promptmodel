"use client";

import { redirect } from "next/navigation";
import { useEffect } from "react";

export function Redirect({ to }: { to: string }) {
  useEffect(() => {
    redirect(to);
  }, [to]);

  return <></>;
}
