import { fetchBatchRunLogs } from "@/apis/run_logs/fetchBatchRunLogs";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";

const ROWS_PER_PAGE = 30;

export const useBatchRunLogs = (batchRunUuid: string) => {
  const [page, setPage] = useState(1);

  const batchRunLogListQuery = useQuery({
    queryKey: ["batchRunLogList", { batchRunUuid: batchRunUuid }],
    queryFn: async () =>
      await fetchBatchRunLogs({
        batch_run_uuid: batchRunUuid,
        page: page,
        rows_per_page: ROWS_PER_PAGE,
      }),
    enabled: !!batchRunUuid,
  });

  return {
    batchRunLogListQuery,
    page,
    setPage,
  };
};
