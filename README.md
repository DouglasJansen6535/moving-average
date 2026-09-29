# moving-average

Warm-up-aware simple (SMA) and exponential (EMA) moving averages for JavaScript.

```js
import { SimpleMovingAverage, ExponentialMovingAverage } from "moving-average";

const sma = new SimpleMovingAverage(3);
for (const v of [1, 2, 3, 4]) sma.push(v);
sma.value(); // 3  — average of [2, 3, 4]
sma.ready(); // true

const ema = new ExponentialMovingAverage(5);
for (const v of [10, 11, 9, 12, 10, 13]) ema.push(v);
ema.value(); // smoothed value, null until 5 samples seen
ema.ready(); // true
```

## Why this exists

Most moving-average implementations either return a number from the very first
sample (silently averaging over fewer points than promised) or force you to
track warm-up yourself. This library makes warm-up a first-class part of the
contract: `value()` returns `null` until `period` samples have been pushed, and
`ready()` tells you when that threshold is crossed. SMA and EMA share the same
`push` / `value` / `ready` / `reset` surface so you can swap families without
editing call sites.

The trade-off: if you want a partial average during warm-up, this library will
not give you one. Accumulate the raw values yourself in that case.

## The awkward edge

The EMA is seeded with the **first sample**, not zero. Seeding with zero drags
the early readings toward zero and is a common silent bug. The consequence is
that the first EMA value, once warm-up completes, reflects the first sample as
its starting point — not an average from zero. If you need a cold-start EMA
seeded differently, construct your own and skip the first `period` samples.

Both `push` methods reject `NaN`, `Infinity`, and non-number inputs. A single
poisoned sample would otherwise corrupt every subsequent reading.
