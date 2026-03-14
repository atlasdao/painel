import type { Param } from '../data/endpoints';

interface ParamTableProps {
  params: Param[];
  title?: string;
}

export default function ParamTable({ params, title }: ParamTableProps) {
  if (params.length === 0) return null;

  return (
    <div className="mb-4">
      {title && <h4 className="text-sm font-semibold text-zinc-400 mb-2 uppercase tracking-wider">{title}</h4>}
      <div className="border border-zinc-800 rounded-lg overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-zinc-900/50 border-b border-zinc-800">
              <th className="text-left px-4 py-2.5 text-zinc-400 font-medium">Parametro</th>
              <th className="text-left px-4 py-2.5 text-zinc-400 font-medium">Tipo</th>
              <th className="text-left px-4 py-2.5 text-zinc-400 font-medium hidden sm:table-cell">Obrigatorio</th>
              <th className="text-left px-4 py-2.5 text-zinc-400 font-medium">Descricao</th>
            </tr>
          </thead>
          <tbody>
            {params.map((p, i) => (
              <tr key={p.name} className={i < params.length - 1 ? 'border-b border-zinc-800/50' : ''}>
                <td className="px-4 py-2.5">
                  <code className="text-blue-400 text-xs font-mono">{p.name}</code>
                </td>
                <td className="px-4 py-2.5">
                  <code className="text-zinc-500 text-xs font-mono">{p.type}</code>
                </td>
                <td className="px-4 py-2.5 hidden sm:table-cell">
                  {p.required ? (
                    <span className="text-xs text-red-400 font-medium">Sim</span>
                  ) : (
                    <span className="text-xs text-zinc-600">Nao</span>
                  )}
                </td>
                <td className="px-4 py-2.5 text-zinc-400 text-xs">{p.description}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
