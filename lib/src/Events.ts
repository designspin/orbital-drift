export type EventHandler<T> = (payload: T) => void;

type ListenerMap<TEvents extends Record<string, any>> = {
  [K in keyof TEvents]?: Set<EventHandler<TEvents[K]>>;
};

export class EventBus<TEvents extends Record<string, any>> {
  private listeners: ListenerMap<TEvents> = {};

  on<K extends keyof TEvents>(event: K, handler: EventHandler<TEvents[K]>): () => void {
    const set = this.listeners[event] ?? new Set<EventHandler<TEvents[K]>>();
    set.add(handler);
    this.listeners[event] = set;
    return () => this.off(event, handler);
  }

  off<K extends keyof TEvents>(event: K, handler: EventHandler<TEvents[K]>): void {
    const set = this.listeners[event];
    if (!set) return;
    set.delete(handler);
    if (set.size === 0) {
      delete this.listeners[event];
    }
  }

  emit<K extends keyof TEvents>(event: K, payload: TEvents[K]): void {
    const set = this.listeners[event];
    if (!set) return;
    for (const handler of set) {
      handler(payload);
    }
  }

  clear(): void {
    this.listeners = {};
  }
}
