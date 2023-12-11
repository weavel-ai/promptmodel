"use client";

import { usePathname, useRouter } from "next/navigation";
import { useEffect } from "react";

export default function Page() {
  const router = useRouter();
  const pathname = usePathname();
  useEffect(() => {
    router.push(pathname + "/overview");
  }, [pathname, router]);

  return <></>;
}
