import { formatRM, monthLabel } from '../../lib/format';
import type { MonthlyTotal } from '../../types';

export function MonthlyBars({ data }: { data: MonthlyTotal[] }) {
  const max = Math.max(1, ...data.flatMap((m) => [m.in, m.out]));
  return (
    <div>
      <div className="flex items-end justify-between gap-3" style={{ height: 160 }}>
        {data.map((m) => (
          <div key={m.month} className="flex flex-1 flex-col items-center gap-1">
            <div className="flex h-[120px] w-full items-end justify-center gap-1">
              <div
                className="w-1/2 rounded-t bg-brand-green"
                style={{ height: `${(m.in / max) * 100}%` }}
                title={`In: ${formatRM(m.in)}`}
              />
              <div
                className="w-1/2 rounded-t bg-brand-red"
                style={{ height: `${(m.out / max) * 100}%` }}
                title={`Out: ${formatRM(m.out)}`}
              />
            </div>
            <span className="text-xs text-brand-faded">{monthLabel(m.month)}</span>
          </div>
        ))}
      </div>
      <div className="mt-3 flex justify-center gap-4 text-xs text-brand-muted">
        <span className="flex items-center gap-1">
          <span className="h-2 w-2 rounded-full bg-brand-green" /> Income
        </span>
        <span className="flex items-center gap-1">
          <span className="h-2 w-2 rounded-full bg-brand-red" /> Expenses
        </span>
      </div>
    </div>
  );
}
