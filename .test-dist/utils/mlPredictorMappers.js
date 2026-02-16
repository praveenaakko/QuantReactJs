"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.mapApiPredictionRunToPredictionRun = exports.mapApiSavedModelToSavedModel = exports.toEpochMs = exports.formatDate12h = void 0;
const types_1 = require("../types");
const dateTime_1 = require("./dateTime");
Object.defineProperty(exports, "formatDate12h", { enumerable: true, get: function () { return dateTime_1.formatDate12h; } });
Object.defineProperty(exports, "toEpochMs", { enumerable: true, get: function () { return dateTime_1.toEpochMs; } });
const normalizeTimestamp = (value) => {
    if (typeof value !== 'string' || !value.trim())
        return '';
    return value.trim();
};
const normalizeTaskType = (value) => {
    const normalized = typeof value === 'string' ? value.trim().toLowerCase() : '';
    if (normalized === 'classification')
        return 'Classification';
    return 'Prediction';
};
const normalizeModelType = (value) => {
    if (typeof value !== 'string')
        return 'N/A';
    const trimmed = value.trim();
    return trimmed || 'N/A';
};
const mapApiSavedModelToSavedModel = (apiModel) => ({
    id: String(apiModel?.id || ''),
    name: apiModel?.name || 'Unnamed Model',
    modelType: normalizeModelType(apiModel?.modelType ?? apiModel?.model_type),
    description: apiModel?.description || '',
    performance: apiModel?.performance || 0,
    taskType: normalizeTaskType(apiModel?.taskType ?? apiModel?.task_type),
    date: normalizeTimestamp(apiModel?.date ?? apiModel?.created_at ?? apiModel?.createdAt),
    buildTime: apiModel?.build_time || 0,
});
exports.mapApiSavedModelToSavedModel = mapApiSavedModelToSavedModel;
const mapApiPredictionRunToPredictionRun = (apiRun, currentUser) => ({
    id: String(apiRun?.id || ''),
    name: apiRun?.name || 'Unnamed Run',
    description: apiRun?.description || '',
    modelName: apiRun?.modelName || apiRun?.model_name || 'N/A',
    modelId: String(apiRun?.modelId || apiRun?.model_id || ''),
    modelType: apiRun?.modelType || apiRun?.model_type || 'N/A',
    modelBuilderName: apiRun?.modelBuilderName || apiRun?.model_builder_name || 'N/A',
    inputCount: apiRun?.inputCount || apiRun?.input_count || 0,
    createdAt: normalizeTimestamp(apiRun?.createdAt ?? apiRun?.created_at),
    createdBy: apiRun?.createdBy || apiRun?.created_by || currentUser?.name || 'Unknown',
    status: apiRun?.status || types_1.PredictionStatus.PROCESSING,
    duration: apiRun?.duration,
});
exports.mapApiPredictionRunToPredictionRun = mapApiPredictionRunToPredictionRun;
