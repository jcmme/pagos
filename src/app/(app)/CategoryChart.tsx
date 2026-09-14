"use client";

import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer } from "recharts";
import { formatCurrency } from "@/lib/utils";

type Datum = { name: string; color: string; value: number };

export function CategoryChart({ data }: { data: Datum[] }) {
  return (
    <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
      <div className="mx-auto h-52 w-52 shrink-0">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={data}
              dataKey="value"
              nameKey="name"
              innerRadius={55}
              outerRadius={80}
              paddingAngle={2}
              stroke="none"
            >
              {data.map((d) => (
                <Cell key={d.name} fill={d.color} />
              ))}
            </Pie>
            <Tooltip
              contentStyle={{
                background: "#2c2c2e",
                border: "1px solid rgba(255,255,255,0.08)",
                borderRadius: 12,
                color: "#f5f5f7",
                fontSize: 13,
              }}
              formatter={(value) => formatCurrency(Number(value))}
            />
          </PieChart>
        </ResponsiveContainer>
      </div>
      <div className="flex flex-1 flex-col gap-1.5">
        {data.map((d) => (
          <div key={d.name} className="flex items-center justify-between text-[13px]">
            <div className="flex items-center gap-2">
              <span className="h-2.5 w-2.5 rounded-full" style={{ background: d.color }} />
              <span className="text-(--foreground-muted)">{d.name}</span>
            </div>
            <span>{formatCurrency(d.value)}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
