import * as assert from 'node:assert/strict';
import { test } from 'node:test';
import { appReducer, initialState } from '../store/reducer';

test('appReducer increments loading counter on SET_LOADING true', () => {
  const next = appReducer(initialState, { type: 'SET_LOADING', payload: true });
  assert.equal(next.loadingCount, 1);
  assert.equal(next.isLoading, true);
});

test('appReducer decrements loading counter without going below zero', () => {
  const start = appReducer(initialState, { type: 'SET_LOADING', payload: true });
  const next = appReducer(start, { type: 'SET_LOADING', payload: false });
  const last = appReducer(next, { type: 'SET_LOADING', payload: false });

  assert.equal(next.loadingCount, 0);
  assert.equal(next.isLoading, false);
  assert.equal(last.loadingCount, 0);
  assert.equal(last.isLoading, false);
});
