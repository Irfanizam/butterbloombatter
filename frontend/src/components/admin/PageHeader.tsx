import { ReactNode } from 'react';
import { Badge } from '../ui/Badge';

interface PageHeaderProps {
  title: string;
  count?: number;
  actions?: ReactNode;
}

export function PageHeader({ title, count, actions }: PageHeaderProps) {
  return (
    <div className="mb-4 flex items-center justify-between gap-3">
      <div className="flex items-center gap-2">
        <h1 className="text-xl font-bold text-brand-dark">{title}</h1>
        {count !== undefined && <Badge>{count}</Badge>}
      </div>
      {actions}
    </div>
  );
}
