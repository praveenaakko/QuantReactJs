
import React, { useState, useEffect, useMemo } from 'react';
import { EChartComponent } from './EChartComponent';
import type { EChartsOption } from 'echarts';
import { NotificationType, TrainingStatus, type TrainingRun, SavedModel } from '../types';
import { SaveModelModal } from './SaveModelModal';
import { Pagination } from './Pagination';
import { useStore } from '../store/store';
import api from '../config/api';
import { ConfirmationModal } from './ConfirmationModal';

declare const ecStat: any;

interface MLBuilderSectionProps {
    addNotification: (message: string, type: NotificationType) => void;
}

interface AlgorithmResult {
  id: string;
  algorithm: string;
  r2: number | null;
  mse: number | null;
  mae: number | null;
  rmse: number | null;
  mape: number | null;
  accuracy: number | null;
  precision: number | null;
  recall: number | null;
  f1_score: number | null;
  roc_auc: number | null;
  best_params?: { model_name?: string };
}


interface PredictionPoint {
    id: string;
    smiles: string;
    actual: number;
    predicted: number;
}

interface ModelInfo {
    fingerprintUsed: string;
    normalization: string;
    descriptorUsed: string;
    outlierRanges: string;
    activityRange: number | null;
}

const formatDate12h = (value: string) => {
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return value;
    return date.toLocaleString('en-US', {
        year: 'numeric',
        month: 'short',
        day: '2-digit',
        hour: 'numeric',
        minute: '2-digit',
        hour12: true
    });
};

const mapApiTrainingRunToTrainingRun = (apiRun: any, currentUser: any): TrainingRun => {
    // Normalize taskType to be capitalized to match the component's expected values.
    const taskType = apiRun.taskType?.toLowerCase() === 'classification' 
        ? 'Classification' 
        : 'Prediction';

    return {
        id: String(apiRun.id),
        name: apiRun.name,
        datasetName: apiRun.datasetName,
        taskType: taskType,
        createdAt: formatDate12h(apiRun.createdAt),
        createdBy: apiRun.createdBy || currentUser?.name || 'Unknown',
        status: apiRun.status as TrainingStatus,
        duration: apiRun.duration,
        modelCount: apiRun.modelCount,
    };
};

const mapApiSavedModelToSavedModel = (apiModel: any): SavedModel => ({
    id: String(apiModel.id),
    name: apiModel.name,
    modelType: apiModel.model_type,
    description: apiModel.description,
    performance: apiModel.performance,
    taskType: apiModel.task_type === 'prediction' ? 'Prediction' : 'Classification',
    date: formatDate12h(apiModel.date),
    buildTime: apiModel.build_time,
});

const FormInput: React.FC<React.InputHTMLAttributes<HTMLInputElement> & { label: string }> = ({ label, id, ...props }) => (
    <div>
      <label htmlFor={id} className="block text-sm font-greycliff text-white/70 mb-1">{label}</label>
      <input id={id} {...props} className="w-full px-3 py-2 bg-black/40 rounded-lg font-greycliff text-sm focus:outline-none focus:ring-2 focus:ring-white/20 text-white placeholder-white/50" />
    </div>
);

const FormTextarea: React.FC<React.TextareaHTMLAttributes<HTMLTextAreaElement> & { label: string }> = ({ label, id, ...props }) => (
    <div>
      <label htmlFor={id} className="block text-sm font-greycliff text-white/70 mb-1">{label}</label>
      <textarea id={id} {...props} rows={2} className="w-full px-3 py-2 bg-black/40 rounded-lg font-greycliff text-sm focus:outline-none focus:ring-2 focus:ring-white/20 text-white placeholder-white/50" />
    </div>
);


const StatusBadge: React.FC<{ status: TrainingStatus }> = ({ status }) => {
    const statusStyles = {
        [TrainingStatus.SUCCESS]: 'bg-green-500/20 text-green-400 border-green-500/30',
        [TrainingStatus.PROCESSING]: 'bg-blue-500/20 text-blue-400 border-blue-500/30 animate-pulse',
        [TrainingStatus.FAILURE]: 'bg-red-500/20 text-red-400 border-red-500/30',
    };
    return (
        <span className={`px-2 py-1 text-xs font-greycliff rounded-full border capitalize ${statusStyles[status]}`}>
            {status}
        </span>
    );
};

const DashboardStatCard: React.FC<{ icon: string; label: string; value: string | number; color: string; }> = ({ icon, label, value, color }) => (
  <div className="bg-white/5 p-6 rounded-lg border border-white/10 flex items-center space-x-4">
    <div className={`w-12 h-12 rounded-full flex items-center justify-center shrink-0 ${color}`}>
      <i className={`${icon} text-2xl`}></i>
    </div>
    <div>
      <p className="text-white/70 font-greycliff text-sm">{label}</p>
      <p className="text-white font-argent text-3xl">{value}</p>
    </div>
  </div>
);

// Sorting Config Interface
interface SortConfig<T> {
    key: keyof T | null;
    direction: 'asc' | 'desc';
}

const SortIndicator = ({ active, direction }: { active: boolean, direction: 'asc' | 'desc' }) => {
    if (!active) return <i className="ri-expand-up-down-line ml-1 opacity-20"></i>;
    return direction === 'asc' 
        ? <i className="ri-arrow-up-s-line ml-1 text-cyan-400"></i> 
        : <i className="ri-arrow-down-s-line ml-1 text-cyan-400"></i>;
};

export const MLBuilderSection: React.FC<MLBuilderSectionProps> = ({ addNotification }) => {
    const { state, dispatch } = useStore();
    const { currentUser } = state;

    // View management state
    const [view, setView] = useState<'list' | 'create' | 'details'>('list');
    
    // List view state
    const [trainingRuns, setTrainingRuns] = useState<TrainingRun[]>([]);
    const [searchTerm, setSearchTerm] = useState('');
    const [statusFilter, setStatusFilter] = useState('all');
    const [runsCurrentPage, setRunsCurrentPage] = useState(1);
    const [runsItemsPerPage, setRunsItemsPerPage] = useState(5);
    const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
    const [runToDelete, setRunToDelete] = useState<TrainingRun | null>(null);
    const [isDeleting, setIsDeleting] = useState(false);
    const [runsSort, setRunsSort] = useState<SortConfig<TrainingRun>>({ key: 'createdAt', direction: 'desc' });

    // Create view state
    const [histogramOption, setHistogramOption] = useState<EChartsOption | null>(null);
    const [uploadedFile, setUploadedFile] = useState<File | null>(null);
    const [datasetId, setDatasetId] = useState<string | null>(null);
    const [isTraining, setIsTraining] = useState(false);
    const [mlTaskType, setMlTaskType] = useState<'prediction' | 'classification'>('prediction');
    const [activityRange, setActivityRange] = useState('');
    const [runName, setRunName] = useState('');
    const [runDescription, setRunDescription] = useState('');


    // Details view state
    const [selectedRunDetails, setSelectedRunDetails] = useState<TrainingRun | null>(null);
    const [algorithmResults, setAlgorithmResults] = useState<AlgorithmResult[]>([]);
    const [predictionPoints, setPredictionPoints] = useState<PredictionPoint[]>([]);
    const [selectedAlgorithm, setSelectedAlgorithm] = useState<AlgorithmResult | null>(null);
    const [allPredictions, setAllPredictions] = useState<{ [key: string]: any[] }>({});
    const [modelInfo, setModelInfo] = useState<ModelInfo | null>(null);
    const [trainingRunIdForSave, setTrainingRunIdForSave] = useState<string | null>(null);
    const [isSaveModalOpen, setIsSaveModalOpen] = useState(false);
    const [modelToSave, setModelToSave] = useState<AlgorithmResult | null>(null);
    const [predsCurrentPage, setPredsCurrentPage] = useState(1);
    const [predsItemsPerPage, setPredsItemsPerPage] = useState(10);
    const [isEcStatLoaded, setIsEcStatLoaded] = useState(typeof ecStat !== 'undefined');
    const [resultsSort, setResultsSort] = useState<SortConfig<AlgorithmResult>>({ key: 'algorithm', direction: 'asc' });
    const [predsSort, setPredsSort] = useState<SortConfig<PredictionPoint>>({ key: 'smiles', direction: 'asc' });

     useEffect(() => {
        if (isEcStatLoaded) return;
        const timer = setInterval(() => {
            if (typeof ecStat !== 'undefined') {
                setIsEcStatLoaded(true);
                clearInterval(timer);
            }
        }, 100);
        return () => clearInterval(timer);
    }, [isEcStatLoaded]);


    useEffect(() => {
        const fetchRuns = async () => {
            dispatch({ type: 'SET_LOADING', payload: true });
            try {
                const runsData = await api.get('/ml/training/runs');
                const mappedRuns = (Array.isArray(runsData) ? runsData : [])
                    .map(run => mapApiTrainingRunToTrainingRun(run, currentUser));
                setTrainingRuns(mappedRuns);
            } catch (error) {
                addNotification(error instanceof Error ? error.message : 'Failed to fetch training runs.', NotificationType.ERROR);
            } finally {
                dispatch({ type: 'SET_LOADING', payload: false });
            }
        };
        if (view === 'list') {
            fetchRuns();
        }
    }, [view, dispatch, addNotification, currentUser]);

    // Sorting Helper
    const sortData = <T,>(data: T[], config: SortConfig<T>) => {
        if (!config.key) return data;
        return [...data].sort((a, b) => {
            const valA = a[config.key!];
            const valB = b[config.key!];
            if (valA === valB) return 0;
            if (valA === null || valA === undefined) return 1;
            if (valB === null || valB === undefined) return -1;

            const comparison = valA < valB ? -1 : 1;
            return config.direction === 'asc' ? comparison : -comparison;
        });
    };

    const toggleSort = <T,>(config: SortConfig<T>, setConfig: React.Dispatch<React.SetStateAction<SortConfig<T>>>, key: keyof T) => {
        if (config.key === key) {
            setConfig({ key, direction: config.direction === 'asc' ? 'desc' : 'asc' });
        } else {
            setConfig({ key, direction: 'asc' });
        }
    };

    // Derived state for list view
    const dashboardStats = useMemo(() => {
        const totalRuns = trainingRuns.length;
        const successfulRuns = trainingRuns.filter(run => run.status === TrainingStatus.SUCCESS);
        return {
            totalRuns,
            successfulRuns: successfulRuns.length,
            processingRuns: trainingRuns.filter(run => run.status === TrainingStatus.PROCESSING).length,
        };
    }, [trainingRuns]);

    const filteredRuns = useMemo(() => {
        const filtered = trainingRuns.filter(run => {
            const matchesSearch = run.name.toLowerCase().includes(searchTerm.toLowerCase());
            const matchesStatus = statusFilter === 'all' || run.status === statusFilter;
            return matchesSearch && matchesStatus;
        });
        return sortData(filtered, runsSort);
    }, [trainingRuns, searchTerm, statusFilter, runsSort]);

    useEffect(() => { setRunsCurrentPage(1); }, [searchTerm, statusFilter, runsItemsPerPage]);
    
    const runsTotalPages = Math.ceil(filteredRuns.length / runsItemsPerPage);
    const paginatedRuns = useMemo(() =>
        filteredRuns.slice((runsCurrentPage - 1) * runsItemsPerPage, runsCurrentPage * runsItemsPerPage),
        [filteredRuns, runsCurrentPage, runsItemsPerPage]
    );

    const handleViewDetails = async (run: TrainingRun) => {
        if (run.status !== TrainingStatus.SUCCESS) return;
        dispatch({ type: 'SET_LOADING', payload: true });
        try {
            const response = await api.get(`/ml/training/runs/${run.id}`);
            
            const detailedRun = mapApiTrainingRunToTrainingRun(response.runDetails, currentUser);
            
            const mappedAlgorithmResults = (response.algorithmResults || []).map((res: any): AlgorithmResult => ({
                ...res,
                algorithm: res.best_params?.model_name || res.algorithm,
            }));

            const results = {
                algorithmResults: mappedAlgorithmResults,
                allPredictions: response.allPredictions || {},
                modelInfo: response.modelInfo ? {
                    fingerprintUsed: response.modelInfo.fingerprintUsed || 'N/A',
                    normalization: response.modelInfo.normalization || 'N/A',
                    descriptorUsed: response.modelInfo.descriptorUsed || 'N/A',
                    outlierRanges: response.modelInfo.outlierRanges || 'N/A',
                    activityRange: response.modelInfo.activityRange !== undefined && response.modelInfo.activityRange !== null ? Number(response.modelInfo.activityRange) : null,
                } : null
            };
            
            const firstAlgorithm = results.algorithmResults.length > 0 ? results.algorithmResults[0] : null;
            
            const initialPredictionsData = firstAlgorithm ? results.allPredictions[firstAlgorithm.id] : [];
            const initialPredictions = (initialPredictionsData || []).map((pred: any, index: number) => ({
                id: `${firstAlgorithm?.id}-${index}`,
                smiles: pred.smiles || 'N/A',
                actual: Number(pred.actual),
                predicted: Number(pred.predicted),
            })).filter((p: any) => !isNaN(p.actual) && !isNaN(p.predicted));
    
            setAlgorithmResults(results.algorithmResults);
            setAllPredictions(results.allPredictions);
            setModelInfo(results.modelInfo);
            setTrainingRunIdForSave(detailedRun.id);
            setSelectedAlgorithm(firstAlgorithm);
            setPredictionPoints(initialPredictions);
            setSelectedRunDetails(detailedRun);
            
            setView('details');
        } catch (error) {
            addNotification(error instanceof Error ? error.message : 'Failed to fetch run details.', NotificationType.ERROR);
        } finally {
            dispatch({ type: 'SET_LOADING', payload: false });
        }
    };
    
    const openDeleteModal = (run: TrainingRun) => {
        setRunToDelete(run);
        setIsDeleteModalOpen(true);
    };

    const handleConfirmDelete = async () => {
        if (!runToDelete) return;
    
        setIsDeleting(true);
        try {
            await api.delete(`/ml/training/runs/${runToDelete.id}`);
            addNotification('Training run deleted successfully.', NotificationType.SUCCESS);
            setTrainingRuns(prevRuns => prevRuns.filter(run => run.id !== runToDelete.id));
            setIsDeleteModalOpen(false);
        } catch (error) {
            addNotification(error instanceof Error ? error.message : 'Failed to delete training run.', NotificationType.ERROR);
            setIsDeleteModalOpen(false);
        } finally {
            setIsDeleting(false);
            setRunToDelete(null);
        }
    };

    const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (!file) return;
        if (!file.name.toLowerCase().endsWith('.csv')) {
            addNotification('Please upload a valid CSV file.', NotificationType.ERROR);
            event.target.value = '';
            return;
        }

        dispatch({ type: 'SET_LOADING', payload: true });
        setUploadedFile(file);
        setHistogramOption(null);

        const formData = new FormData();
        formData.append('file', file);

        try {
            const response = await api.post('/ml/datasets/upload', formData);
            setDatasetId(response.datasetId);
            addNotification(`Dataset "${response.fileName}" analyzed successfully.`, NotificationType.SUCCESS);
            
            const analysis = response.analysis;
            const chartData = analysis.distribution.map((b: { range: string; count: number }) => ({
                name: b.range,
                value: b.count,
            }));

            setHistogramOption({
                backgroundColor: 'transparent',
                title: {
                    text: `Distribution of pIC50`,
                    subtext: `File: ${file.name}`,
                    left: 'center',
                    textStyle: { color: 'rgba(255, 255, 255, 0.9)', fontFamily: 'Greycliff CF', fontSize: 18 },
                    subtextStyle: { color: 'rgba(255, 255, 255, 0.7)', fontFamily: 'Greycliff CF' }
                },
                tooltip: {
                    trigger: 'axis',
                    axisPointer: { type: 'shadow' }
                },
                grid: { left: '3%', right: '4%', bottom: '3%', containLabel: true },
                xAxis: [{
                    type: 'category',
                    data: chartData.map((d: any) => d.name),
                    axisTick: { alignWithLabel: true },
                    axisLabel: { color: 'rgba(255,255,255,0.7)' }
                }],
                yAxis: [{
                    type: 'value',
                    name: 'Frequency',
                    nameTextStyle: { color: 'rgba(255,255,255,0.7)' },
                    axisLabel: { color: 'rgba(255,255,255,0.7)' },
                    splitLine: { lineStyle: { color: 'rgba(255,255,255,0.1)' } }
                }],
                series: [{
                    name: 'Frequency',
                    type: 'bar',
                    barWidth: '60%',
                    data: chartData.map((d: any) => d.value),
                    itemStyle: { color: '#3b82f6' }
                }]
            });

        } catch (error) {
            addNotification(error instanceof Error ? error.message : 'Failed to process dataset.', NotificationType.ERROR);
        } finally {
            dispatch({ type: 'SET_LOADING', payload: false });
            event.target.value = '';
        }
    };
    
    const removeUploadedFile = () => {
        setUploadedFile(null);
        setDatasetId(null);
        setHistogramOption(null);
    };

    const handleDownloadSampleCsv = () => {
        const csvContent = "smiles,pIC50\nCN1C=NC2=C1C(=O)N(C(=O)N2C)C,7.5\nCC(=O)OC1=CC=CC=C1C(=O)O,5.2\nCC(=O)NC1=CC=C(C=C1)O,4.8\nCC(C)CC1=CC=C(C=C1)C(C)C(=O)O,6.1";
        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.setAttribute("href", url);
        link.setAttribute("download", "training_sample.csv");
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    const handleStartTraining = async () => {
        if (!datasetId) {
            addNotification('Dataset not processed correctly. Please re-upload.', NotificationType.ERROR);
            return;
        }
        if (!runName.trim()) {
            addNotification('Please provide a name for the training run.', NotificationType.ERROR);
            return;
        }

        setIsTraining(true);
        try {
            const payload = {
                runName,
                runDescription,
                datasetId,
                taskType: mlTaskType,
                activityRange: mlTaskType === 'classification' ? activityRange : null,
            };
            const newApiRun = await api.post('/ml/training/start', payload);
            const newRun = mapApiTrainingRunToTrainingRun(newApiRun, currentUser);

            addNotification(`Training initialized for "${newRun.name}".`, NotificationType.SUCCESS);
            setTrainingRuns(prev => [newRun, ...prev]);

            setView('list');
            // Reset create view state
            setDatasetId(null);
            setUploadedFile(null);
            setHistogramOption(null);
            setRunName('');
            setRunDescription('');

        } catch (error) {
            addNotification(error instanceof Error ? error.message : 'Failed to start training.', NotificationType.ERROR);
        } finally {
            setIsTraining(false);
        }
    };


    const handleOpenSaveModal = (model: AlgorithmResult) => {
        setModelToSave(model);
        setIsSaveModalOpen(true);
    };
    
    const handleSaveModel = async (name: string, description: string) => {
        if (!modelToSave || !trainingRunIdForSave) {
             addNotification('Could not save model. Context is missing.', NotificationType.ERROR);
             return;
        }
        dispatch({ type: 'SET_LOADING', payload: true });
        try {
            const payload = {
                trainingRunId: trainingRunIdForSave,
                algorithmId: modelToSave.id,
                modelName: name,
                modelDescription: description
            };
            const newApiModel = await api.post('/ml/models/save', payload);
            const newSavedModel = mapApiSavedModelToSavedModel(newApiModel);

            dispatch({ type: 'ADD_SAVED_MODEL', payload: newSavedModel });
            addNotification(`Model "${name}" saved successfully.`, NotificationType.SUCCESS);
            setIsSaveModalOpen(false);
            setModelToSave(null);
        } catch (error) {
            addNotification(error instanceof Error ? error.message : 'Failed to save model.', NotificationType.ERROR);
        } finally {
            dispatch({ type: 'SET_LOADING', payload: false });
        }
    };

    useEffect(() => {
        if (!selectedAlgorithm || !allPredictions) { setPredictionPoints([]); return; }
        const predictionsData = allPredictions[selectedAlgorithm.id];
        if (!predictionsData || !Array.isArray(predictionsData)) { setPredictionPoints([]); return; }
        const newPredictions = predictionsData.map((pred: any, index: number) => ({
            id: `${selectedAlgorithm.id}-${index}`,
            smiles: pred.smiles || 'N/A',
            actual: Number(pred.actual),
            predicted: Number(pred.predicted),
        })).filter(p => !isNaN(p.actual) && !isNaN(p.predicted));
        setPredictionPoints(newPredictions);
    }, [selectedAlgorithm, allPredictions]);
    
    const sortedAlgorithmResults = useMemo(() => sortData(algorithmResults, resultsSort), [algorithmResults, resultsSort]);
    
    const sortedPredictions = useMemo(() => sortData(predictionPoints, predsSort), [predictionPoints, predsSort]);
    const predsTotalPages = Math.ceil(sortedPredictions.length / predsItemsPerPage);
    const paginatedPredictionResults = useMemo(() =>
        sortedPredictions.slice((predsCurrentPage - 1) * predsItemsPerPage, predsCurrentPage * predsItemsPerPage),
        [sortedPredictions, predsCurrentPage, predsItemsPerPage]
    );

    const scatterPlotOption: EChartsOption = useMemo(() => {
        if (!isEcStatLoaded || !selectedAlgorithm || predictionPoints.length === 0) {
            return {
                title: { text: 'Predicted vs. Actual', subtext: selectedAlgorithm ? `Model: ${selectedAlgorithm.algorithm}` : 'No model selected', left: 'center', textStyle: { color: 'rgba(255, 255, 255, 0.9)' } },
                graphic: { type: 'text', left: 'center', top: 'center', style: { text: predictionPoints.length === 0 ? 'No prediction data.' : 'Select a model.', fill: 'rgba(255,255,255,0.7)' } },
            };
        }
        const data = predictionPoints.map(p => [p.actual, p.predicted]);
        const regression = ecStat.regression('linear', data);
        const regressionLine = regression.points.sort((a: number[], b: number[]) => a[0] - b[0]);
        const r2Value = selectedAlgorithm?.r2 !== null && typeof selectedAlgorithm?.r2 !== 'undefined' ? ` | R² = ${selectedAlgorithm.r2.toFixed(2)}` : '';
        return {
            title: { text: 'Predicted vs. Actual Values', subtext: `Model: ${selectedAlgorithm.algorithm}${r2Value}`, left: 'center', textStyle: { color: 'rgba(255, 255, 255, 0.9)' } },
            tooltip: { trigger: 'axis', axisPointer: { type: 'cross' } },
            grid: { left: '3%', right: '7%', bottom: '3%', containLabel: true },
            xAxis: { type: 'value', name: 'Actual', splitLine: { show: false }, axisLabel: { color: 'rgba(255,255,255,0.7)' } },
            yAxis: { type: 'value', name: 'Predicted', splitLine: { lineStyle: { color: 'rgba(255,255,255,0.1)' } }, axisLabel: { color: 'rgba(255,255,255,0.7)' } },
            series: [
                { name: 'Data', type: 'scatter', data: data, symbolSize: 5, itemStyle: { color: 'rgba(59, 130, 246, 0.5)' } },
                { name: 'Trendline', type: 'line', data: regressionLine, showSymbol: false, lineStyle: { color: '#ff7f0e', width: 2 } }
            ]
        };
    }, [isEcStatLoaded, selectedAlgorithm, predictionPoints]);

    const confusionMatrixOption: EChartsOption = useMemo(() => {
        if (view !== 'details' || !selectedRunDetails || selectedRunDetails.taskType !== 'Classification' || !selectedAlgorithm || !modelInfo) {
            return { title: { text: 'Confusion Matrix' }, graphic: { type: 'text', left: 'center', top: 'center', style: { text: 'Loading data...', fill: 'rgba(255,255,255,0.7)' } } };
        }
        
        let threshold: number = NaN;
        if (modelInfo?.activityRange !== null && typeof modelInfo.activityRange !== 'undefined' && !isNaN(modelInfo.activityRange)) {
            threshold = modelInfo.activityRange;
        } else if (modelInfo?.outlierRanges) {
            const rangeStr = modelInfo.outlierRanges;
            if (!isNaN(Number(rangeStr))) {
                threshold = Number(rangeStr);
            } else {
                const match = rangeStr.match(/[><=]\s*(\d+\.?\d*)/);
                if (match && match[1]) {
                    threshold = parseFloat(match[1]);
                }
            }
        }
        
        if (isNaN(threshold)) {
             return { title: { text: 'Confusion Matrix' }, graphic: { type: 'text', left: 'center', top: 'center', style: { text: 'Invalid activity threshold in model info.', fill: 'rgba(255,255,255,0.7)' } } };
        }

        let tp = 0, tn = 0, fp = 0, fn = 0;

        predictionPoints.forEach(point => {
            const actualClass = point.actual >= threshold ? 1 : 0; // 1: Active, 0: Inactive
            const predictedClass = Math.round(point.predicted);

            if (actualClass === 1 && predictedClass === 1) tp++;
            else if (actualClass === 0 && predictedClass === 0) tn++;
            else if (actualClass === 0 && predictedClass === 1) fp++;
            else if (actualClass === 1 && predictedClass === 0) fn++;
        });
        
        const accuracy = selectedAlgorithm.accuracy !== null && typeof selectedAlgorithm.accuracy !== 'undefined' ? selectedAlgorithm.accuracy.toFixed(2) : 'N/A';
        const matrixData = [
            [0, 0, tn], // Pred Inactive, Actual Inactive
            [1, 0, fp], // Pred Active,   Actual Inactive
            [0, 1, fn], // Pred Inactive, Actual Active
            [1, 1, tp], // Pred Active,   Actual Active
        ];
        
        return {
            title: {
                text: 'Confusion Matrix',
                subtext: `Model: ${selectedAlgorithm.algorithm} | Accuracy = ${accuracy}`,
                left: 'center',
                textStyle: { color: 'rgba(255, 255, 255, 0.9)', fontFamily: 'Greycliff CF' },
                subtextStyle: { color: 'rgba(255, 255, 255, 0.7)', fontFamily: 'Greycliff CF' }
            },
            tooltip: {
                position: 'top',
                 formatter: (params: any) => {
                    const labels = [
                        ['True Negative', 'False Positive'],
                        ['False Negative', 'True Positive']
                    ];
                    const label = labels[params.value[1]][params.value[0]];
                    return `${label}: ${params.value[2]}`;
                }
            },
            grid: { top: '20%', left: '30%', right: '30%', bottom: '20%', containLabel: true },
            xAxis: {
                type: 'category',
                data: ['Inactive', 'Active'],
                name: 'Predicted Class',
                nameLocation: 'center', nameGap: 30, nameTextStyle: { color: 'rgba(255,255,255,0.7)' },
                splitArea: { show: true }, axisLabel: { color: 'rgba(255,255,255,0.7)' }
            },
            yAxis: {
                type: 'category',
                data: ['Inactive', 'Active'],
                name: 'Actual Class',
                nameLocation: 'center', nameGap: 40, nameTextStyle: { color: 'rgba(255,255,255,0.7)' },
                splitArea: { show: true }, axisLabel: { color: 'rgba(255,255,255,0.7)' }
            },
            visualMap: {
                min: 0,
                max: Math.max(...matrixData.map(d => d[2]), 1),
                calculable: true,
                orient: 'horizontal',
                left: 'center',
                bottom: '5%',
                inRange: { color: ['#1E40AF', '#60A5FA'] },
                textStyle: { color: 'rgba(255,255,255,0.7)' }
            },
            series: [{
                name: 'Confusion Matrix',
                type: 'heatmap',
                data: matrixData,
                label: { show: true, color: '#fff', fontSize: 24, fontWeight: 'bold' },
                emphasis: { itemStyle: { shadowBlur: 10, shadowColor: 'rgba(0, 0, 0, 0.5)' } }
            }]
        };

    }, [view, selectedRunDetails, selectedAlgorithm, modelInfo, predictionPoints]);
    
    // RENDER LOGIC
    if (view === 'create') {
        return (
            <section className="min-h-screen py-24 bg-black">
                <div className="container mx-auto px-6">
                     <div className="flex justify-between items-center mb-8">
                        <h2 className="text-4xl font-argent">Create New Model Run</h2>
                         <button onClick={() => setView('list')} className="font-greycliff text-sm text-white/70 hover:text-white transition flex items-center gap-2">
                             Back to Training Runs <i className="ri-arrow-right-line"></i>
                        </button>
                    </div>

                    <div className="grid grid-cols-1 lg:grid-cols-5 gap-8">
                        {/* Left Column: Controls */}
                        <div className="lg:col-span-2 bg-gray-900 p-6 rounded-xl border border-white/10">
                            <div className="space-y-6">
                                <FormInput label="Project Title" type="text" value={runName} onChange={(e) => setRunName(e.target.value)} required placeholder="e.g., Kinase Inhibitor Prediction"/>
                                <FormTextarea label="Project Description" value={runDescription} onChange={(e) => setRunDescription(e.target.value)} placeholder="Briefly describe the project's goal..." />
                                
                                <div>
                                    <div className="flex justify-between items-center mb-2">
                                        <label className="text-sm font-greycliff text-white/70">DATASET</label>
                                    </div>
                                    {!uploadedFile ? (
                                        <>
                                            <div className="relative border-2 border-white/10 border-dashed rounded-lg p-6 flex flex-col items-center justify-center text-center group hover:border-cyan-400/50 transition-colors">
                                                <i className="ri-upload-cloud-2-line text-3xl text-white/50 mb-2 group-hover:text-cyan-400 transition-colors"></i>
                                                <span className="font-greycliff text-sm text-white/80">Upload CSV</span>
                                                <input type="file" accept=".csv" className="absolute inset-0 w-full h-full opacity-0 cursor-pointer" onChange={handleFileChange} />
                                            </div>
                                            <div className="flex justify-center mt-2">
                                                <button 
                                                    onClick={handleDownloadSampleCsv} 
                                                    className="text-[10px] font-bold uppercase tracking-widest text-cyan-400 hover:text-cyan-300 transition-colors flex items-center gap-1"
                                                >
                                                    <i className="ri-download-line text-xs"></i>
                                                    Download Training Sample
                                                </button>
                                            </div>
                                        </>
                                    ) : (
                                        <div className="bg-gray-800 rounded-lg p-3 flex items-center justify-between animate-fade-in">
                                            <div className="flex items-center gap-3 overflow-hidden">
                                                <i className="ri-file-text-line text-cyan-400 text-xl"></i>
                                                <div className="text-sm">
                                                    <p className="font-greycliff text-white truncate">{uploadedFile.name}</p>
                                                    <p className="text-xs text-white/60">{`${(uploadedFile.size / 1024).toFixed(2)} KB`}</p>
                                                </div>
                                            </div>
                                            <button onClick={removeUploadedFile} className="p-1 rounded-full hover:bg-white/20 text-white/70 hover:text-white">
                                                <i className="ri-close-line"></i>
                                            </button>
                                        </div>
                                    )}
                                </div>

                                <div>
                                    <label className="block text-sm font-greycliff text-white/70 mb-2">Select Task Type</label>
                                    <div className="grid grid-cols-2 gap-4">
                                        <button type="button" onClick={() => setMlTaskType('prediction')} className={`p-4 rounded-lg text-left transition-all border-2 ${mlTaskType === 'prediction' ? 'bg-cyan-500/20 border-cyan-400 shadow-lg shadow-cyan-500/10' : 'bg-black/20 border-transparent hover:border-white/20'}`}>
                                            <h5 className="font-greycliff font-bold text-white">Prediction</h5>
                                            <p className="text-xs text-white/60 mt-1">Predict continuous values (e.g., pIC50).</p>
                                        </button>
                                        <button type="button" onClick={() => setMlTaskType('classification')} className={`p-4 rounded-lg text-left transition-all border-2 ${mlTaskType === 'classification' ? 'bg-cyan-500/20 border-cyan-400 shadow-lg shadow-cyan-500/10' : 'bg-black/20 border-transparent hover:border-white/20'}`}>
                                            <h5 className="font-greycliff font-bold text-white">Classification</h5>
                                            <p className="text-xs text-white/60 mt-1">Categorize as active/inactive.</p>
                                        </button>
                                    </div>
                                    {mlTaskType === 'classification' && (
                                        <div className="mt-4 animate-fade-in">
                                            <FormInput label="Activity Range" type="text" value={activityRange} onChange={(e) => setActivityRange(e.target.value)} placeholder="e.g., > 6.5 active, < 5.0 inactive" />
                                        </div>
                                    )}
                                </div>

                                <button 
                                    onClick={handleStartTraining} 
                                    disabled={isTraining || !datasetId || !runName} 
                                    className="w-full mt-4 py-3 font-greycliff text-lg !rounded-button flex items-center justify-center gap-3 transition-all duration-300 ease-in-out bg-gradient-to-r from-cyan-500 to-blue-500 text-white shadow-lg shadow-cyan-500/20 hover:shadow-xl hover:shadow-cyan-500/40 hover:-translate-y-px disabled:opacity-50 disabled:cursor-not-allowed"
                                >
                                    <i className="ri-notification-3-line"></i>
                                    {isTraining ? 'Initializing...' : 'Initialize Training Run'}
                                </button>
                            </div>
                        </div>

                        {/* Right Column: Chart */}
                        <div className="lg:col-span-3 bg-black p-6 rounded-xl border border-white/10 flex items-center justify-center min-h-[400px]">
                            {histogramOption ? (
                                <EChartComponent option={histogramOption} style={{ width: '100%', height: '100%' }} />
                            ) : (
                                <div className="text-center">
                                    <i className="ri-bar-chart-2-line text-5xl text-white/30 mb-4"></i>
                                    <p className="font-greycliff text-white/50">Upload a dataset to see the<br/>feature distribution analysis.</p>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </section>
        );
    }
    
    if (view === 'details' && selectedRunDetails) {
        return (
             <section className="min-h-screen py-24 bg-black">
                <div className="container mx-auto px-6">
                    <button onClick={() => setView('list')} className="mb-8 font-greycliff text-sm text-white/70 hover:text-white transition flex items-center gap-2">
                        <i className="ri-arrow-left-line"></i> Back to Training Runs
                    </button>
                    <div className="bg-white/5 p-8 rounded-lg mb-8">
                        <h2 className="text-3xl font-argent mb-2">Results for "{selectedRunDetails.name}"</h2>
                        <p className="font-greycliff text-sm text-white/70">Dataset: {selectedRunDetails.datasetName} | Generated: {selectedRunDetails.createdAt}</p>
                    </div>

                    <div className="grid grid-cols-1 xl:grid-cols-2 gap-8 mb-8">
                        {/* Left side: Performance Table */}
                        <div className="bg-white/5 p-6 rounded-lg">
                            <h3 className="font-greycliff text-xl mb-4">Algorithm Comparison</h3>
                            <div className="overflow-auto max-h-[465px] relative border border-white/10 rounded-lg">
                                <table className="w-full text-sm text-left table-fixed">
                                    {selectedRunDetails.taskType === 'Prediction' ? (
                                        <>
                                            <thead className="bg-gray-800 sticky top-0 z-10">
                                                <tr>
                                                    <th className="p-3 font-greycliff w-[30%] cursor-pointer hover:text-white transition-colors" onClick={() => toggleSort(resultsSort, setResultsSort, 'algorithm')}>
                                                        Algorithm <SortIndicator active={resultsSort.key === 'algorithm'} direction={resultsSort.direction} />
                                                    </th>
                                                    <th className="p-3 font-greycliff text-right cursor-pointer hover:text-white transition-colors" onClick={() => toggleSort(resultsSort, setResultsSort, 'r2')}>
                                                        R² <SortIndicator active={resultsSort.key === 'r2'} direction={resultsSort.direction} />
                                                    </th>
                                                    <th className="p-3 font-greycliff text-right cursor-pointer hover:text-white transition-colors" onClick={() => toggleSort(resultsSort, setResultsSort, 'mse')}>
                                                        MSE <SortIndicator active={resultsSort.key === 'mse'} direction={resultsSort.direction} />
                                                    </th>
                                                    <th className="p-3 font-greycliff text-right cursor-pointer hover:text-white transition-colors" onClick={() => toggleSort(resultsSort, setResultsSort, 'mae')}>
                                                        MAE <SortIndicator active={resultsSort.key === 'mae'} direction={resultsSort.direction} />
                                                    </th>
                                                    <th className="p-3 font-greycliff text-right cursor-pointer hover:text-white transition-colors" onClick={() => toggleSort(resultsSort, setResultsSort, 'rmse')}>
                                                        RMSE <SortIndicator active={resultsSort.key === 'rmse'} direction={resultsSort.direction} />
                                                    </th>
                                                    <th className="p-3 font-greycliff text-center">Save</th>
                                                </tr>
                                            </thead>
                                            <tbody>
                                                {sortedAlgorithmResults.map(result => (
                                                    <tr key={result.id} className={`border-b border-white/10 hover:bg-white/20 cursor-pointer ${selectedAlgorithm?.id === result.id ? 'bg-white/15' : ''}`} onClick={() => setSelectedAlgorithm(result)}>
                                                        <td className="p-3 font-greycliff text-white">{result.algorithm}</td>
                                                        <td className="p-3 font-greycliff text-right">{result.r2?.toFixed(2) ?? 'N/A'}</td>
                                                        <td className="p-3 font-greycliff text-right">{result.mse?.toFixed(2) ?? 'N/A'}</td>
                                                        <td className="p-3 font-greycliff text-right">{result.mae?.toFixed(2) ?? 'N/A'}</td>
                                                        <td className="p-3 font-greycliff text-right">{result.rmse?.toFixed(2) ?? 'N/A'}</td>
                                                        <td className="p-3 text-center">
                                                          <button onClick={(e) => { e.stopPropagation(); handleOpenSaveModal(result); }} className="p-1 text-white/70 hover:text-white transition"><i className="ri-save-line text-base"></i></button>
                                                        </td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </>
                                    ) : ( // Classification
                                        <>
                                            <thead className="bg-gray-800 sticky top-0 z-10">
                                                <tr>
                                                    <th className="p-3 font-greycliff w-[25%] cursor-pointer hover:text-white transition-colors" onClick={() => toggleSort(resultsSort, setResultsSort, 'algorithm')}>
                                                        Algorithm <SortIndicator active={resultsSort.key === 'algorithm'} direction={resultsSort.direction} />
                                                    </th>
                                                    <th className="p-3 font-greycliff text-right cursor-pointer hover:text-white transition-colors" onClick={() => toggleSort(resultsSort, setResultsSort, 'accuracy')}>
                                                        Accuracy <SortIndicator active={resultsSort.key === 'accuracy'} direction={resultsSort.direction} />
                                                    </th>
                                                    <th className="p-3 font-greycliff text-right cursor-pointer hover:text-white transition-colors" onClick={() => toggleSort(resultsSort, setResultsSort, 'precision')}>
                                                        Precision <SortIndicator active={resultsSort.key === 'precision'} direction={resultsSort.direction} />
                                                    </th>
                                                    <th className="p-3 font-greycliff text-right cursor-pointer hover:text-white transition-colors" onClick={() => toggleSort(resultsSort, setResultsSort, 'recall')}>
                                                        Recall <SortIndicator active={resultsSort.key === 'recall'} direction={resultsSort.direction} />
                                                    </th>
                                                    <th className="p-3 font-greycliff text-right cursor-pointer hover:text-white transition-colors" onClick={() => toggleSort(resultsSort, setResultsSort, 'f1_score')}>
                                                        F1 <SortIndicator active={resultsSort.key === 'f1_score'} direction={resultsSort.direction} />
                                                    </th>
                                                    <th className="p-3 font-greycliff text-right cursor-pointer hover:text-white transition-colors" onClick={() => toggleSort(resultsSort, setResultsSort, 'roc_auc')}>
                                                        AUC <SortIndicator active={resultsSort.key === 'roc_auc'} direction={resultsSort.direction} />
                                                    </th>
                                                    <th className="p-3 font-greycliff text-center">Save</th>
                                                </tr>
                                            </thead>
                                            <tbody>
                                                {sortedAlgorithmResults.map(result => (
                                                    <tr key={result.id} className={`border-b border-white/10 hover:bg-white/20 cursor-pointer ${selectedAlgorithm?.id === result.id ? 'bg-white/15' : ''}`} onClick={() => setSelectedAlgorithm(result)}>
                                                        <td className="p-3 font-greycliff text-white">{result.algorithm}</td>
                                                        <td className="p-3 font-greycliff text-right">{result.accuracy?.toFixed(2) ?? 'N/A'}</td>
                                                        <td className="p-3 font-greycliff text-right">{result.precision?.toFixed(2) ?? 'N/A'}</td>
                                                        <td className="p-3 font-greycliff text-right">{result.recall?.toFixed(2) ?? 'N/A'}</td>
                                                        <td className="p-3 font-greycliff text-right">{result.f1_score?.toFixed(2) ?? 'N/A'}</td>
                                                        <td className="p-3 font-greycliff text-right">{result.roc_auc?.toFixed(2) ?? 'N/A'}</td>
                                                        <td className="p-3 text-center">
                                                          <button onClick={(e) => { e.stopPropagation(); handleOpenSaveModal(result); }} className="p-1 text-white/70 hover:text-white transition"><i className="ri-save-line text-base"></i></button>
                                                        </td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </>
                                    )}
                                </table>
                            </div>
                        </div>

                        {/* Right side: Scatter Plot or Confusion Matrix */}
                        <div className="bg-white/5 p-6 rounded-lg">
                            {selectedRunDetails.taskType === 'Classification' ? (
                                <EChartComponent option={confusionMatrixOption} style={{ width: '100%', height: '400px' }} />
                            ) : (
                                <EChartComponent option={scatterPlotOption} style={{ width: '100%', height: '400px' }} />
                            )}
                            {modelInfo && selectedAlgorithm && (
                                <div className="mt-4 pt-4 border-t border-white/10 font-greycliff text-sm text-white/70 space-y-1">
                                    <p><span className="font-semibold">Algorithm:</span> {selectedAlgorithm.algorithm}</p>
                                    <p><span className="font-semibold">Fingerprint Used:</span> {modelInfo.fingerprintUsed}</p>
                                    <p><span className="font-semibold">Normalization:</span> {modelInfo.normalization}</p>
                                </div>
                            )}
                        </div>
                    </div>
                    
                    {/* Predictions Table (below the grid) */}
                    <div className="bg-white/5 p-6 rounded-lg">
                        <h3 className="font-greycliff text-xl mb-4">Predictions</h3>
                        <div className="overflow-auto max-h-[360px] relative border border-white/10 rounded-lg">
                             <table className="w-full text-sm text-left table-fixed">
                                 <thead className="bg-gray-800 sticky top-0 z-10">
                                     <tr>
                                         <th className="p-3 font-greycliff w-[50%] cursor-pointer hover:text-white transition-colors" onClick={() => toggleSort(predsSort, setPredsSort, 'smiles')}>
                                            SMILES <SortIndicator active={predsSort.key === 'smiles'} direction={predsSort.direction} />
                                         </th>
                                         <th className="p-3 font-greycliff text-right cursor-pointer hover:text-white transition-colors" onClick={() => toggleSort(predsSort, setPredsSort, 'actual')}>
                                            Actual <SortIndicator active={predsSort.key === 'actual'} direction={predsSort.direction} />
                                         </th>
                                         <th className="p-3 font-greycliff text-right cursor-pointer hover:text-white transition-colors" onClick={() => toggleSort(predsSort, setPredsSort, 'predicted')}>
                                            {selectedRunDetails.taskType === 'Classification' ? 'Predicted Class' : 'Predicted'} <SortIndicator active={predsSort.key === 'predicted'} direction={predsSort.direction} />
                                         </th>
                                     </tr>
                                 </thead>
                                 <tbody>
                                     {paginatedPredictionResults.map((result) => (
                                         <tr key={result.id} className="border-b border-white/10">
                                             <td className="p-3 font-mono text-xs break-all">{result.smiles}</td>
                                             <td className="p-3 font-greycliff text-right">{result.actual.toFixed(2)}</td>
                                             <td className="p-3 font-greycliff text-right">{selectedRunDetails.taskType === 'Classification' ? (Math.round(result.predicted) === 1 ? 'Active' : 'Inactive') : result.predicted.toFixed(2)}</td>
                                         </tr>
                                     ))}
                                 </tbody>
                             </table>
                        </div>
                        <Pagination currentPage={predsCurrentPage} totalPages={predsTotalPages} onPageChange={setPredsCurrentPage} itemsPerPage={predsItemsPerPage} onItemsPerPageChange={setPredsItemsPerPage} totalItems={predictionPoints.length} />
                    </div>
                </div>
                {modelToSave && <SaveModelModal isOpen={isSaveModalOpen} onClose={() => setIsSaveModalOpen(false)} onSave={handleSaveModel} modelAlgorithm={modelToSave.algorithm} />}
            </section>
        );
    }

    return (
        <section id="ml-builder" className="min-h-screen py-24 bg-black">
            <div className="container mx-auto px-6">
                <div className="flex justify-between items-center mb-8">
                    <h2 className="text-4xl font-argent">ML Model Training Runs</h2>
                    <button onClick={() => setView('create')} className="px-6 py-3 font-greycliff !rounded-button flex items-center gap-2 transition-all duration-300 ease-in-out bg-gradient-to-r from-cyan-500 to-blue-500 text-white shadow-lg shadow-cyan-500/20 hover:shadow-xl hover:shadow-cyan-500/40 hover:-translate-y-px">
                        <i className="ri-add-line"></i> Create New Model Run
                    </button>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
                    <DashboardStatCard icon="ri-archive-line" label="Total Training Runs" value={dashboardStats.totalRuns} color="bg-blue-500/30 text-blue-300" />
                    <DashboardStatCard icon="ri-check-double-line" label="Successful Runs" value={dashboardStats.successfulRuns} color="bg-green-500/30 text-green-300" />
                    <DashboardStatCard icon="ri-loader-4-line" label="Processing Runs" value={dashboardStats.processingRuns} color="bg-cyan-500/30 text-cyan-300" />
                </div>
                
                <div className="bg-white/5 p-4 rounded-lg mb-8 flex flex-col md:flex-row gap-4 items-center">
                    <div className="relative flex-grow w-full md:w-auto">
                        <input
                            type="text"
                            placeholder="Search by run name..."
                            className="w-full pl-10 pr-4 py-2 bg-black/40 rounded-lg font-greycliff text-sm focus:outline-none focus:ring-2 focus:ring-white/20 text-white placeholder-white/50"
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            aria-label="Search training runs"
                        />
                        <i className="ri-search-line absolute left-3 top-1/2 -translate-y-1/2 text-white/50"></i>
                    </div>
                    
                    <div className="flex items-center gap-2 w-full md:w-auto">
                        <label htmlFor="status-filter" className="font-greycliff text-sm text-white/70 shrink-0">Status:</label>
                        <select
                            id="status-filter"
                            value={statusFilter}
                            onChange={(e) => setStatusFilter(e.target.value)}
                            className="w-full bg-black/40 rounded-lg font-greycliff text-sm focus:outline-none focus:ring-2 focus:ring-white/20 text-white p-2"
                            aria-label="Filter by status"
                        >
                            <option value="all">All</option>
                            <option value={TrainingStatus.SUCCESS}>Success</option>
                            <option value={TrainingStatus.PROCESSING}>Processing</option>
                            <option value={TrainingStatus.FAILURE}>Failure</option>
                        </select>
                    </div>
                </div>

                <div className="bg-white/5 p-6 rounded-lg">
                    <div className="overflow-auto max-h-[600px] relative border border-white/10 rounded-lg">
                        <table className="w-full text-sm text-left">
                            <thead className="bg-gray-800 sticky top-0 z-10 text-white font-greycliff">
                                <tr>
                                    <th className="p-3 font-greycliff w-[25%] cursor-pointer hover:text-white transition-colors" onClick={() => toggleSort(runsSort, setRunsSort, 'name')}>
                                        Name <SortIndicator active={runsSort.key === 'name'} direction={runsSort.direction} />
                                    </th>
                                    <th className="p-3 font-greycliff w-[20%] cursor-pointer hover:text-white transition-colors" onClick={() => toggleSort(runsSort, setRunsSort, 'datasetName')}>
                                        Dataset <SortIndicator active={runsSort.key === 'datasetName'} direction={runsSort.direction} />
                                    </th>
                                    <th className="p-3 font-greycliff cursor-pointer hover:text-white transition-colors" onClick={() => toggleSort(runsSort, setRunsSort, 'taskType')}>
                                        Task Type <SortIndicator active={runsSort.key === 'taskType'} direction={runsSort.direction} />
                                    </th>
                                    <th className="p-3 font-greycliff cursor-pointer hover:text-white transition-colors" onClick={() => toggleSort(runsSort, setRunsSort, 'createdAt')}>
                                        Created At <SortIndicator active={runsSort.key === 'createdAt'} direction={runsSort.direction} />
                                    </th>
                                    <th className="p-3 font-greycliff cursor-pointer hover:text-white transition-colors" onClick={() => toggleSort(runsSort, setRunsSort, 'createdBy')}>
                                        Created By <SortIndicator active={runsSort.key === 'createdBy'} direction={runsSort.direction} />
                                    </th>
                                    <th className="p-3 font-greycliff text-center cursor-pointer hover:text-white transition-colors" onClick={() => toggleSort(runsSort, setRunsSort, 'status')}>
                                        Status <SortIndicator active={runsSort.key === 'status'} direction={runsSort.direction} />
                                    </th>
                                    <th className="p-3 text-center">Actions</th>
                                </tr>
                            </thead>
                            <tbody>
                                {paginatedRuns.length > 0 ? paginatedRuns.map(run => (
                                    <tr key={run.id} className="border-b border-white/10 hover:bg-white/5 transition-colors">
                                        <td className="p-3 font-greycliff text-white">{run.name}</td>
                                        <td className="p-3 font-greycliff truncate" title={run.datasetName}>{run.datasetName}</td>
                                        <td className="p-3 font-greycliff capitalize">{run.taskType}</td>
                                        <td className="p-3 font-greycliff">{run.createdAt}</td>
                                        <td className="p-3 font-greycliff">{run.createdBy}</td>
                                        <td className="p-3 font-greycliff text-center"><StatusBadge status={run.status} /></td>
                                        <td className="p-3 text-center">
                                            <div className="flex justify-center items-center gap-2">
                                                <button onClick={() => handleViewDetails(run)} disabled={run.status !== TrainingStatus.SUCCESS} className="p-1 text-white/70 hover:text-white disabled:text-white/30 disabled:cursor-not-allowed transition" aria-label="View results"><i className="ri-eye-line"></i></button>
                                                <button onClick={() => openDeleteModal(run)} className="p-1 text-red-500/70 hover:text-red-500 transition" aria-label="Delete run"><i className="ri-delete-bin-line"></i></button>
                                            </div>
                                        </td>
                                    </tr>
                                )) : (
                                    <tr><td colSpan={7} className="p-8 text-center font-greycliff text-white/50">No runs match your search/filter criteria.</td></tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                    <Pagination currentPage={runsCurrentPage} totalPages={runsTotalPages} onPageChange={setRunsCurrentPage} itemsPerPage={runsItemsPerPage} onItemsPerPageChange={setRunsItemsPerPage} totalItems={filteredRuns.length} />
                </div>
            </div>
            <ConfirmationModal
                isOpen={isDeleteModalOpen}
                onClose={() => setIsDeleteModalOpen(false)}
                onConfirm={handleConfirmDelete}
                title="Confirm Deletion"
                message={
                    <p>
                        Are you sure you want to delete the training run{' '}
                        <strong>"{runToDelete?.name}"</strong>? This action cannot be undone.
                    </p>
                }
                confirmText="Delete"
                isConfirming={isDeleting}
            />
        </section>
    );
};
