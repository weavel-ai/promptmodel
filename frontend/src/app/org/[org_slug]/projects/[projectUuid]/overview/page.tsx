"use client";

import { useChangeLog } from "@/hooks/useChangelog";
import { useProject } from "@/hooks/useProject";
import dayjs from "dayjs";
import relativeTime from "dayjs/plugin/relativeTime";
import { useParams } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { useRunLogCount } from "@/hooks/useRunLogCount";
import { useChatLogCount } from "@/hooks/useChatMessagesCount";
import { DateRange } from "react-day-picker";
import { subDays } from "date-fns";
import { DatePickerWithRange } from "@/components/ui/DatePickerWithRange";
import { useProjectDailyRunLogMetrics } from "@/hooks/analytics";
import { CustomAreaChart } from "@/components/charts/CustomAreaChart";
import { Button } from "@/components/ui/button";
import { SelectTab } from "@/components/SelectTab";
import { SupabaseClient, createClient } from "@supabase/supabase-js";
import { env } from "@/constants";
import { Badge } from "@/components/ui/badge";
dayjs.extend(relativeTime);

export default function Page() {
  const params = useParams();
  const { projectData } = useProject();
  const { changeLogListData } = useChangeLog();
  const { runLogCountData } = useRunLogCount();
  const { chatMessagesCountData: chatLogCountData } = useChatLogCount();
  enum Tab {
    Deployment = "Deployment",
    Development = "Development",
    Public = "Public",
    Private = "Private",
  }
  const ANALYSISTABS = [Tab.Deployment, Tab.Development];
  const [analysisTab, setAnalysisTab] = useState(Tab.Deployment);
  const ISPUBLICTABS = [Tab.Public, Tab.Private];
  const [isPublicTab, setIsPublicTab] = useState(
    projectData?.is_public ? Tab.Public : Tab.Private
  );
  const [dateRange, setDateRange] = useState<DateRange | undefined>({
    from: subDays(Date.now(), 7),
    to: new Date(),
  });
  const { projectDailyRunLogMetrics } = useProjectDailyRunLogMetrics(
    dayjs(dateRange?.from)?.toISOString(),
    dayjs(dateRange?.to)?.toISOString()
  );

  useEffect(() => {
    console.log(projectDailyRunLogMetrics);
  }, [projectDailyRunLogMetrics]);

  const displayedProjectDailyRunLogMetrics = projectDailyRunLogMetrics?.filter(
    (data) => {
      return data.run_from_deployment === (analysisTab == Tab.Deployment);
    }
  );

  const totalCost = displayedProjectDailyRunLogMetrics?.reduce(
    (acc, curr) => acc + curr.total_cost,
    0
  );

  const totalLatency = displayedProjectDailyRunLogMetrics?.reduce(
    (acc, curr) => acc + curr.avg_latency * curr.total_runs,
    0
  );

  const totalRuns = displayedProjectDailyRunLogMetrics?.reduce(
    (acc, curr) => acc + curr.total_runs,
    0
  );

  const totalTokens = displayedProjectDailyRunLogMetrics?.reduce(
    (acc, curr) => acc + curr.total_token_usage,
    0
  );

  const avgLatency = totalRuns != 0 ? totalLatency / totalRuns : 0;

  function formatDate(inputDate: Date): string {
    const year = inputDate.getFullYear();
    const month = (inputDate.getMonth() + 1).toString().padStart(2, "0");
    const day = inputDate.getDate().toString().padStart(2, "0");

    return `${year}-${month}-${day}`;
  }

  let date = new Date(dateRange?.from);
  const existingDates = displayedProjectDailyRunLogMetrics?.map(
    (metric) => metric.day
  );

  while (date <= dateRange?.to) {
    if (!existingDates?.includes(formatDate(date))) {
      displayedProjectDailyRunLogMetrics?.push({
        day: formatDate(date),
        avg_latency: 0,
        total_cost: 0,
        total_runs: 0,
        total_token_usage: 0,
        run_from_deployment: true,
      });
    }
    date.setDate(date.getDate() + 1);
  }

  displayedProjectDailyRunLogMetrics?.sort((a, b) => {
    if (a.day < b.day) return -1;
    if (a.day > b.day) return 1;
    return 0;
  });

  async function setIsPublic(isPublic: boolean) {
    const supabase: SupabaseClient = createClient(
      env.SUPABASE_URL,
      env.SUPABASE_KEY
    );
    await supabase
      .from("project")
      .update({ is_public: isPublic })
      .match({ uuid: projectData.uuid });
  }

  return (
    <div className="w-full h-full pl-28 pt-20 pb-8">
      {/* Header */}
      <div className="w-full h-full flex flex-col gap-y-8 overflow-auto pe-4">
        <div className="w-full flex flex-row gap-x-6">
          {/* Project Overview */}
          <div className="w-1/2 h-fit">
            <div className="w-full h-fit flex flex-row gap-x-6 pb-4 content-center">
              <p className="text-2xl font-bold text-base-content">
                Project Overview
              </p>
              <div className="flex flex-col justify-center">
                <Badge
                  className="text-xs"
                  variant={projectData?.is_public ? "secondary" : "outline"}
                >
                  {projectData?.is_public ? "Public" : "Private"}
                </Badge>
                {/* <p className="text-xs px-2 border-base-content/70 bg-transparent border-2 rounded-full text-base-content">
                  {projectData?.is_public ? "Public" : "Private"}
                </p> */}
              </div>
            </div>
            <div className="bg-base-200 rounded-box p-4 w-full h-fit flex flex-col gap-y-2">
              <p className="text-xl font-bold">{projectData?.name}</p>
              <p className="text-sm text-neutral-content">
                V{projectData?.version}
              </p>
              <p className="text-sm text-neutral-content">
                Created at {dayjs(projectData?.created_at).format("YYYY-MM-DD")}
              </p>
              <p className="text-sm text-neutral-content">
                Total runs:{" "}
                <b>{runLogCountData?.count + chatLogCountData?.count}</b>
              </p>
              {/* TODO */}
            </div>
          </div>
          {/* Changelog */}
          <div className="w-1/2 h-fit flex flex-col">
            <p className="text-xl font-bold pb-4">Changelog</p>
            {/* TODO */}
            <div className="w-full h-fit max-h-[20vh] overflow-auto">
              <div className="w-full h-full flex flex-col gap-y-2">
                {changeLogListData?.length == 0 && (
                  <p className="text-muted-content">Changelog is empty.</p>
                )}
                {changeLogListData?.map((changeLog, idx) => {
                  return (
                    <div
                      key={idx}
                      className="flex flex-row bg-base-200 w-full p-1 px-4 rounded place-content-between"
                    >
                      <div className="place-self-start text-base-content flex flex-col">
                        <div className="flex flex-col gap-y-2">
                          <ChangeLogComponent changeLog={changeLog} />
                        </div>
                      </div>
                      <p className="text-gray-400 text-sm">
                        {dayjs(changeLog.created_at).fromNow()}
                      </p>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
        {/* Analytics */}
        <div className="w-full h-fit flex flex-col">
          <div className="w-full h-fit flex flex-row justify-between">
            <div className="w-full h-fit flex flex-row gap-x-8">
              <p className="text-2xl font-bold pb-4">Analytics</p>
              <SelectTab
                tabs={ANALYSISTABS}
                selectedTab={analysisTab}
                onSelect={(newTab) => setAnalysisTab(newTab as Tab)}
              />
            </div>

            <div>
              <DatePickerWithRange
                dateRange={dateRange}
                setDateRange={setDateRange}
              />
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-2 2xl:grid-cols-3 3xl:grid-cols-4 gap-4 w-full">
            <CustomAreaChart
              data={displayedProjectDailyRunLogMetrics}
              dataKey="total_cost"
              xAxisDataKey="day"
              title="Total Cost"
              mainData={`$${totalCost?.toFixed(6)}`}
            />
            <CustomAreaChart
              data={displayedProjectDailyRunLogMetrics}
              dataKey="avg_latency"
              xAxisDataKey="day"
              title="Average Latency"
              mainData={`${avgLatency?.toFixed(2)}s`}
            />
            <CustomAreaChart
              data={displayedProjectDailyRunLogMetrics}
              dataKey="total_runs"
              xAxisDataKey="day"
              title="Total Runs"
              mainData={totalRuns}
            />
            <CustomAreaChart
              data={displayedProjectDailyRunLogMetrics}
              dataKey="total_token_usage"
              xAxisDataKey="day"
              title="Token usage"
              mainData={totalTokens}
            />
          </div>
        </div>
      </div>
    </div>
  );
}

const ChangeLogComponent = ({ changeLog }) => {
  return (
    <div className="flex flex-col gap-y-2">
      {changeLog.logs?.map((log, idx) => {
        return (
          <div key={idx} className="flex flex-col px-2 py-1 rounded gap-y-2">
            <div className="flex flex-row justify-start gap-x-6">
              <p className="text-sm font-semibold">{log.action}</p>
              <p className="text-sm">{log.subject}</p>
            </div>
          </div>
        );
      })}
    </div>
  );
};
