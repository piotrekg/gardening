import { format } from 'date-fns';
import { useTranslation } from 'react-i18next';
import { useDateFnsLocale } from '../i18n/dateLocale';

interface MonthChipsProps {
  months: number[];
  activeClass?: string;
}

/** Row of 12 month chips with the given months (1-12) highlighted. */
export function MonthChips({ months, activeClass = 'bg-primary text-white' }: MonthChipsProps) {
  const { t } = useTranslation();
  const locale = useDateFnsLocale();
  const set = new Set(months);
  return (
    <div className="flex flex-wrap gap-1">
      {Array.from({ length: 12 }, (_, i) => {
        const monthNo = i + 1;
        const date = new Date(2000, i, 1);
        const active = set.has(monthNo);
        return (
          <span
            key={monthNo}
            title={t('monthChips.monthTitle', { month: format(date, 'LLLL', { locale }) })}
            className={`flex h-6 w-6 items-center justify-center rounded-md text-[11px] font-semibold ${
              active ? activeClass : 'bg-gray-100 text-gray-300'
            }`}
          >
            {format(date, 'LLLLL', { locale })}
          </span>
        );
      })}
    </div>
  );
}
