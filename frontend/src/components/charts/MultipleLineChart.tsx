import { generateRandomPastelColor } from "@/utils";
import classNames from "classnames";
import {
  Area,
  AreaChart,
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

export const MultipleLineChart = ({
  data,
  dataKeys,
  title,
  xAxisDataKey,
  className,
}: {
  data: any[];
  dataKeys: string[];
  title: string;
  xAxisDataKey: string;
  className?: string;
}) => {
  return (
    <div
      className={classNames(
        "flex flex-col items-start justify-start w-full h-full",
        "bg-base-200 p-4 rounded-xl shadow-xl",
        className
      )}
    >
      <p className="text-xl font-bold text-base-content">{title}</p>
      <ResponsiveContainer
        width="100%"
        height="100%"
        className="min-h-[12rem] mt-4"
      >
        <LineChart
          width={500}
          height={300}
          data={data}
          margin={{
            top: 5,
            right: 30,
            left: 20,
            bottom: 5,
          }}
          className="fill-base-content/90 border-base-content -mx-4"
        >
          <CartesianGrid
            strokeDasharray="3 3"
            stroke="#eeeeee"
            className="opacity-60"
          />
          <XAxis dataKey={xAxisDataKey} tick={{ fill: "base-content" }} />
          <YAxis tick={{ fill: "base-content" }} />
          <Tooltip
            labelClassName="text-base-content font-medium"
            wrapperClassName="!border-none !bg-popover/80 rounded-lg"
          />
          <Legend />
          {dataKeys.map((dataKey, index) => (
            <Line
              key={index}
              type="monotone"
              dataKey={dataKey}
              stroke={generateRandomPastelColor()}
              strokeWidth={3}
              activeDot={{ r: 6 }}
            />
          ))}
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
};
