"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const assert = require("node:assert/strict");
const node_test_1 = require("node:test");
const reducer_1 = require("../store/reducer");
(0, node_test_1.test)('appReducer increments loading counter on SET_LOADING true', () => {
    const next = (0, reducer_1.appReducer)(reducer_1.initialState, { type: 'SET_LOADING', payload: true });
    assert.equal(next.loadingCount, 1);
    assert.equal(next.isLoading, true);
});
(0, node_test_1.test)('appReducer decrements loading counter without going below zero', () => {
    const start = (0, reducer_1.appReducer)(reducer_1.initialState, { type: 'SET_LOADING', payload: true });
    const next = (0, reducer_1.appReducer)(start, { type: 'SET_LOADING', payload: false });
    const last = (0, reducer_1.appReducer)(next, { type: 'SET_LOADING', payload: false });
    assert.equal(next.loadingCount, 0);
    assert.equal(next.isLoading, false);
    assert.equal(last.loadingCount, 0);
    assert.equal(last.isLoading, false);
});
