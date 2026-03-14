import type { HttpMethod } from '../data/endpoints';

const methodStyles: Record<HttpMethod, string> = {
  GET: 'text-green-400 bg-green-400/10',
  POST: 'text-blue-400 bg-blue-400/10',
  DELETE: 'text-red-400 bg-red-400/10',
};

export default function StatusBadge({ method }: { method: HttpMethod }) {
  return (
    <span className={`px-2.5 py-1 rounded text-xs font-bold font-mono tracking-wider ${methodStyles[method]}`}>
      {method}
    </span>
  );
}
