'use client';

import StatusBadge from './StatusBadge';
import ParamTable from './ParamTable';
import CodeTabs from './CodeTabs';
import CodeBlock from './CodeBlock';
import type { EndpointDef } from '../data/endpoints';
import type { CodeExample, Language } from '../data/code-examples';
import { BASE_URL } from '../data/endpoints';

interface EndpointCardProps {
  endpoint: EndpointDef;
  examples?: CodeExample;
  activeLanguage: Language;
  onLanguageChange: (lang: Language) => void;
}

export default function EndpointCard({ endpoint, examples, activeLanguage, onLanguageChange }: EndpointCardProps) {
  return (
    <div id={endpoint.id} className="scroll-mt-20 bg-zinc-900 border border-zinc-800 rounded-lg overflow-hidden">
      {/* Header */}
      <div className="px-5 py-4 border-b border-zinc-800 flex flex-wrap items-center gap-3">
        <StatusBadge method={endpoint.method} />
        <code className="text-zinc-300 text-sm font-mono">{BASE_URL}{endpoint.path}</code>
        {endpoint.isPublic && (
          <span className="text-xs text-zinc-500 bg-zinc-800 px-2 py-0.5 rounded">Publico</span>
        )}
      </div>

      <div className="p-5 space-y-5">
        {/* Description */}
        <p className="text-zinc-400 text-sm">{endpoint.description}</p>

        {/* Path params */}
        {endpoint.pathParams && endpoint.pathParams.length > 0 && (
          <ParamTable params={endpoint.pathParams} title="Parametros de path" />
        )}

        {/* Query params */}
        {endpoint.queryParams && endpoint.queryParams.length > 0 && (
          <ParamTable params={endpoint.queryParams} title="Parametros de query" />
        )}

        {/* Body params */}
        {endpoint.bodyParams && endpoint.bodyParams.length > 0 && (
          <ParamTable params={endpoint.bodyParams} title="Body (JSON)" />
        )}

        {/* Code examples */}
        {examples && (
          <div>
            <h4 className="text-sm font-semibold text-zinc-400 mb-2 uppercase tracking-wider">Exemplo</h4>
            <CodeTabs examples={examples} activeLanguage={activeLanguage} onLanguageChange={onLanguageChange} />
          </div>
        )}

        {/* Response example */}
        <div>
          <h4 className="text-sm font-semibold text-zinc-400 mb-2 uppercase tracking-wider">Resposta</h4>
          <CodeBlock code={endpoint.responseExample} language="JSON" />
        </div>

        {/* Status codes */}
        <div>
          <h4 className="text-sm font-semibold text-zinc-400 mb-2 uppercase tracking-wider">Codigos de status</h4>
          <div className="space-y-1">
            {endpoint.statusCodes.map((sc) => (
              <div key={sc.code} className="flex items-center gap-3 text-sm">
                <code className={`font-mono font-bold ${sc.code < 300 ? 'text-green-400' : sc.code < 500 ? 'text-yellow-400' : 'text-red-400'}`}>
                  {sc.code}
                </code>
                <span className="text-zinc-400">{sc.description}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
