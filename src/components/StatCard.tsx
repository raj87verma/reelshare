import React from 'react';
import { LucideIcon } from 'lucide-react';

interface StatCardProps {
  title: string;
  value: string;
  icon: LucideIcon;
  color: string;
  trend?: string;
  // When true, `trend` is rendered as a plain muted note (e.g. "Analytics
  // not yet available") instead of a "↑ {trend}" positive-change indicator.
  // Used for stats where there's no real trend data to show at all yet,
  // as opposed to a real trend that happens to be flat/negative.
  note?: boolean;
}

const StatCard: React.FC<StatCardProps> = ({ title, value, icon: Icon, color, trend, note }) => {
  return (
    <div className="bg-card border border-border p-5 rounded-xl shadow-sm">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm text-muted-foreground">{title}</p>
          <p className="text-3xl font-bold text-foreground mt-1">{value}</p>
          {trend && (
            <p className={`text-sm mt-1 ${note ? 'text-muted-foreground' : 'text-green-500'}`}>
              {note ? trend : `↑ ${trend}`}
            </p>
          )}
        </div>
        <div className={`w-12 h-12 ${color} rounded-lg flex items-center justify-center`}>
          <Icon className="w-6 h-6" />
        </div>
      </div>
    </div>
  );
};

export default StatCard;