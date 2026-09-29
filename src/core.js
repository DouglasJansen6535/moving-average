/**
 * Core moving-average primitives.
 *
 * The library supports two families — simple (SMA) and exponential (EMA) — both
 * behind a shared `push` / `value` / `ready` interface so callers can swap one
 * for the other without touching the call site.
 *
 * Warm-up handling is the one design decision worth calling out: an accumulator
 * is `ready` only once it has seen at least `period` samples. Before that,
 * `value` returns `null`. We deliberately do NOT return a partial average over
 * the first few samples, because consumers of moving averages (thresholding,
 * crossover signals) typically treat an early reading as more dangerous than no
 * reading. If you want partial averages, accumulate the raw values yourself.
 */

/**
 * A simple moving average over a fixed-size sliding window.
 *
 * We keep a running sum and a circular buffer of the last `period` values so
 * each `push` is O(1) regardless of window size. The buffer is pre-allocated
 * so there is no per-push allocation once the window is full.
 */
export class SimpleMovingAverage {
  /**
   * @param {number} period Number of samples in the moving window. Must be a
   *   positive integer.
   */
  constructor(period) {
    if (!Number.isInteger(period) || period <= 0) {
      throw new RangeError(
        `period must be a positive integer, got ${String(period)}`
      );
    }
    this._period = period;
    this._buffer = new Array(period).fill(0);
    this._sum = 0;
    this._count = 0;
    this._index = 0;
  }

  /** Number of samples actually observed so far (capped at `period`). */
  get count() {
    return this._count;
  }

  /** Configured window length. */
  get period() {
    return this._period;
  }

  /**
   * Feed the next sample.
   *
   * @param {number} x The incoming value. Must be finite; NaN/Infinity would
   *   silently poison the running sum, so we reject them up front.
   * @returns {void}
   */
  push(x) {
    if (typeof x !== "number" || !Number.isFinite(x)) {
      throw new TypeError(`push expects a finite number, got ${String(x)}`);
    }
    if (this._count < this._period) {
      this._buffer[this._index] = x;
      this._sum += x;
      this._count += 1;
    } else {
      const old = this._buffer[this._index];
      this._buffer[this._index] = x;
      this._sum += x - old;
    }
    this._index = (this._index + 1) % this._period;
  }

  /** True once at least `period` samples have been pushed. */
  ready() {
    return this._count >= this._period;
  }

  /**
   * The current average, or `null` during warm-up.
   *
   * @returns {number | null}
   */
  value() {
    if (!this.ready()) return null;
    return this._sum / this._period;
  }

  /** Reset the accumulator as if freshly constructed. */
  reset() {
    this._buffer.fill(0);
    this._sum = 0;
    this._count = 0;
    this._index = 0;
  }
}

/**
 * An exponential moving average.
 *
 * The smoothing factor is derived from the period via the standard identity
 *   alpha = 2 / (period + 1)
 * which makes the EMA's "center of mass" roughly match an SMA of the same
 * period. We seed the EMA with the first sample rather than zero; seeding with
 * zero biases the early values downward and is a common silent bug.
 *
 * `ready` returns true once at least `period` samples have been seen, matching
 * the SMA contract. The EMA does of course produce a number before then, but we
 * hide it so callers can treat both families uniformly.
 */
export class ExponentialMovingAverage {
  /**
   * @param {number} period Controls the smoothing factor. Must be a positive
   *   integer.
   */
  constructor(period) {
    if (!Number.isInteger(period) || period <= 0) {
      throw new RangeError(
        `period must be a positive integer, got ${String(period)}`
      );
    }
    this._period = period;
    this._alpha = 2 / (period + 1);
    this._ema = 0;
    this._count = 0;
    this._seeded = false;
  }

  /** Number of samples observed so far. */
  get count() {
    return this._count;
  }

  /** Configured period. */
  get period() {
    return this._period;
  }

  /**
   * Feed the next sample.
   *
   * @param {number} x The incoming value. Must be finite.
   * @returns {void}
   */
  push(x) {
    if (typeof x !== "number" || !Number.isFinite(x)) {
      throw new TypeError(`push expects a finite number, got ${String(x)}`);
    }
    if (!this._seeded) {
      this._ema = x;
      this._seeded = true;
    } else {
      this._ema = this._alpha * x + (1 - this._alpha) * this._ema;
    }
    this._count += 1;
  }

  /** True once at least `period` samples have been pushed. */
  ready() {
    return this._count >= this._period;
  }

  /**
   * The current EMA, or `null` during warm-up.
   *
   * @returns {number | null}
   */
  value() {
    if (!this.ready()) return null;
    return this._ema;
  }

  /** Reset the accumulator as if freshly constructed. */
  reset() {
    this._ema = 0;
    this._count = 0;
    this._seeded = false;
  }
}
