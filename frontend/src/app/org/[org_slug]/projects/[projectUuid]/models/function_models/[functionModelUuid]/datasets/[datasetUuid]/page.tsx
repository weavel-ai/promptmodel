"use client";

import { useFunctionModelDatasets } from "@/hooks/useFunctionModelDatasets";
import Link from "next/link";
import { useParams, usePathname } from "next/navigation";
import { useMemo } from "react";

export default function Page() {
  const params = useParams();
  const pathname = usePathname();
  const { findDataset } = useFunctionModelDatasets();

  const dataset = useMemo(
    () => findDataset(params?.datasetUuid as string),
    [params?.datasetUuid, findDataset]
  );

  return (
    <div className="overflow-y-auto w-full h-full">
      <div className="flex flex-col gap-y-2 justify-start items-start w-full py-16 pl-24 pr-6">
        <div className="breadcrumbs">
          <ul>
            <li>
              <Link
                href={`${pathname?.slice(0, pathname?.indexOf("/datasets"))}`}
              >
                Datasets
              </Link>
            </li>
            <li>
              <a>{dataset?.name}</a>
            </li>
          </ul>
        </div>
        <p className="text-muted-content">{dataset?.description}</p>
      </div>
    </div>
  );
}
