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

## Design notes

The window stores values eagerly rather than keeping running aggregates. Running
sums drift with floating point over long streams, and recomputing from a small
buffer is cheap enough that the drift is not worth the speed.

## Limitations

Values are coerced to floats, so very large integers lose precision. If you need
exact integer aggregates over a window, this is the wrong tool.

## Contributing

Issues and pull requests are welcome. Please keep the dependency list empty —
that constraint is the point of the project, not an oversight.

## Performance

The window keeps a bounded buffer, so `push` is constant time and memory does not
grow with the length of the stream. `peak` and `trough` are linear in the window
size, which is the trade that keeps `push` cheap.

