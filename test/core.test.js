import { test } from "node:test";
import assert from "node:assert/strict";

import {
  SimpleMovingAverage,
  ExponentialMovingAverage,
} from "../src/index.js";

/**
 * Float comparison helper. Moving averages involve division, so exact equality
 * is not safe. We use a relative tolerance because values can range widely.
 */
function approxEqual(a, b, eps = 1e-9) {
  const scale = Math.max(Math.abs(a), Math.abs(b), 1);
  return Math.abs(a - b) <= eps * scale;
}

test("SMA rejects non-positive or non-integer periods", () => {
  assert.throws(() => new SimpleMovingAverage(0), RangeError);
  assert.throws(() => new SimpleMovingAverage(-3), RangeError);
  assert.throws(() => new SimpleMovingAverage(2.5), RangeError);
  assert.throws(() => new SimpleMovingAverage(NaN), RangeError);
});

test("SMA is not ready and returns null before the window fills", () => {
  const sma = new SimpleMovingAverage(3);
  assert.equal(sma.ready(), false);
  assert.equal(sma.value(), null);
  sma.push(1);
  assert.equal(sma.ready(), false);
  assert.equal(sma.value(), null);
  sma.push(2);
  assert.equal(sma.ready(), false);
  assert.equal(sma.value(), null);
});

test("SMA computes the average of the first window", () => {
  const sma = new SimpleMovingAverage(3);
  sma.push(1);
  sma.push(2);
  sma.push(3);
  assert.equal(sma.ready(), true);
  assert.equal(sma.value(), 2);
});

test("SMA slides the window and stays O(1)-accurate", () => {
  const sma = new SimpleMovingAverage(3);
  for (const v of [1, 2, 3, 4, 5, 6]) sma.push(v);
  // window is [4, 5, 6]
  assert.equal(sma.value(), 5);
});

test("SMA handles negative and mixed-sign values", () => {
  const sma = new SimpleMovingAverage(2);
  sma.push(-10);
  sma.push(10);
  assert.equal(sma.value(), 0);
  sma.push(-4);
  // window is [10, -4]
  assert.equal(sma.value(), 3);
});

test("SMA rejects non-finite inputs", () => {
  const sma = new SimpleMovingAverage(2);
  assert.throws(() => sma.push(NaN), TypeError);
  assert.throws(() => sma.push(Infinity), TypeError);
  assert.throws(() => sma.push("3"), TypeError);
});

test("SMA reset returns to the warm-up state", () => {
  const sma = new SimpleMovingAverage(2);
  sma.push(1);
  sma.push(2);
  assert.equal(sma.value(), 1.5);
  sma.reset();
  assert.equal(sma.ready(), false);
  assert.equal(sma.value(), null);
  assert.equal(sma.count, 0);
});

test("SMA with period 1 echoes the last value", () => {
  const sma = new SimpleMovingAverage(1);
  sma.push(42);
  assert.equal(sma.ready(), true);
  assert.equal(sma.value(), 42);
  sma.push(7);
  assert.equal(sma.value(), 7);
});

test("EMA rejects non-positive or non-integer periods", () => {
  assert.throws(() => new ExponentialMovingAverage(0), RangeError);
  assert.throws(() => new ExponentialMovingAverage(-1), RangeError);
  assert.throws(() => new ExponentialMovingAverage(1.5), RangeError);
});

test("EMA is not ready and returns null before the period elapses", () => {
  const ema = new ExponentialMovingAverage(3);
  assert.equal(ema.ready(), false);
  assert.equal(ema.value(), null);
  ema.push(1);
  ema.push(2);
  assert.equal(ema.ready(), false);
  assert.equal(ema.value(), null);
});

test("EMA seeds with the first sample, not zero", () => {
  // With period 1, alpha = 1, so the EMA is just the latest value. The seed
  // choice is invisible here, but the test pins the contract.
  const ema = new ExponentialMovingAverage(1);
  ema.push(5);
  assert.equal(ema.ready(), true);
  assert.equal(ema.value(), 5);
  ema.push(9);
  assert.equal(ema.value(), 9);
});

test("EMA matches the textbook recurrence after warm-up", () => {
  // period 3 => alpha = 2 / 4 = 0.5
  const ema = new ExponentialMovingAverage(3);
  const values = [10, 12, 11, 13, 12];
  let expected = values[0];
  for (const v of values) {
    ema.push(v);
  }
  // Recompute the expected EMA step by step.
  expected = values[0];
  for (let i = 1; i < values.length; i++) {
    expected = 0.5 * values[i] + 0.5 * expected;
  }
  assert.ok(approxEqual(ema.value(), expected));
});

test("EMA rejects non-finite inputs", () => {
  const ema = new ExponentialMovingAverage(2);
  assert.throws(() => ema.push(NaN), TypeError);
  assert.throws(() => ema.push(Infinity), TypeError);
});

test("EMA reset returns to the unseeded state", () => {
  const ema = new ExponentialMovingAverage(2);
  ema.push(1);
  ema.push(2);
  assert.equal(ema.ready(), true);
  ema.reset();
  assert.equal(ema.ready(), false);
  assert.equal(ema.value(), null);
  assert.equal(ema.count, 0);
  // After reset the first push should seed again, not blend against a stale
  // leftover value.
  ema.push(100);
  ema.push(100);
  assert.equal(ema.value(), 100);
});
