import { Link2 } from 'lucide-react';

interface SectionHeaderProps {
  id: string;
  title: string;
  description?: string;
}

export default function SectionHeader({ id, title, description }: SectionHeaderProps) {
  return (
    <div id={id} className="scroll-mt-20 mb-6">
      <a href={`#${id}`} className="group flex items-center gap-2 mb-2">
        <h2 className="text-2xl font-bold text-zinc-50">{title}</h2>
        <Link2 className="w-5 h-5 text-zinc-600 opacity-0 group-hover:opacity-100 transition-opacity" />
      </a>
      {description && <p className="text-zinc-400 max-w-3xl">{description}</p>}
    </div>
  );
}
