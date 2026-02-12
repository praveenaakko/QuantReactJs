
import React, { useState, useMemo, useEffect } from 'react';
import { NotificationType, type SavedModel, type PredictionRun, PredictionStatus } from '../types';
import { Pagination } from './Pagination';
import api from '../config/api';
import { useStore } from '../store/store';
import { ConfirmationModal } from './ConfirmationModal';

interface MLPredictorSectionProps {
    addNotification: (message: string, type: NotificationType) => void;
}

interface PredictionResult {
    smiles: string;
    prediction: number;
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

const mapApiSavedModelToSavedModel = (apiModel: any): SavedModel => ({
    id: String(apiModel?.id || ''),
    name: apiModel?.name || 'Unnamed Model',
    modelType: apiModel?.model_type || 'N/A',
    description: apiModel?.description || '',
    performance: apiModel?.performance || 0,
    taskType: apiModel?.task_type === 'prediction' ? 'Prediction' : 'Classification',
    date: apiModel?.date ? formatDate12h(apiModel.date) : 'N/A',
    buildTime: apiModel?.build_time || 0,
});

const mapApiPredictionRunToPredictionRun = (apiRun: any, currentUser: any): PredictionRun => ({
    id: String(apiRun?.id || ''),
    name: apiRun?.name || 'Unnamed Run',
    description: apiRun?.description || '',
    modelName: apiRun?.modelName || 'N/A',
    modelId: String(apiRun?.modelId || ''),
    modelType: apiRun?.modelType || 'N/A',
    modelBuilderName: apiRun?.modelBuilderName || 'N/A',
    inputCount: apiRun?.inputCount || 0,
    createdAt: apiRun?.createdAt ? formatDate12h(apiRun.createdAt) : 'N/A',
    createdBy: apiRun?.createdBy || currentUser?.name || 'Unknown',
    status: (apiRun?.status as PredictionStatus) || PredictionStatus.PROCESSING,
    duration: apiRun?.duration,
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
        <textarea id={id} {...props} className="w-full px-3 py-2 bg-black/40 rounded-lg font-greycliff text-sm focus:outline-none focus:ring-2 focus:ring-white/20 text-white placeholder-white/50" />
    </div>
);

const StatusBadge: React.FC<{ status: PredictionStatus }> = ({ status }) => {
    const statusStyles = {
        [PredictionStatus.SUCCESS]: 'bg-green-500/20 text-green-400 border-green-500/30',
        [PredictionStatus.PROCESSING]: 'bg-blue-500/20 text-blue-400 border-blue-500/30 animate-pulse',
        [PredictionStatus.FAILURE]: 'bg-red-500/20 text-red-400 border-red-500/30',
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

export const MLPredictorSection: React.FC<MLPredictorSectionProps> = ({ addNotification }) => {
    const { state, dispatch } = useStore();
    const { currentUser, savedModels } = state;

    const [view, setView] = useState<'list' | 'create' | 'details'>('list');
    const [predictionRuns, setPredictionRuns] = useState<PredictionRun[]>([]);
    const [searchTerm, setSearchTerm] = useState('');
    const [statusFilter, setStatusFilter] = useState('all');
    const [runsCurrentPage, setRunsCurrentPage] = useState(1);
    const [runsItemsPerPage, setRunsItemsPerPage] = useState(5);
    const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
    const [runToDelete, setRunToDelete] = useState<PredictionRun | null>(null);
    const [isDeleting, setIsDeleting] = useState(false);
    const [runsSort, setRunsSort] = useState<SortConfig<PredictionRun>>({ key: 'createdAt', direction: 'desc' });

    const [selectedModelId, setSelectedModelId] = useState<string | null>(null);
    const [smilesInput, setSmilesInput] = useState('');
    const [csvFile, setCsvFile] = useState<File | null>(null);
    const [runName, setRunName] = useState('');
    const [runDescription, setRunDescription] = useState('');
    const [isPredicting, setIsPredicting] = useState(false);
    const [modelsSort, setModelsSort] = useState<SortConfig<SavedModel>>({ key: 'name', direction: 'asc' });
    const [modelsSearch, setModelsSearch] = useState('');

    const [selectedRunDetails, setSelectedRunDetails] = useState<PredictionRun | null>(null);
    const [currentRunResults, setCurrentRunResults] = useState<PredictionResult[]>([]);
    const [predCurrentPage, setPredCurrentPage] = useState(1);
    const [predItemsPerPage, setPredItemsPerPage] = useState(10);
    const [resultsSort, setResultsSort] = useState<SortConfig<PredictionResult>>({ key: 'smiles', direction: 'asc' });

    useEffect(() => {
        const fetchModels = async () => {
            if (savedModels.length > 0) return;
            dispatch({ type: 'SET_LOADING', payload: true });
            try {
                const modelsData = await api.get('/ml/models');
                const mappedModels = (Array.isArray(modelsData) ? modelsData : []).map(mapApiSavedModelToSavedModel);
                dispatch({ type: 'SET_SAVED_MODELS', payload: mappedModels });
            } catch (error) {
                addNotification(error instanceof Error ? error.message : 'Could not load ML models.', NotificationType.ERROR);
            } finally {
                dispatch({ type: 'SET_LOADING', payload: false });
            }
        };
        const fetchRuns = async () => {
            dispatch({ type: 'SET_LOADING', payload: true });
            try {
                const runsData = await api.get('/ml/predictions');
                const mappedRuns = (Array.isArray(runsData) ? runsData : [])
                    .map(run => mapApiPredictionRunToPredictionRun(run, currentUser));
                setPredictionRuns(mappedRuns);
            } catch (e) {
                addNotification(e instanceof Error ? e.message : 'Could not load prediction runs.', NotificationType.ERROR);
            } finally {
                dispatch({ type: 'SET_LOADING', payload: false });
            }
        };
        fetchModels();
        if (view === 'list') {
            fetchRuns();
        }
    }, [view, savedModels.length, addNotification, dispatch, currentUser]);

    useEffect(() => {
        if (view === 'create' && savedModels.length > 0 && !selectedModelId) {
            setSelectedModelId(savedModels[0].id);
        }
    }, [view, savedModels, selectedModelId]);

    const sortData = <T,>(data: T[], config: SortConfig<T>) => {
        if (!config.key || !data) return data || [];
        return [...data].sort((a, b) => {
            const valA = (a as any)[config.key!];
            const valB = (b as any)[config.key!];
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

    const dashboardStats = useMemo(() => ({
        totalRuns: predictionRuns.length,
        successfulRuns: predictionRuns.filter(r => r.status === PredictionStatus.SUCCESS).length,
        processingRuns: predictionRuns.filter(r => r.status === PredictionStatus.PROCESSING).length,
    }), [predictionRuns]);

    const filteredRuns = useMemo(() => {
        const query = (searchTerm || '').toLowerCase();
        const filtered = predictionRuns.filter(run => {
            const name = (run?.name || '').toLowerCase();
            return name.includes(query) && (statusFilter === 'all' || run.status === statusFilter);
        });
        return sortData(filtered, runsSort);
    }, [predictionRuns, searchTerm, statusFilter, runsSort]);

    useEffect(() => { setRunsCurrentPage(1); }, [searchTerm, statusFilter, runsItemsPerPage]);

    const paginatedRuns = useMemo(() => filteredRuns.slice(
        (runsCurrentPage - 1) * runsItemsPerPage, runsCurrentPage * runsItemsPerPage
    ), [filteredRuns, runsCurrentPage, runsItemsPerPage]);

    const filteredAndSortedModels = useMemo(() => {
        const query = (modelsSearch || '').toLowerCase();
        const filtered = (savedModels || []).filter(m => {
            if (!m) return false;
            const name = (m.name || '').toLowerCase();
            const type = (m.modelType || '').toLowerCase();
            const desc = (m.description || '').toLowerCase();
            return name.includes(query) || type.includes(query) || desc.includes(query);
        });
        return sortData(filtered, modelsSort);
    }, [savedModels, modelsSearch, modelsSort]);

    const selectedModel = useMemo(() => (savedModels || []).find(m => m && m.id === selectedModelId), [savedModels, selectedModelId]);

    const sortedResults = useMemo(() => sortData(currentRunResults, resultsSort), [currentRunResults, resultsSort]);
    const paginatedPredictionResults = useMemo(() => (sortedResults || []).slice(
        (predCurrentPage - 1) * predItemsPerPage, predCurrentPage * predItemsPerPage
    ), [sortedResults, predCurrentPage, predItemsPerPage]);

    const handleViewDetails = async (run: PredictionRun) => {
        if (!run || run.status !== PredictionStatus.SUCCESS) return;
        dispatch({ type: 'SET_LOADING', payload: true });
        try {
            const results = await api.get(`/ml/predictions/${run.id}/results`);
            setCurrentRunResults(Array.isArray(results) ? results : []);
            setSelectedRunDetails(run);
            setView('details');
        } catch (error) {
            addNotification(error instanceof Error ? error.message : 'Failed to fetch prediction results.', NotificationType.ERROR);
        } finally {
            dispatch({ type: 'SET_LOADING', payload: false });
        }
    };

    const openDeleteModal = (run: PredictionRun) => {
        setRunToDelete(run);
        setIsDeleteModalOpen(true);
    };

    const handleConfirmDelete = async () => {
        if (!runToDelete) return;
        setIsDeleting(true);
        try {
            await api.delete(`/ml/predictions/${runToDelete.id}`);
            addNotification('Prediction run deleted successfully.', NotificationType.SUCCESS);
            setPredictionRuns(prevRuns => prevRuns.filter(run => run.id !== runToDelete.id));
            setIsDeleteModalOpen(false);
        } catch (error) {
            addNotification(error instanceof Error ? error.message : 'Failed to delete prediction run.', NotificationType.ERROR);
            setIsDeleteModalOpen(false);
        } finally {
            setIsDeleting(false);
            setRunToDelete(null);
        }
    };

    const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (file) {
            if (!file.name.toLowerCase().endsWith('.csv')) {
                addNotification('Please upload a valid CSV file.', NotificationType.ERROR);
                event.target.value = '';
                return;
            }
            setCsvFile(file);
            setSmilesInput('');
        }
    };

    const handleDownloadSampleCsv = () => {
        const csvContent = "smiles\nCN1C=NC2=C1C(=O)N(C(=O)N2C)C\nCC(=O)OC1=CC=CC=C1C(=O)O\nCC(=O)NC1=CC=C(C=C1)O\nCC(C)CC1=CC=C(C=C1)C(C)C(=O)O";
        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.setAttribute("href", url);
        link.setAttribute("download", "sample_smiles.csv");
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    const handlePredict = async () => {
        if (!selectedModel) {
            addNotification('Please select a model.', NotificationType.ERROR);
            return;
        }
        if (!runName.trim()) {
            addNotification('Please provide a name for the prediction run.', NotificationType.ERROR);
            return;
        }
        const smilesList = smilesInput.split(/[\s,]+/).filter(s => s.trim() !== '');
        if (smilesList.length === 0 && !csvFile) {
            addNotification('Please provide SMILES input or a CSV file.', NotificationType.ERROR);
            return;
        }

        setIsPredicting(true);
        const formData = new FormData();
        formData.append('modelId', selectedModel.id);
        formData.append('runName', runName);
        formData.append('runDescription', runDescription);
        if (csvFile) {
            formData.append('file', csvFile);
        } else {
            formData.append('smiles', smilesList.join(','));
        }

        try {
            const newApiRun = await api.post('/ml/predict', formData);
            const newRun = mapApiPredictionRunToPredictionRun(newApiRun, currentUser);
            addNotification(`Prediction run "${runName}" initiated.`, NotificationType.SUCCESS);
            setPredictionRuns(prev => [newRun, ...prev]);
            setView('list');
            setRunName('');
            setRunDescription('');
            setSmilesInput('');
            setCsvFile(null);
        } catch (error) {
            addNotification(error instanceof Error ? error.message : 'Failed to start prediction.', NotificationType.ERROR);
        } finally {
            setIsPredicting(false);
        }
    };

    const handleDownloadResults = () => {
        if (!currentRunResults || currentRunResults.length === 0) return;
        const headers = "smiles,prediction\n";
        const csvContent = currentRunResults.map(e => `${e.smiles},${e.prediction}`).join("\n");
        const blob = new Blob([headers + csvContent], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.setAttribute("href", url);
        link.setAttribute("download", `${selectedRunDetails?.name || 'prediction'}_results.csv`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    if (view === 'create') {
        return (
            <section className="min-h-screen py-24 bg-black">
                <div className="container mx-auto px-6">
                    <div className="flex justify-between items-center mb-8">
                        <h2 className="text-4xl font-argent text-white">ML Predictor</h2>
                        <button onClick={() => setView('list')} className="font-greycliff text-sm text-white/70 hover:text-white transition flex items-center gap-2">
                            Back to Prediction Runs <i className="ri-arrow-right-line"></i>
                        </button>
                    </div>

                    <div className="bg-white/5 p-6 rounded-lg mb-8">
                        <div className="flex flex-col md:flex-row justify-between items-center mb-6 gap-4">
                            <h3 className="font-greycliff text-xl text-white">Select a Saved Model</h3>
                            <div className="relative w-full md:w-64">
                                <input
                                    type="text"
                                    placeholder="Search models..."
                                    className="w-full pl-9 pr-4 py-2 bg-black/40 rounded-lg font-greycliff text-sm focus:outline-none focus:ring-2 focus:ring-white/20 text-white placeholder-white/50"
                                    value={modelsSearch}
                                    onChange={(e) => setModelsSearch(e.target.value)}
                                />
                                <i className="ri-search-line absolute left-3 top-1/2 -translate-y-1/2 text-white/50 text-sm"></i>
                            </div>
                        </div>
                        <div className="overflow-auto max-h-[350px] relative border border-white/10 rounded-lg">
                            <table className="w-full text-sm text-left">
                                <thead className="bg-gray-800 sticky top-0 z-10 text-white font-greycliff">
                                    <tr>
                                        <th className="p-3 text-center w-16">Sl.No</th>
                                        <th className="p-3 w-1/5 cursor-pointer hover:text-white transition-colors" onClick={() => toggleSort(modelsSort, setModelsSort, 'name')}>
                                            Model Name <SortIndicator active={modelsSort.key === 'name'} direction={modelsSort.direction} />
                                        </th>
                                        <th className="p-3 cursor-pointer hover:text-white transition-colors" onClick={() => toggleSort(modelsSort, setModelsSort, 'modelType')}>
                                            Model Type <SortIndicator active={modelsSort.key === 'modelType'} direction={modelsSort.direction} />
                                        </th>
                                        <th className="p-3 w-2/5 text-white/40">Description</th>
                                        <th className="p-3 text-right cursor-pointer hover:text-white transition-colors" onClick={() => toggleSort(modelsSort, setModelsSort, 'performance')}>
                                            Accuracy/R² <SortIndicator active={modelsSort.key === 'performance'} direction={modelsSort.direction} />
                                        </th>
                                        <th className="p-3 cursor-pointer hover:text-white transition-colors" onClick={() => toggleSort(modelsSort, setModelsSort, 'taskType')}>
                                            Task Type <SortIndicator active={modelsSort.key === 'taskType'} direction={modelsSort.direction} />
                                        </th>
                                        <th className="p-3 cursor-pointer hover:text-white transition-colors" onClick={() => toggleSort(modelsSort, setModelsSort, 'date')}>
                                            Date Saved <SortIndicator active={modelsSort.key === 'date'} direction={modelsSort.direction} />
                                        </th>
                                        <th className="p-3 text-center w-20">Select</th>
                                    </tr>
                                </thead>
                                <tbody className="font-greycliff">
                                    {filteredAndSortedModels.map((model, index) => (
                                        <tr key={model.id} onClick={() => setSelectedModelId(model.id)} className={`border-b border-white/10 hover:bg-white/10 cursor-pointer ${selectedModelId === model.id ? 'bg-cyan-500/10' : ''}`}>
                                            <td className="p-3 text-center text-white/50">{index + 1}</td>
                                            <td className="p-3 font-semibold text-white">{model.name}</td>
                                            <td className="p-3 text-white/70">{model.modelType}</td>
                                            <td className="p-3 text-white/50 truncate max-w-[200px]">{model.description || '-'}</td>
                                            <td className="p-3 text-right font-mono text-cyan-400">{model.performance.toFixed(3)}</td>
                                            <td className="p-3 text-white/70">{model.taskType}</td>
                                            <td className="p-3 text-white/50">{model.date}</td>
                                            <td className="p-3 text-center">
                                                <input
                                                    type="radio"
                                                    name="model-select"
                                                    checked={selectedModelId === model.id}
                                                    onChange={() => setSelectedModelId(model.id)}
                                                    className="form-radio h-4 w-4 bg-gray-700 border-white/20 focus:ring-cyan-500 text-cyan-500 cursor-pointer"
                                                />
                                            </td>
                                        </tr>
                                    ))}
                                    {filteredAndSortedModels.length === 0 && (
                                        <tr>
                                            <td colSpan={8} className="p-12 text-center text-white/20 font-greycliff font-bold uppercase tracking-widest">
                                                {modelsSearch ? 'No models match your search.' : 'No saved models found.'}
                                            </td>
                                        </tr>
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                        <div className="bg-white/5 p-6 rounded-lg">
                            <h3 className="font-greycliff text-xl mb-4 text-white">Make a Prediction</h3>
                            {selectedModel ? (
                                <p className="text-sm text-white/70 mb-6">Using model: <span className="font-bold text-cyan-400">{selectedModel.name}</span></p>
                            ) : (
                                <p className="text-sm text-white/50 mb-6 italic">Please select a model from the table above to begin.</p>
                            )}
                            <div className="space-y-4">
                                <FormInput label="Run Name" type="text" value={runName} onChange={e => setRunName(e.target.value)} required placeholder="e.g., Lead compound screen" />
                                <FormTextarea label="SMILES Input" value={smilesInput} onChange={(e) => { setSmilesInput(e.target.value); if (csvFile) setCsvFile(null); }} placeholder="Enter comma or space-separated SMILES..." rows={5} />
                                <div className="text-center font-greycliff text-white/50 text-sm">or</div>
                                <div>
                                    <div className="relative border-2 border-white/10 border-dashed rounded-lg p-6 flex flex-col items-center justify-center text-center group hover:border-cyan-400/50 transition-colors">
                                        <i className="ri-upload-cloud-2-line text-3xl text-white/50 mb-2 group-hover:text-cyan-400 transition-colors"></i>
                                        <span className="font-greycliff text-sm text-white/80 break-all">{csvFile ? csvFile.name : 'Upload Batch CSV'}</span>
                                        <span className="text-xs text-white/40">{csvFile ? `${(csvFile.size / 1024).toFixed(2)} KB` : 'CSV with a "smiles" column'}</span>
                                        <input type="file" accept=".csv" className="absolute inset-0 w-full h-full opacity-0 cursor-pointer" onChange={handleFileChange} />
                                    </div>
                                    <div className="flex justify-center mt-2">
                                        <button
                                            onClick={handleDownloadSampleCsv}
                                            className="text-[10px] font-bold uppercase tracking-widest text-cyan-400 hover:text-cyan-300 transition-colors flex items-center gap-1"
                                        >
                                            <i className="ri-download-line text-xs"></i>
                                            Download Sample CSV
                                        </button>
                                    </div>
                                </div>
                                <button
                                    onClick={handlePredict}
                                    disabled={isPredicting || !selectedModel || !runName.trim() || (!smilesInput.trim() && !csvFile)}
                                    className="w-full mt-4 py-3 font-greycliff text-lg !rounded-button flex items-center justify-center gap-3 transition-all duration-300 ease-in-out bg-gradient-to-r from-cyan-500 to-blue-500 text-white shadow-lg shadow-cyan-500/20 hover:shadow-xl hover:shadow-cyan-500/40 hover:-translate-y-px disabled:opacity-50 disabled:cursor-not-allowed"
                                >
                                    <i className="ri-magic-line"></i>
                                    {isPredicting ? 'Predicting...' : 'Predict'}
                                </button>
                            </div>
                        </div>
                        <div className="bg-white/5 p-6 rounded-lg">
                            <h3 className="font-greycliff text-xl mb-4 text-white">Selected Model Details</h3>
                            {selectedModel ? (
                                <div className="space-y-3 font-greycliff text-sm animate-fade-in">
                                    <h4 className="font-argent text-xl mb-2 text-cyan-400">{selectedModel.name}</h4>
                                    <p><span className="text-white/60 w-32 inline-block">Model Type:</span> {selectedModel.modelType}</p>
                                    <p><span className="text-white/60 w-32 inline-block">Task:</span> {selectedModel.taskType}</p>
                                    <p><span className="text-white/60 w-32 inline-block">Performance:</span> {selectedModel.performance.toFixed(3)} ({selectedModel.taskType === 'Prediction' ? 'R²' : 'Accuracy'})</p>
                                    <p><span className="text-white/60 w-32 inline-block">Build Time:</span> {selectedModel.buildTime}s</p>
                                    <p><span className="text-white/60 w-32 inline-block">Created:</span> {selectedModel.date}</p>
                                    <div className="pt-2">
                                        <span className="text-white/60 block mb-1">Description:</span>
                                        <div className="text-white/80 bg-black/20 p-3 rounded-lg border border-white/5 min-h-[100px]">
                                            {selectedModel.description || 'No description provided.'}
                                        </div>
                                    </div>
                                </div>
                            ) : (
                                <div className="flex items-center justify-center h-full min-h-[300px]">
                                    <div className="text-center opacity-40">
                                        <i className="ri-robot-2-line text-5xl mb-4"></i>
                                        <p className="font-greycliff">Select a model from the table above<br />to view detailed performance metrics.</p>
                                    </div>
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
                        <i className="ri-arrow-left-line"></i> Back to Prediction Runs
                    </button>
                    <div className="bg-white/5 border border-white/10 p-8 rounded-lg mb-8 transition-all hover:bg-white/[0.07]">
                        {/* Title and Description */}
                        <h2 className="text-3xl font-argent mb-2 text-white">
                            {selectedRunDetails.name}
                        </h2>
                        <p className="font-greycliff text-white/70 max-w-2xl leading-relaxed">
                            {selectedRunDetails.description}
                        </p>

                        <hr className="border-white/10 my-6" />

                        {/* Metadata Grid */}
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-6 font-greycliff text-sm">
                            <div className="flex flex-col gap-1">
                                <p className="text-white/40 uppercase tracking-widest text-[10px] font-bold">Inputs</p>
                                <p className="text-white/90">{selectedRunDetails.inputCount}</p>
                            </div>
                            <div className="flex flex-col gap-1">
                                <p className="text-white/40 uppercase tracking-widest text-[10px] font-bold">Run By</p>
                                <p className="text-white/90">{selectedRunDetails.createdBy}</p>
                            </div>

                            <div className="flex flex-col gap-1">
                                <p className="text-white/40 uppercase tracking-widest text-[10px] font-bold">Run Date</p>
                                <p className="text-white/90">
                                    {selectedRunDetails.createdAt
                                        ? formatDate12h(selectedRunDetails.createdAt)
                                        : "—"}
                                </p>
                            </div>
                        </div>
                    </div>
                    <div className="bg-white/5 p-6 rounded-lg">
                        <div className="flex justify-between items-center mb-4">
                            <h3 className="font-greycliff text-xl text-white">Results</h3>
                            <button onClick={handleDownloadResults} className="px-4 py-2 bg-white text-black font-greycliff text-sm !rounded-button hover:bg-white/90 transition flex items-center gap-2">
                                <i className="ri-download-2-line"></i> Download CSV
                            </button>
                        </div>
                        <div className="overflow-auto max-h-[500px] relative border border-white/10 rounded-lg">
                            <table className="w-full text-sm text-left">
                                <thead className="bg-gray-800 sticky top-0 z-10 text-white font-greycliff">
                                    <tr>
                                        <th className="p-3 w-[70%] cursor-pointer hover:text-white transition-colors" onClick={() => toggleSort(resultsSort, setResultsSort, 'smiles')}>
                                            SMILES <SortIndicator active={resultsSort.key === 'smiles'} direction={resultsSort.direction} />
                                        </th>
                                        <th className="p-3 w-[30%] text-right cursor-pointer hover:text-white transition-colors" onClick={() => toggleSort(resultsSort, setResultsSort, 'prediction')}>
                                            Predicted Value <SortIndicator active={resultsSort.key === 'prediction'} direction={resultsSort.direction} />
                                        </th>
                                    </tr>
                                </thead>
                                <tbody className="font-greycliff text-white/90">
                                    {paginatedPredictionResults.map((result, index) => (
                                        <tr key={index} className="border-b border-white/10 hover:bg-white/5">
                                            <td className="p-3 font-mono text-xs break-all">{result.smiles}</td>
                                            <td className="p-3 text-right font-bold text-cyan-400">{result.prediction}</td>
                                        </tr>
                                    ))}
                                    {paginatedPredictionResults.length === 0 && (
                                        <tr>
                                            <td colSpan={2} className="p-12 text-center text-white/20 font-greycliff font-bold uppercase tracking-widest">
                                                No results found.
                                            </td>
                                        </tr>
                                    )}
                                </tbody>
                            </table>
                        </div>
                        {/* FIX: Changed onItemsPerPageChange setter from setItemsPerPage to setPredItemsPerPage to resolve undefined variable error */}
                        <Pagination currentPage={predCurrentPage} totalPages={Math.ceil(currentRunResults.length / predItemsPerPage)} onPageChange={setPredCurrentPage} itemsPerPage={predItemsPerPage} onItemsPerPageChange={setPredItemsPerPage} totalItems={currentRunResults.length} />
                    </div>
                </div>
            </section>
        );
    }

    return (
        <section id="ml-predictor" className="min-h-screen py-24 bg-black">
            <div className="container mx-auto px-6">
                <div className="flex justify-between items-center mb-8">
                    <h2 className="text-4xl font-argent text-white">Prediction Runs</h2>
                    <button onClick={() => setView('create')} className="px-6 py-3 font-greycliff !rounded-button flex items-center gap-2 transition-all duration-300 ease-in-out bg-gradient-to-r from-cyan-500 to-blue-500 text-white shadow-lg shadow-cyan-500/20 hover:shadow-xl hover:shadow-cyan-500/40 hover:-translate-y-px">
                        <i className="ri-add-line"></i> Create New Prediction
                    </button>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
                    <DashboardStatCard icon="ri-archive-line" label="Total Prediction Runs" value={dashboardStats.totalRuns} color="bg-blue-500/30 text-blue-300" />
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
                        />
                        <i className="ri-search-line absolute left-3 top-1/2 -translate-y-1/2 text-white/50"></i>
                    </div>
                    <select
                        value={statusFilter}
                        onChange={(e) => setStatusFilter(e.target.value)}
                        className="w-full md:w-auto bg-black/40 rounded-lg font-greycliff text-sm p-2 text-white border border-white/10 focus:outline-none focus:ring-1 focus:ring-white/20"
                    >
                        <option value="all">All Statuses</option>
                        <option value={PredictionStatus.SUCCESS}>Success</option>
                        <option value={PredictionStatus.PROCESSING}>Processing</option>
                        <option value={PredictionStatus.FAILURE}>Failure</option>
                    </select>
                </div>

                <div className="bg-white/5 p-6 rounded-lg shadow-xl">
                    <div className="overflow-auto max-h-[600px] relative border border-white/10 rounded-lg">
                        <table className="w-full text-sm text-left">
                            <thead className="bg-gray-800 sticky top-0 z-10 text-white font-greycliff">
                                <tr>
                                    <th className="p-3 w-[20%] cursor-pointer hover:text-white transition-colors" onClick={() => toggleSort(runsSort, setRunsSort, 'name')}>
                                        Name <SortIndicator active={runsSort.key === 'name'} direction={runsSort.direction} />
                                    </th>
                                    <th className="p-3 w-[20%] cursor-pointer hover:text-white transition-colors" onClick={() => toggleSort(runsSort, setRunsSort, 'modelName')}>
                                        Model Details <SortIndicator active={runsSort.key === 'modelName'} direction={runsSort.direction} />
                                    </th>
                                    <th className="p-3 text-center cursor-pointer hover:text-white transition-colors" onClick={() => toggleSort(runsSort, setRunsSort, 'inputCount')}>
                                        Inputs <SortIndicator active={runsSort.key === 'inputCount'} direction={runsSort.direction} />
                                    </th>
                                    <th className="p-3 cursor-pointer hover:text-white transition-colors" onClick={() => toggleSort(runsSort, setRunsSort, 'createdAt')}>
                                        Run Date <SortIndicator active={runsSort.key === 'createdAt'} direction={runsSort.direction} />
                                    </th>
                                    <th className="p-3 cursor-pointer hover:text-white transition-colors" onClick={() => toggleSort(runsSort, setRunsSort, 'createdBy')}>
                                        Users <SortIndicator active={runsSort.key === 'createdBy'} direction={runsSort.direction} />
                                    </th>
                                    <th className="p-3 text-center cursor-pointer hover:text-white transition-colors" onClick={() => toggleSort(runsSort, setRunsSort, 'status')}>
                                        Status <SortIndicator active={runsSort.key === 'status'} direction={runsSort.direction} />
                                    </th>
                                    <th className="p-3 text-center">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="font-greycliff">
                                {paginatedRuns.map(run => (
                                    <tr key={run.id} className="border-b border-white/10 hover:bg-white/5 transition-colors">
                                        <td className="p-3 font-medium text-white">{run.name}</td>
                                        <td className="p-3">
                                            <div className="text-white text-xs">{run.modelName}</div>
                                            <div className="text-[10px] text-white/40 font-bold uppercase">{run.modelType}</div>
                                        </td>
                                        <td className="p-3 text-center font-bold text-white/90">{run.inputCount}</td>
                                        <td className="p-3 text-white/60 text-xs">{run.createdAt}</td>
                                        <td className="p-3">
                                            <div className="text-white/80 text-xs">Run by: <span className="text-white">{run.createdBy}</span></div>
                                            <div className="text-[10px] text-white/30 font-bold uppercase">Model by: {run.modelBuilderName}</div>
                                        </td>
                                        <td className="p-3 text-center"><StatusBadge status={run.status} /></td>
                                        <td className="p-3 text-center">
                                            <div className="flex justify-center items-center gap-3">
                                                <button
                                                    onClick={() => handleViewDetails(run)}
                                                    disabled={run.status !== PredictionStatus.SUCCESS}
                                                    className="p-2 bg-white/5 rounded-lg text-white/50 hover:text-cyan-400 hover:bg-cyan-500/10 transition-all border border-white/5 hover:border-cyan-500/30 disabled:opacity-30 disabled:cursor-not-allowed"
                                                >
                                                    <i className="ri-eye-line text-lg"></i>
                                                </button>
                                                <button
                                                    onClick={() => openDeleteModal(run)}
                                                    className="p-2 bg-white/5 rounded-lg text-white/50 hover:text-red-400 hover:bg-red-500/10 transition-all border border-white/5 hover:border-red-500/30"
                                                >
                                                    <i className="ri-delete-bin-line text-lg"></i>
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                                {paginatedRuns.length === 0 && (
                                    <tr>
                                        <td colSpan={7} className="p-12 text-center text-white/20 font-greycliff font-bold uppercase tracking-widest">
                                            No prediction records found.
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                    <Pagination currentPage={runsCurrentPage} totalPages={Math.ceil(filteredRuns.length / runsItemsPerPage)} onPageChange={setRunsCurrentPage} itemsPerPage={runsItemsPerPage} onItemsPerPageChange={setRunsItemsPerPage} totalItems={filteredRuns.length} />
                </div>
                <ConfirmationModal
                    isOpen={isDeleteModalOpen}
                    onClose={() => setIsDeleteModalOpen(false)}
                    onConfirm={handleConfirmDelete}
                    title="Delete Prediction Run"
                    message={
                        <p>
                            Are you sure you want to delete prediction run <strong>"{runToDelete?.name}"</strong>?
                            This action cannot be undone.
                        </p>
                    }
                    confirmText="Delete"
                    isConfirming={isDeleting}
                />
            </div>
        </section>
    );
};
