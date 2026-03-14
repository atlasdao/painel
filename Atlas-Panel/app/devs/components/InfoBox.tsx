import { Info, AlertTriangle, Lightbulb, ShieldAlert } from 'lucide-react';
import type { ReactNode } from 'react';

type InfoType = 'info' | 'warning' | 'tip' | 'danger';

const config: Record<InfoType, { icon: typeof Info; border: string; iconColor: string; titleColor: string; bg: string }> = {
  info: { icon: Info, border: 'border-l-blue-400', iconColor: 'text-blue-400', titleColor: 'text-blue-400', bg: 'bg-blue-400/5' },
  warning: { icon: AlertTriangle, border: 'border-l-yellow-400', iconColor: 'text-yellow-400', titleColor: 'text-yellow-400', bg: 'bg-yellow-400/5' },
  tip: { icon: Lightbulb, border: 'border-l-green-400', iconColor: 'text-green-400', titleColor: 'text-green-400', bg: 'bg-green-400/5' },
  danger: { icon: ShieldAlert, border: 'border-l-red-400', iconColor: 'text-red-400', titleColor: 'text-red-400', bg: 'bg-red-400/5' },
};

interface InfoBoxProps {
  type: InfoType;
  title: string;
  children: ReactNode;
}

export default function InfoBox({ type, title, children }: InfoBoxProps) {
  const { icon: Icon, border, iconColor, titleColor, bg } = config[type];
  return (
    <div className={`border-l-4 ${border} ${bg} rounded-r-lg p-4`}>
      <div className="flex items-start gap-3">
        <Icon className={`w-5 h-5 ${iconColor} mt-0.5 shrink-0`} />
        <div>
          <p className={`${titleColor} font-semibold text-sm`}>{title}</p>
          <div className="text-zinc-300 text-sm mt-1">{children}</div>
        </div>
      </div>
    </div>
  );
}
