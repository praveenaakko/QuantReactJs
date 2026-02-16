"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const assert = require("node:assert/strict");
const node_test_1 = require("node:test");
const mlPredictorMappers_1 = require("../utils/mlPredictorMappers");
(0, node_test_1.test)('mapApiSavedModelToSavedModel keeps raw dates for sortable values', () => {
    const model = (0, mlPredictorMappers_1.mapApiSavedModelToSavedModel)({
        id: 7,
        name: 'Model A',
        model_type: 'RandomForest',
        description: 'desc',
        performance: 0.91,
        task_type: 'prediction',
        date: '2026-02-16T13:20:00Z',
        build_time: 42,
    });
    assert.equal(model.id, '7');
    assert.equal(model.date, '2026-02-16T13:20:00Z');
    assert.equal(model.taskType, 'Prediction');
});
(0, node_test_1.test)('mapApiPredictionRunToPredictionRun preserves createdAt timestamp', () => {
    const run = (0, mlPredictorMappers_1.mapApiPredictionRunToPredictionRun)({
        id: 5,
        name: 'Run 1',
        createdAt: '2026-02-15T08:00:00Z',
        modelName: 'Model A',
    }, { name: 'Alice' });
    assert.equal(run.id, '5');
    assert.equal(run.createdAt, '2026-02-15T08:00:00Z');
    assert.equal(run.createdBy, 'Alice');
});
