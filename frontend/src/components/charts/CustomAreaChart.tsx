import classNames from "classnames";
import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

export const CustomAreaChart = ({
  data,
  dataKey,
  title,
  mainData,
  xAxisDataKey,
  className,
}: {
  data: any[];
  dataKey: string;
  title: string;
  mainData: any;
  xAxisDataKey: string;
  className?: string;
}) => {
  return (
    <div
      className={classNames(
        "flex flex-col items-start justify-start w-full h-fit",
        "bg-base-200 p-4 rounded-xl shadow-xl",
        className
      )}
    >
      <p className="text-xl font-bold text-base-content">{title}</p>
      <p className="text-xl font-semibold text-secondary my-2">{mainData}</p>
      <ResponsiveContainer width="100%" className="min-h-[12rem] mt-2">
        <AreaChart
          data={data}
          className="fill-base-content/90 border-base-content -mx-4"
        >
          <defs>
            <linearGradient id="colorUv" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#8884d8" stopOpacity={0.8} />
              <stop offset="95%" stopColor="#8884d8" stopOpacity={0} />
            </linearGradient>
          </defs>
          <XAxis dataKey={xAxisDataKey} tick={{ fill: "base-content" }} />
          <YAxis tick={{ fill: "base-content" }} />
          <CartesianGrid
            strokeDasharray="2 2"
            stroke="#eeeeee"
            className="opacity-60"
          />
          <Tooltip labelClassName="text-base-100" />
          <Area
            type="monotone"
            dataKey={dataKey}
            stroke="#8884d8"
            fillOpacity={1}
            fill="url(#colorUv)"
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
};
