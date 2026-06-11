const MONTH_LABELS = ['J', 'F', 'M', 'A', 'M', 'J', 'J', 'A', 'S', 'O', 'N', 'D'];

interface MonthChipsProps {
  months: number[];
  activeClass?: string;
}

/** Row of 12 month chips with the given months (1-12) highlighted. */
export function MonthChips({ months, activeClass = 'bg-primary text-white' }: MonthChipsProps) {
  const set = new Set(months);
  return (
    <div className="flex flex-wrap gap-1">
      {MONTH_LABELS.map((label, i) => {
        const monthNo = i + 1;
        const active = set.has(monthNo);
        return (
          <span
            key={monthNo}
            title={`Month ${monthNo}`}
            className={`flex h-6 w-6 items-center justify-center rounded-md text-[11px] font-semibold ${
              active ? activeClass : 'bg-gray-100 text-gray-300'
            }`}
          >
            {label}
          </span>
        );
      })}
    </div>
  );
}
