// Simple event emitter base to share across timers
export class TimerBase {
  constructor() {
    this._events = new Map(); // name -> Set
  }
  on(name, handler) {
    if (!this._events.has(name)) this._events.set(name, new Set());
    this._events.get(name).add(handler);
    return this;
  }
  off(name, handler) {
    this._events.get(name)?.delete(handler);
    return this;
  }
  _emit(name, payload) {
    const set = this._events.get(name);
    if (!set || set.size === 0) return;
    for (const fn of set) {
      try { fn(payload); } catch (e) { console.error(e); }
    }
  }
}

