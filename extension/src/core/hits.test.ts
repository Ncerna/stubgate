import { afterEach, describe, expect, it, vi } from 'vitest';
import { createHitCounter } from './hits';
import type { Stats } from './types';

afterEach(() => vi.useRealTimers());

function fakeIo(failFirstSave = false) {
  const state = { saved: {} as Stats, writes: 0, failures: failFirstSave ? 1 : 0 };
  return {
    state,
    io: {
      load: async () => ({ ...state.saved }),
      save: async (s: Stats) => {
        if (state.failures > 0) {
          state.failures--;
          throw new Error('storage unavailable');
        }
        state.writes++;
        state.saved = s;
      },
    },
  };
}

describe('createHitCounter', () => {
  it('adds up many simultaneous hits with a single write and loses none', async () => {
    vi.useFakeTimers();
    const { io, state } = fakeIo();
    const counter = createHitCounter(io, 100);
    for (let i = 0; i < 100; i++) counter.hit('a');
    for (let i = 0; i < 5; i++) counter.hit('b');
    await vi.advanceTimersByTimeAsync(150);
    await counter.flush();
    expect(state.saved).toEqual({ a: 100, b: 5 });
    expect(state.writes).toBe(1);
  });

  it('keeps adding to what is already stored', async () => {
    vi.useFakeTimers();
    const { io, state } = fakeIo();
    state.saved = { a: 10 };
    const counter = createHitCounter(io, 100);
    counter.hit('a');
    await vi.advanceTimersByTimeAsync(150);
    counter.hit('a');
    counter.hit('c');
    await vi.advanceTimersByTimeAsync(150);
    await counter.flush();
    expect(state.saved).toEqual({ a: 12, c: 1 });
  });

  it('does not lose counts when a write fails: it retries with the same batch', async () => {
    vi.useFakeTimers();
    const { io, state } = fakeIo(true);
    const counter = createHitCounter(io, 100);
    counter.hit('a');
    counter.hit('a');
    await vi.advanceTimersByTimeAsync(150); // first write fails, batch goes back
    expect(state.saved).toEqual({});
    await vi.advanceTimersByTimeAsync(150); // retry succeeds
    await counter.flush();
    expect(state.saved).toEqual({ a: 2 });
  });
});
