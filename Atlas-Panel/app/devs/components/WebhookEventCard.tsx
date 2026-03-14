import CodeBlock from './CodeBlock';
import type { WebhookEvent } from '../data/webhook-events';

interface WebhookEventCardProps {
  event: WebhookEvent;
}

export default function WebhookEventCard({ event }: WebhookEventCardProps) {
  return (
    <div className="bg-zinc-900 border border-zinc-800 rounded-lg overflow-hidden">
      <div className="px-5 py-3 border-b border-zinc-800 flex items-center gap-3">
        <code className="text-blue-400 text-sm font-mono font-semibold">{event.name}</code>
      </div>
      <div className="p-5 space-y-3">
        <p className="text-zinc-400 text-sm">{event.description}</p>
        <CodeBlock code={event.payloadExample} language="JSON" />
      </div>
    </div>
  );
}
