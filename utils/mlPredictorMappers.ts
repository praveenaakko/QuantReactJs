import type { PredictionRun, SavedModel } from '../types';
import { PredictionStatus } from '../types';
import { formatDate12h, toEpochMs } from './dateTime';

const normalizeTimestamp = (value: unknown): string => {
  if (typeof value !== 'string' || !value.trim()) return '';
  return value.trim();
};
export { formatDate12h, toEpochMs };

const normalizeTaskType = (value: unknown): SavedModel['taskType'] => {
  const normalized = typeof value === 'string' ? value.trim().toLowerCase() : '';
  if (normalized === 'classification') return 'Classification';
  return 'Prediction';
};

const normalizeModelType = (value: unknown): string => {
  if (typeof value !== 'string') return 'N/A';
  const trimmed = value.trim();
  return trimmed || 'N/A';
};

export const mapApiSavedModelToSavedModel = (apiModel: any): SavedModel => ({
  id: String(apiModel?.id || ''),
  name: apiModel?.name || 'Unnamed Model',
  modelType: normalizeModelType(apiModel?.modelType ?? apiModel?.model_type),
  description: apiModel?.description || '',
  performance: apiModel?.performance || 0,
  taskType: normalizeTaskType(apiModel?.taskType ?? apiModel?.task_type),
  date: normalizeTimestamp(apiModel?.date ?? apiModel?.created_at ?? apiModel?.createdAt),
  buildTime: apiModel?.build_time || 0,
});

export const mapApiPredictionRunToPredictionRun = (apiRun: any, currentUser: any): PredictionRun => ({
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
  status: (apiRun?.status as PredictionStatus) || PredictionStatus.PROCESSING,
  duration: apiRun?.duration,
});
