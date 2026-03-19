import { AlertTriangle, CheckCircle2, Circle, Loader2, Shield } from 'lucide-react';
import { formatDate } from '@/lib/utils';
import type { DaxStreamEvent } from '@/types/dax';

const eventIcon = (type: DaxStreamEvent['type']) => {
  if (type.includes('failed')) return <AlertTriangle className="h-4 w-4 text-rose-500" />;
  if (type.includes('completed') || type.includes('resolved')) {
    return <CheckCircle2 className="h-4 w-4 text-emerald-500" />;
  }
  if (type.includes('approval')) return <Shield className="h-4 w-4 text-orange-500" />;
  if (type.includes('started') || type.includes('running')) {
    return <Loader2 className="h-4 w-4 animate-spin text-sky-500" />;
  }
  return <Circle className="h-4 w-4 text-muted-foreground" />;
};

interface RunEventStreamProps {
  events: DaxStreamEvent[];
  streamState: 'connecting' | 'live' | 'closed';
}

export function RunEventStream({ events, streamState }: RunEventStreamProps) {
  return (
    <section className="rounded-2xl border border-border bg-card shadow-sm">
      <div className="flex items-center justify-between border-b border-border px-5 py-4">
        <div>
          <h2 className="text-lg font-semibold">Live Event Stream</h2>
          <p className="text-sm text-muted-foreground">
            Run events arrive in order from the backend SSE proxy.
          </p>
        </div>
        <div className="text-xs uppercase tracking-[0.2em] text-muted-foreground">
          {streamState}
        </div>
      </div>

      <div className="max-h-[28rem] space-y-3 overflow-auto px-5 py-4">
        {events.length === 0 ? (
          <div className="rounded-xl border border-dashed border-border px-4 py-8 text-center text-sm text-muted-foreground">
            Waiting for run events.
          </div>
        ) : (
          events
            .slice()
            .reverse()
            .map((event) => (
              <article
                key={event.eventId}
                className="rounded-xl border border-border bg-background/80 px-4 py-3"
              >
                <div className="flex items-start gap-3">
                  <div className="mt-0.5">{eventIcon(event.type)}</div>
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-medium">{event.type}</span>
                      <span className="font-mono text-xs text-muted-foreground">
                        #{event.sequence}
                      </span>
                    </div>
                    <p className="mt-1 whitespace-pre-wrap break-words text-sm text-muted-foreground">
                      {JSON.stringify(event.payload, null, 2)}
                    </p>
                    <div className="mt-2 text-xs text-muted-foreground">
                      {formatDate(event.timestamp)}
                    </div>
                  </div>
                </div>
              </article>
            ))
        )}
      </div>
    </section>
  );
}
