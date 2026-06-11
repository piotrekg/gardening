const TIPS: Record<number, string> = {
  1: 'Plan your beds and order seeds — browse the library for inspiration while the garden sleeps.',
  2: 'Start slow growers like peppers and celery indoors under lights.',
  3: 'Sow hardy crops indoors and prune fruit trees before buds break.',
  4: 'Harden off seedlings, but watch for late frosts — keep fleece handy.',
  5: 'After the last frost (mid-May in PL zone 6a), transplant frost-sensitive crops outside.',
  6: 'Mulch beds to hold moisture and water deeply in the morning during warm spells.',
  7: 'Succession-sow lettuce and radish, and keep harvesting to encourage more fruit.',
  8: 'Collect seeds, water consistently, and start sowing autumn greens.',
  9: 'Harvest and preserve; sow green manures on empty beds.',
  10: 'First frosts approach — bring tender plants inside and lift the last roots.',
  11: 'Clean tools, compost spent plants, and protect perennials with mulch.',
  12: 'Rest, review the season, and dream up next year’s garden over a warm tea.',
};

export function SeasonalTip({ month }: { month: number }) {
  const tip = TIPS[month];
  if (!tip) return null;
  return (
    <div className="flex items-start gap-3 rounded-xl bg-primary-light/50 p-4">
      <span className="text-xl" aria-hidden="true">
        🌤️
      </span>
      <div>
        <p className="text-xs font-semibold uppercase tracking-wide text-primary-dark/70">
          Seasonal tip
        </p>
        <p className="mt-0.5 text-sm text-primary-dark">{tip}</p>
      </div>
    </div>
  );
}
