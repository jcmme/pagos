"use client";

import Link from "next/link";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { MONTH_NAMES, shiftMonth } from "@/lib/dates";

export function MonthNav({
  basePath,
  month,
  year,
}: {
  basePath: string;
  month: number;
  year: number;
}) {
  const prev = shiftMonth(month, year, -1);
  const next = shiftMonth(month, year, 1);

  return (
    <div className="flex items-center gap-1">
      <Link
        href={`${basePath}?month=${prev.month}&year=${prev.year}`}
        className="flex h-8 w-8 items-center justify-center rounded-full text-(--foreground-muted) hover:bg-(--surface-2)"
      >
        <ChevronLeft size={18} />
      </Link>
      <span className="w-36 text-center text-[15px] font-medium">
        {MONTH_NAMES[month - 1]} {year}
      </span>
      <Link
        href={`${basePath}?month=${next.month}&year=${next.year}`}
        className="flex h-8 w-8 items-center justify-center rounded-full text-(--foreground-muted) hover:bg-(--surface-2)"
      >
        <ChevronRight size={18} />
      </Link>
    </div>
  );
}
