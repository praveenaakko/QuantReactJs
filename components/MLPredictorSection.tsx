
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

const mapApiSavedModelToSavedModel = (apiModel: any): SavedModel => ({
    id: String(apiModel.id),
    name: apiModel.name,
    modelType: apiModel.model_type,
    description: apiModel.description,
    performance: apiModel.performance,
    taskType: apiModel.task_type === 'prediction' ? 'Prediction' : 'Classification',
    date: new Date(apiModel.date).toLocaleDateString(),
    buildTime: apiModel.build_time,
});

const mapApiPredictionRunToPredictionRun = (apiRun: any, currentUser: any): PredictionRun => ({
    id: String(apiRun.id),
    name: apiRun.name,
    description: apiRun.description || '',
    modelName: apiRun.modelName,
    modelId: String(apiRun.modelId),
    modelType: apiRun.modelType || 'N/A',
    modelBuilderName: apiRun.modelBuilderName || 'N/A',
    inputCount: apiRun.inputCount,
    createdAt: new Date(apiRun.createdAt).toLocaleString(),
    createdBy: apiRun.createdBy || currentUser?.name || 'Unknown',
    status: apiRun.status as PredictionStatus,
    duration: apiRun.duration,
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

export const MLPredictorSection: React.FC<MLPredictorSectionProps> = ({ addNotification }) => {
    const { state, dispatch } = useStore();
    const { currentUser, savedModels } = state;
    
    // View management
    const [view, setView] = useState<'list' | 'create' | 'details'>('list');

    // List view state
    const [predictionRuns, setPredictionRuns] = useState<PredictionRun[]>([]);
    const [searchTerm, setSearchTerm] = useState('');
    const [statusFilter, setStatusFilter] = useState('all');
    const [runsCurrentPage, setRunsCurrentPage] = useState(1);
    const [runsItemsPerPage, setRunsItemsPerPage] = useState(5);
    const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
    const [runToDelete, setRunToDelete] = useState<PredictionRun | null>(null);
    const [isDeleting, setIsDeleting] = useState(false);
    
    // Create view state
    const [selectedModelId, setSelectedModelId] = useState<string | null>(null);
    const [smilesInput, setSmilesInput] = useState('');
    const [csvFile, setCsvFile] = useState<File | null>(null);
    const [runName, setRunName] = useState('');
    const [runDescription, setRunDescription] = useState('');
    const [isPredicting, setIsPredicting] = useState(false);

    // Details view state
    const [selectedRunDetails, setSelectedRunDetails] = useState<PredictionRun | null>(null);
    const [currentRunResults, setCurrentRunResults] = useState<PredictionResult[]>([]);
    const [predCurrentPage, setPredCurrentPage] = useState(1);
    const [predItemsPerPage, setPredItemsPerPage] = useState(10);
    

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
                    .map(run => mapApiPredictionRunToPredictionRun(run, currentUser))
                    .sort((a,b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
                setPredictionRuns(mappedRuns);
            } catch(e){
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
    
    // Auto-select first model in create view
    useEffect(() => {
        if (view === 'create' && savedModels.length > 0 && !selectedModelId) {
            setSelectedModelId(savedModels[0].id);
        }
    }, [view, savedModels, selectedModelId]);
    
    // Derived state for list view
    const dashboardStats = useMemo(() => ({
        totalRuns: predictionRuns.length,
        successfulRuns: predictionRuns.filter(r => r.status === PredictionStatus.SUCCESS).length,
        processingRuns: predictionRuns.filter(r => r.status === PredictionStatus.PROCESSING).length,
    }), [predictionRuns]);

    const filteredRuns = useMemo(() => predictionRuns.filter(run => 
        run.name.toLowerCase().includes(searchTerm.toLowerCase()) &&
        (statusFilter === 'all' || run.status === statusFilter)
    ), [predictionRuns, searchTerm, statusFilter]);
    
    useEffect(() => { setRunsCurrentPage(1); }, [searchTerm, statusFilter, runsItemsPerPage]);
    
    const runsTotalPages = Math.ceil(filteredRuns.length / runsItemsPerPage);
    const paginatedRuns = useMemo(() => filteredRuns.slice(
        (runsCurrentPage - 1) * runsItemsPerPage, runsCurrentPage * runsItemsPerPage
    ), [filteredRuns, runsCurrentPage, runsItemsPerPage]);
    
    const selectedModel = useMemo(() => savedModels.find(m => m.id === selectedModelId), [savedModels, selectedModelId]);

    // Derived state for details view
    const predTotalPages = Math.ceil((currentRunResults?.length || 0) / predItemsPerPage);
    const paginatedPredictionResults = useMemo(() => currentRunResults?.slice(
        (predCurrentPage - 1) * predItemsPerPage, predCurrentPage * predItemsPerPage
    ) || [], [currentRunResults, predCurrentPage, predItemsPerPage]);
    
    const handleViewDetails = async (run: PredictionRun) => {
        if (run.status !== PredictionStatus.SUCCESS) return;
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
            setPredictionRuns(prev => [newRun, ...prev].sort((a,b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()));
            
            // Reset form and go to list
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
        if (!currentRunResults) return;
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
                        <h2 className="text-4xl font-argent">ML Predictor</h2>
                        <button onClick={() => setView('list')} className="font-greycliff text-sm text-white/70 hover:text-white transition flex items-center gap-2">
                            Back to Prediction Runs <i className="ri-arrow-right-line"></i>
                        </button>
                    </div>

                    <div className="bg-white/5 p-6 rounded-lg mb-8">
                        <h3 className="font-greycliff text-xl mb-4">Select a Saved Model</h3>
                        <div className="overflow-auto max-h-[300px] relative border border-white/10 rounded-lg">
                            <table className="w-full text-sm text-left">
                                <thead className="bg-gray-800 sticky top-0 z-10">
                                    <tr>
                                        <th className="p-3 font-greycliff text-center w-16">Sl.No</th>
                                        <th className="p-3 font-greycliff w-1/5">Model Name</th>
                                        <th className="p-3 font-greycliff">Model Type</th>
                                        <th className="p-3 font-greycliff w-2/5">Description</th>
                                        <th className="p-3 font-greycliff text-right">Accuracy/R²</th>
                                        <th className="p-3 font-greycliff">Task Type</th>
                                        <th className="p-3 font-greycliff">Date Saved</th>
                                        <th className="p-3 font-greycliff text-center w-20">Select</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {savedModels.map((model, index) => (
                                        <tr key={model.id} onClick={() => setSelectedModelId(model.id)} className={`border-b border-white/10 hover:bg-white/10 cursor-pointer ${selectedModelId === model.id ? 'bg-cyan-500/10' : ''}`}>
                                            <td className="p-3 text-center">{index + 1}</td>
                                            <td className="p-3 font-semibold text-white">{model.name}</td>
                                            <td className="p-3">{model.modelType}</td>
                                            <td className="p-3 text-white/70 truncate">{model.description}</td>
                                            <td className="p-3 text-right font-mono">{model.performance.toFixed(2)}</td>
                                            <td className="p-3">{model.taskType}</td>
                                            <td className="p-3">{model.date}</td>
                                            <td className="p-3 text-center">
                                                <input
                                                    type="radio"
                                                    name="model-select"
                                                    checked={selectedModelId === model.id}
                                                    onChange={() => setSelectedModelId(model.id)}
                                                    className="form-radio rounded-full bg-gray-700 border-transparent focus:ring-cyan-500 text-cyan-500"
                                                />
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                    
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                        <div className="bg-white/5 p-6 rounded-lg">
                            <h3 className="font-greycliff text-xl mb-4">Make a Prediction</h3>
                            {selectedModel ? (
                                <p className="text-sm text-white/70 mb-6">Using model: <span className="font-bold text-cyan-400">{selectedModel.name}</span></p>
                            ) : (
                                <p className="text-sm text-white/50 mb-6">Please select a model from the table above to begin.</p>
                            )}
                            <div className="space-y-4">
                                <FormInput label="Run Name" type="text" value={runName} onChange={e => setRunName(e.target.value)} required placeholder="e.g., Lead compound screen"/>
                                <FormTextarea label="SMILES Input" value={smilesInput} onChange={(e) => { setSmilesInput(e.target.value); if (csvFile) setCsvFile(null); }} placeholder="Enter comma or space-separated SMILES..." rows={5}/>
                                <div className="text-center font-greycliff text-white/50 text-sm">or</div>
                                <div>
                                    <div className="relative border-2 border-white/10 border-dashed rounded-lg p-6 flex flex-col items-center justify-center text-center group hover:border-cyan-400/50 transition-colors">
                                        <i className="ri-upload-cloud-2-line text-3xl text-white/50 mb-2 group-hover:text-cyan-400 transition-colors"></i>
                                        <span className="font-greycliff text-sm text-white/80 break-all">{csvFile ? csvFile.name : 'Upload Batch CSV'}</span>
                                        <span className="text-xs text-white/40">{csvFile ? `${(csvFile.size / 1024).toFixed(2)} KB` : 'CSV with a "smiles" column'}</span>
                                        <input type="file" accept=".csv" className="absolute inset-0 w-full h-full opacity-0 cursor-pointer" onChange={handleFileChange} />
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
                            <h3 className="font-greycliff text-xl mb-4">Selected Model Details</h3>
                            {selectedModel ? (
                                <div className="space-y-3 font-greycliff text-sm animate-fade-in">
                                    <h4 className="font-argent text-xl mb-2 text-cyan-400">{selectedModel.name}</h4>
                                    <p><span className="text-white/60 w-32 inline-block">Model Type:</span> {selectedModel.modelType}</p>
                                    <p><span className="text-white/60 w-32 inline-block">Task:</span> {selectedModel.taskType}</p>
                                    <p><span className="text-white/60 w-32 inline-block">Performance:</span> {selectedModel.performance.toFixed(3)} ({selectedModel.taskType === 'Prediction' ? 'R²' : 'Accuracy'})</p>
                                    <p><span className="text-white/60 w-32 inline-block">Build Time:</span> {selectedModel.buildTime}s</p>
                                    <p><span className="text-white/60 w-32 inline-block">Created:</span> {selectedModel.date}</p>
                                    <p className="pt-2"><span className="text-white/60 w-32 block">Description:</span> <span className="text-white/80">{selectedModel.description || 'No description provided.'}</span></p>
                                </div>
                            ) : (
                                <div className="flex items-center justify-center h-full">
                                    <div className="text-center">
                                        <i className="ri-robot-2-line text-5xl text-white/30 mb-4"></i>
                                        <p className="font-greycliff text-white/50">Select a model to view its details.</p>
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
                    <div className="bg-white/5 p-8 rounded-lg mb-8">
                         <h2 className="text-3xl font-argent mb-2">{selectedRunDetails.name}</h2>
                         <p className="font-greycliff text-white/70 max-w-2xl">{selectedRunDetails.description}</p>
                         <hr className="border-white/10 my-6" />
                         <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-6 font-greycliff text-sm">
                            <div><p className="text-white/60">Model Used</p><p>{selectedRunDetails.modelName} ({selectedRunDetails.modelType})</p></div>
                            <div><p className="text-white/60">Inputs</p><p>{selectedRunDetails.inputCount}</p></div>
                            <div><p className="text-white/60">Run By</p><p>{selectedRunDetails.createdBy}</p></div>
                            <div><p className="text-white/60">Model By</p><p>{selectedRunDetails.modelBuilderName}</p></div>
                            <div><p className="text-white/60">Run Date</p><p>{selectedRunDetails.createdAt}</p></div>
                        </div>
                    </div>
                    <div className="bg-white/5 p-6 rounded-lg">
                        <div className="flex justify-between items-center mb-4">
                            <h3 className="font-greycliff text-xl">Results</h3>
                            <button onClick={handleDownloadResults} className="px-4 py-2 bg-white text-black font-greycliff text-sm !rounded-button hover:bg-white/90 transition flex items-center gap-2">
                                <i className="ri-download-2-line"></i> Download CSV
                            </button>
                        </div>
                         <div className="overflow-auto max-h-[500px] relative border border-white/10 rounded-lg">
                            <table className="w-full text-sm text-left">
                                <thead className="bg-gray-800 sticky top-0 z-10">
                                    <tr>
                                        <th className="p-3 font-greycliff w-[70%]">SMILES</th>
                                        <th className="p-3 font-greycliff w-[30%] text-right">Predicted Value</th>
                                    </tr>
                                </thead>
                                <tbody className="font-greycliff text-white/90">
                                    {paginatedPredictionResults.map((result, index) => (
                                        <tr key={index} className="border-b border-white/10">
                                            <td className="p-3 font-mono text-xs break-all">{result.smiles}</td>
                                            <td className="p-3 text-right">{result.prediction}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                        <Pagination currentPage={predCurrentPage} totalPages={predTotalPages} onPageChange={setPredCurrentPage} itemsPerPage={predItemsPerPage} onItemsPerPageChange={setPredItemsPerPage} totalItems={currentRunResults.length}/>
                    </div>
                </div>
            </section>
        );
    }
    
    // List view (default)
    return (
        <section id="ml-predictor" className="min-h-screen py-24 bg-black">
            <div className="container mx-auto px-6">
                 <div className="flex justify-between items-center mb-8">
                    <h2 className="text-4xl font-argent">Prediction Runs</h2>
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
                        <input type="text" placeholder="Search by run name..." className="w-full pl-10 pr-4 py-2 bg-black/40 rounded-lg font-greycliff text-sm" value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} />
                        <i className="ri-search-line absolute left-3 top-1/2 -translate-y-1/2 text-white/50"></i>
                    </div>
                    <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className="w-full md:w-auto bg-black/40 rounded-lg font-greycliff text-sm p-2">
                        <option value="all">All Statuses</option>
                        <option value={PredictionStatus.SUCCESS}>Success</option>
                        <option value={PredictionStatus.PROCESSING}>Processing</option>
                        <option value={PredictionStatus.FAILURE}>Failure</option>
                    </select>
                </div>
                <div className="bg-white/5 p-6 rounded-lg">
                     <div className="overflow-auto max-h-[600px] relative border border-white/10 rounded-lg">
                        <table className="w-full text-sm text-left">
                            <thead className="bg-gray-800 sticky top-0 z-10">
                                <tr>
                                    <th className="p-3 font-greycliff w-[25%]">Name</th>
                                    <th className="p-3 font-greycliff w-[20%]">Model Details</th>
                                    <th className="p-3 font-greycliff text-center">Inputs</th>
                                    <th className="p-3 font-greycliff">Run Date</th>
                                    <th className="p-3 font-greycliff">Users</th>
                                    <th className="p-3 font-greycliff text-center">Status</th>
                                    <th className="p-3 font-greycliff text-center">Actions</th>
                                </tr>
                            </thead>
                            <tbody>
                                {paginatedRuns.map(run => (
                                    <tr key={run.id} className="border-b border-white/10">
                                        <td className="p-3 font-greycliff text-white">{run.name}</td>
                                        <td className="p-3 font-greycliff">
                                            <div className="text-white truncate">{run.modelName}</div>
                                            <div className="text-xs text-white/60">{run.modelType}</div>
                                        </td>
                                        <td className="p-3 font-greycliff text-center">{run.inputCount}</td>
                                        <td className="p-3 font-greycliff">{run.createdAt}</td>
                                        <td className="p-3 font-greycliff">
                                            <div>Run by: {run.createdBy}</div>
                                            <div className="text-xs text-white/60">Model by: {run.modelBuilderName}</div>
                                        </td>
                                        <td className="p-3 font-greycliff text-center"><StatusBadge status={run.status} /></td>
                                        <td className="p-3 text-center">
                                            <div className="flex justify-center items-center gap-2">
                                                <button onClick={() => handleViewDetails(run)} disabled={run.status !== PredictionStatus.SUCCESS} className="p-1 text-white/70 hover:text-white disabled:text-white/30 disabled:cursor-not-allowed transition">
                                                    <i className="ri-eye-line"></i>
                                                </button>
                                                <button onClick={() => openDeleteModal(run)} className="p-1 text-red-500/70 hover:text-red-500 transition">
                                                    <i className="ri-delete-bin-line"></i>
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                    <Pagination currentPage={runsCurrentPage} totalPages={runsTotalPages} onPageChange={setRunsCurrentPage} itemsPerPage={runsItemsPerPage} onItemsPerPageChange={setRunsItemsPerPage} totalItems={filteredRuns.length} />
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
