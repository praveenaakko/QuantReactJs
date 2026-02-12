
import React, { useState, useMemo, useEffect } from 'react';
import { EChartComponent } from './EChartComponent';
import type { EChartsOption } from 'echarts';
import type { DockingResult, DockingRun, Protein, Ligand, LigandGroup } from '../types';
import { NotificationType, DockingStatus } from '../types';
import { Pagination } from './Pagination';
import { useStore } from '../store/store';
import api from '../config/api';
import { AddProteinModal } from './AddProteinModal';
import { AddLigandGroupModal } from './AddLigandGroupModal';
import { CreateLigandGroupModal } from './CreateLigandGroupModal';

interface DockingSectionProps {
  addNotification: (message: string, type: NotificationType) => void;
}

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

const DetailRow = ({ label, value }: { label: string; value: React.ReactNode }) => (
    <div className="flex justify-between items-start py-2 border-b border-white/5 last:border-0">
        <span className="font-greycliff text-white/50 text-sm shrink-0 pr-4">{label}</span>
        <span className="font-greycliff text-white text-sm text-right break-words max-w-[60%]">{value || '-'}</span>
    </div>
);

const StatusBadge: React.FC<{ status: DockingStatus }> = ({ status }) => {
    const statusStyles = {
        [DockingStatus.SUCCESS]: 'bg-green-500/20 text-green-400 border-green-500/30',
        [DockingStatus.PROCESSING]: 'bg-blue-500/20 text-blue-400 border-blue-500/30 animate-pulse',
        [DockingStatus.FAILURE]: 'bg-red-500/20 text-red-400 border-red-500/30',
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

// Helper Mappers
const mapApiDockingResultToDockingResult = (apiResult: any): DockingResult => ({
    id: String(apiResult.id),
    smiles: apiResult.smiles,
    bindingEnergy: apiResult.binding_energy,
    rmsd: apiResult.rmsd,
    energyModes: apiResult.energy_modes || [],
});

const mapApiDockingRunToDockingRun = (apiRun: any, currentUser: any): DockingRun => ({
    id: String(apiRun.id),
    name: apiRun.name,
    description: apiRun.description || '',
    proteinName: apiRun.protein_name,
    ligandCount: apiRun.ligand_count,
    dockingType: apiRun.docking_type,
    createdAt: formatDate12h(apiRun.created_at),
    createdBy: apiRun.created_by || currentUser?.name || 'Unknown',
    status: apiRun.status as DockingStatus,
    duration: apiRun.duration,
    exhaustiveness: apiRun.exhaustiveness,
    numModes: apiRun.num_modes,
    center_x: apiRun.center_x,
    center_y: apiRun.center_y,
    center_z: apiRun.center_z,
});

const mapApiProteinToProtein = (apiProtein: any): Protein => ({
    id: String(apiProtein.id),
    name: apiProtein.name,
    rcsbId: apiProtein.rcsb_id,
    pubmedId: Number(apiProtein.pubmed_id) || 0,
    title: apiProtein.title,
    pubmedAbstract: apiProtein.pubmed_abstract || 'Not available.',
    method: apiProtein.experimental_method,
    lengthA: Number(apiProtein.length_a) || 0,
    lengthB: Number(apiProtein.length_b) || 0,
    lengthC: Number(apiProtein.length_c) || 0,
    ligandName: apiProtein.ligand_name || 'N/A',
    ligandFormula: apiProtein.ligand_formula || 'N/A',
    ligandInchi: apiProtein.ligand_inchi || 'N/A',
    uniprotId: apiProtein.uniprot_id,
    organism: apiProtein.source_organism,
    moleculeType: apiProtein.molecule,
    polyType: apiProtein.poly_type || 'N/A',
    polyRcsbEntityPolymerType: apiProtein.poly_rcsb_entity_polymer_type || 'N/A',
    polyPdbxSequenceOneLetterCode: apiProtein.poly_pdbx_sequence_one_letter_code || 'N/A',
    sequenceLength: Number(apiProtein.poly_rcsb_sample_sequence_length) || 0,
    mutations: Number(apiProtein.mutation) || 0,
    chain: apiProtein.chain || 'N/A',
    numChain: Number(apiProtein.num_chain) || 0,
    depositionDate: apiProtein.relese_date,
});

const mapApiLigandToLigand = (apiLigand: any): Ligand => ({
    id: String(apiLigand.id),
    name: apiLigand.name,
    smiles: apiLigand.smiles,
    formula: apiLigand.formula,
    group: apiLigand.group_name,
});

const fileToBase64 = (file: File): Promise<string> =>
  new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => {
        const result = reader.result as string;
        resolve(result.split(',')[1]);
    };
    reader.onerror = error => reject(error);
  });

type DockingView = 'list' | 'create' | 'details';

// Sorting Types
interface SortConfig<T> {
    key: keyof T | null;
    direction: 'asc' | 'desc';
}

const SortIndicator = ({ active, direction }: { active: boolean, direction: 'asc' | 'desc' }) => {
    if (!active) return <i className="ri-expand-up-down-line ml-1 opacity-30"></i>;
    return direction === 'asc' 
        ? <i className="ri-arrow-up-s-line ml-1 text-cyan-400"></i> 
        : <i className="ri-arrow-down-s-line ml-1 text-cyan-400"></i>;
};

export const DockingSection: React.FC<DockingSectionProps> = ({ addNotification }) => {
    const { state, dispatch } = useStore();
    const { selectedProtein, selectedLigands, dockingRuns, currentUser, proteins, ligands, ligandGroups } = state;
    
    // View management
    const [view, setView] = useState<DockingView>('list');
    
    // List View State
    const [searchTerm, setSearchTerm] = useState('');
    const [statusFilter, setStatusFilter] = useState('all');
    const [userFilter, setUserFilter] = useState('all');
    const [runsCurrentPage, setRunsCurrentPage] = useState(1);
    const [runsItemsPerPage, setRunsItemsPerPage] = useState(5);
    const [runsSort, setRunsSort] = useState<SortConfig<DockingRun>>({ key: 'createdAt', direction: 'desc' });

    // Create View State
    const [runName, setRunName] = useState('');
    const [runDescription, setRunDescription] = useState('');
    const [dockingType, setDockingType] = useState<'blind' | 'targeted'>('targeted');
    const [exhaustiveness, setExhaustiveness] = useState(8);
    const [numModes, setNumModes] = useState(9);
    const [centerX, setCenterX] = useState(0.0);
    const [centerY, setCenterY] = useState(0.0);
    const [centerZ, setCenterZ] = useState(0.0);
    const [isDocking, setIsDocking] = useState(false);

    // Selection States for Create View
    const [proteinSearch, setProteinSearch] = useState('');
    const [proteinPage, setProteinPage] = useState(1);
    const [proteinItemsPerPage, setProteinItemsPerPage] = useState(5);
    const [proteinSort, setProteinSort] = useState<SortConfig<Protein>>({ key: 'name', direction: 'asc' });

    const [ligandSearch, setLigandSearch] = useState('');
    const [ligandGroupFilter, setLigandGroupFilter] = useState('');
    const [ligandPage, setLigandPage] = useState(1);
    const [ligandItemsPerPage, setLigandItemsPerPage] = useState(10);
    const [ligandSort, setLigandSort] = useState<SortConfig<Ligand>>({ key: 'name', direction: 'asc' });

    // Modals
    const [isProteinModalOpen, setIsProteinModalOpen] = useState(false);
    const [isLigandGroupModalOpen, setIsLigandGroupModalOpen] = useState(false);
    const [isCreateGroupModalOpen, setIsCreateGroupModalOpen] = useState(false);

    // Details View State
    const [selectedRunDetails, setSelectedRunDetails] = useState<DockingRun | null>(null);
    const [currentRunResults, setCurrentRunResults] = useState<DockingResult[]>([]);
    const [selectedResultId, setSelectedResultId] = useState<string | null>(null);
    const [resultsCurrentPage, setResultsCurrentPage] = useState(1);
    const [resultsItemsPerPage, setResultsItemsPerPage] = useState(5);
    const [resultsSort, setResultsSort] = useState<SortConfig<DockingResult>>({ key: 'bindingEnergy', direction: 'asc' });

    // --- Effects ---

    // Fetch Runs on List View
    useEffect(() => {
        const fetchRuns = async () => {
            if (view !== 'list') return;
            dispatch({ type: 'SET_LOADING', payload: true });
            try {
                const runsData = await api.get('/docking/runs');
                const mappedRuns = (Array.isArray(runsData) ? runsData : [])
                    .map(run => mapApiDockingRunToDockingRun(run, currentUser));
                dispatch({ type: 'SET_DOCKING_RUNS', payload: mappedRuns });
            } catch (error) {
                addNotification(error instanceof Error ? error.message : 'Failed to fetch docking runs.', NotificationType.ERROR);
            } finally {
                dispatch({ type: 'SET_LOADING', payload: false });
            }
        };
        fetchRuns();
    }, [view, dispatch, addNotification, currentUser]);

    // Fetch Proteins and Ligands on Create View
    useEffect(() => {
        const fetchData = async () => {
            if (view !== 'create') return;
            
            // Fetch data if not already populated
            if (proteins.length === 0 || ligands.length === 0) {
                dispatch({ type: 'SET_LOADING', payload: true });
                try {
                     const [proteinsData, ligandsData, groupsData] = await Promise.all([
                        api.get('/proteins/get'),
                        api.get('/ligands/get'),
                        api.get('/ligands/ligand_group')
                    ]);
                    
                    if (proteinsData) dispatch({ type: 'SET_PROTEINS', payload: (Array.isArray(proteinsData) ? proteinsData : []).map(mapApiProteinToProtein) });
                    if (ligandsData?.ligands) dispatch({ type: 'SET_LIGANDS', payload: ligandsData.ligands.map(mapApiLigandToLigand) });
                    if (groupsData?.groups) dispatch({ type: 'SET_LIGAND_GROUPS', payload: groupsData.groups });

                } catch (error) {
                    console.error("Failed to fetch selection data", error);
                    addNotification('Failed to load selection data.', NotificationType.ERROR);
                } finally {
                    dispatch({ type: 'SET_LOADING', payload: false });
                }
            }
        };
        fetchData();
    }, [view, proteins.length, ligands.length, dispatch, addNotification]);

    // --- Computed Data ---
    
    // Generic Sorter
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

    // List View Filtering & Sorting
    const dashboardStats = useMemo(() => {
        const totalRuns = dockingRuns.length;
        const successfulRuns = dockingRuns.filter(run => run.status === DockingStatus.SUCCESS);
        const processingRuns = dockingRuns.filter(run => run.status === DockingStatus.PROCESSING);
        const successfulRunsWithDuration = successfulRuns.filter(run => typeof run.duration === 'number');
        const totalDuration = successfulRunsWithDuration.reduce((acc, run) => acc + (run.duration || 0), 0);
        const averageDurationSeconds = successfulRunsWithDuration.length > 0 ? totalDuration / successfulRunsWithDuration.length : 0;
        const minutes = Math.floor(averageDurationSeconds / 60);
        const seconds = Math.round(averageDurationSeconds % 60);
        const formattedAverageTime = averageDurationSeconds > 0 ? `${minutes}m ${seconds}s` : 'N/A';

        return { totalDocker: totalRuns, averageTime: formattedAverageTime, successReports: successfulRuns.length, processingReports: processingRuns.length };
    }, [dockingRuns]);

    const filteredRuns = useMemo(() => {
        const filtered = dockingRuns.filter(run => {
            const matchesSearch = run.name.toLowerCase().includes(searchTerm.toLowerCase());
            const matchesStatus = statusFilter === 'all' || run.status === statusFilter;
            const matchesUser = userFilter === 'all' || run.createdBy === userFilter;
            return matchesSearch && matchesStatus && matchesUser;
        });
        return sortData(filtered, runsSort);
    }, [dockingRuns, searchTerm, statusFilter, userFilter, runsSort]);

    const paginatedRuns = useMemo(() => filteredRuns.slice((runsCurrentPage - 1) * runsItemsPerPage, runsCurrentPage * runsItemsPerPage), [filteredRuns, runsCurrentPage, runsItemsPerPage]);
    const runsTotalPages = Math.ceil(filteredRuns.length / runsItemsPerPage);

    // Create View Filtering & Sorting
    const filteredProteins = useMemo(() => {
        const filtered = proteins.filter(p => p.name.toLowerCase().includes(proteinSearch.toLowerCase()) || p.rcsbId.toLowerCase().includes(proteinSearch.toLowerCase()));
        return sortData(filtered, proteinSort);
    }, [proteins, proteinSearch, proteinSort]);

    const paginatedProteins = useMemo(() => filteredProteins.slice((proteinPage - 1) * proteinItemsPerPage, proteinPage * proteinItemsPerPage), [filteredProteins, proteinPage, proteinItemsPerPage]);
    const proteinTotalPages = Math.ceil(filteredProteins.length / proteinItemsPerPage);

    const filteredLigands = useMemo(() => {
        const filtered = ligands.filter(l => 
            (l.name.toLowerCase().includes(ligandSearch.toLowerCase()) || l.smiles.toLowerCase().includes(ligandSearch.toLowerCase())) &&
            (ligandGroupFilter === '' || l.group === ligandGroupFilter)
        );
        return sortData(filtered, ligandSort);
    }, [ligands, ligandSearch, ligandGroupFilter, ligandSort]);

    const paginatedLigands = useMemo(() => filteredLigands.slice((ligandPage - 1) * ligandItemsPerPage, ligandPage * ligandItemsPerPage), [filteredLigands, ligandPage, ligandItemsPerPage]);
    const ligandTotalPages = Math.ceil(filteredLigands.length / ligandItemsPerPage);

    // Details View Filtering & Sorting
    const sortedResults = useMemo(() => sortData(currentRunResults, resultsSort), [currentRunResults, resultsSort]);
    const resultsTotalPages = Math.ceil(sortedResults.length / resultsItemsPerPage);
    const paginatedResults = useMemo(() => sortedResults.slice((resultsCurrentPage - 1) * resultsItemsPerPage, resultsCurrentPage * resultsItemsPerPage), [sortedResults, resultsCurrentPage, resultsItemsPerPage]);
    const selectedResult = useMemo(() => currentRunResults.find(r => r.id === selectedResultId), [currentRunResults, selectedResultId]);

    // --- Handlers ---

    const toggleSort = <T,>(config: SortConfig<T>, setConfig: React.Dispatch<React.SetStateAction<SortConfig<T>>>, key: keyof T) => {
        if (config.key === key) {
            setConfig({ key, direction: config.direction === 'asc' ? 'desc' : 'asc' });
        } else {
            setConfig({ key, direction: 'asc' });
        }
    };

    const handleViewDetails = async (run: DockingRun) => {
        if (run.status !== DockingStatus.SUCCESS) return;
        dispatch({ type: 'SET_LOADING', payload: true });
        try {
            const resultsData = await api.get(`/docking/results/${run.id}`);
            const mappedResults = (Array.isArray(resultsData) ? resultsData : []).map(mapApiDockingResultToDockingResult);
            setCurrentRunResults(mappedResults);
            setSelectedRunDetails(run);
            if (mappedResults.length > 0) setSelectedResultId(mappedResults[0].id);
            setView('details');
        } catch (error) {
            addNotification(error instanceof Error ? error.message : 'Failed to fetch results.', NotificationType.ERROR);
        } finally {
            dispatch({ type: 'SET_LOADING', payload: false });
        }
    };
    
    const handleDeleteRun = async (runId: string) => {
        if (!window.confirm('Are you sure?')) return;
        dispatch({ type: 'SET_LOADING', payload: true });
        try {
            await api.delete(`/docking/runs/${runId}`);
            addNotification('Run deleted.', NotificationType.SUCCESS);
            dispatch({type: 'SET_DOCKING_RUNS', payload: dockingRuns.filter(run => run.id !== runId)});
        } catch (error) {
            addNotification('Failed to delete run.', NotificationType.ERROR);
        } finally {
            dispatch({ type: 'SET_LOADING', payload: false });
        }
    };

    const handleDownloadCSV = () => {
        if (!currentRunResults || currentRunResults.length === 0) {
            addNotification('No results available to download.', NotificationType.ERROR);
            return;
        }
        
        const headers = ['SMILES', 'Binding Energy (kcal/mol)', 'RMSD (Å)', 'Energy Modes'];
        const rows = currentRunResults.map(res => [
            res.smiles,
            res.bindingEnergy,
            res.rmsd,
            `"${res.energyModes.join('; ')}"` // Escape array representation
        ]);
        
        const csvContent = [
            headers.join(','),
            ...rows.map(row => row.join(','))
        ].join('\n');
        
        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.setAttribute("href", url);
        link.setAttribute("download", `${selectedRunDetails?.name.replace(/\s+/g, '_') || 'docking_results'}.csv`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    // Create View Handlers
    const handleAddProtein = async (proteinData: Omit<Protein, 'id'>, proteinFile: File | null) => {
        if (!proteinFile) { addNotification('File required', NotificationType.ERROR); return; }
        dispatch({ type: 'SET_LOADING', payload: true });
        try {
            const pdbfileBase64 = await fileToBase64(proteinFile);
            
            // Map frontend data to backend snake_case keys
            const payload = {
                name: proteinData.name,
                rcsb_id: proteinData.rcsbId,
                pubmed_id: proteinData.pubmedId,
                title: proteinData.title,
                pubmed_abstract: proteinData.pubmedAbstract,
                experimental_method: proteinData.method,
                length_a: proteinData.lengthA,
                length_b: proteinData.lengthB,
                length_c: proteinData.lengthC,
                ligand_name: proteinData.ligandName,
                ligand_formula: proteinData.ligandFormula,
                ligand_inchi: proteinData.ligandInchi,
                uniprot_id: proteinData.uniprotId,
                source_organism: proteinData.organism,
                molecule: proteinData.moleculeType,
                poly_type: proteinData.polyType,
                poly_rcsb_entity_polymer_type: proteinData.polyRcsbEntityPolymerType,
                poly_pdbx_sequence_one_letter_code: proteinData.polyPdbxSequenceOneLetterCode,
                poly_rcsb_sample_sequence_length: proteinData.sequenceLength,
                mutation: proteinData.mutations,
                chain: proteinData.chain,
                num_chain: proteinData.numChain,
                relese_date: proteinData.depositionDate,
                pdbfile: pdbfileBase64
            };

            const newApiProtein = await api.post('/proteins/create', payload);
            dispatch({ type: 'ADD_PROTEIN', payload: mapApiProteinToProtein(newApiProtein) });
            addNotification(`Protein "${newApiProtein.name}" added.`, NotificationType.SUCCESS);
            setIsProteinModalOpen(false);
        } catch (e) { addNotification('Failed to add protein', NotificationType.ERROR); } finally { dispatch({ type: 'SET_LOADING', payload: false }); }
    };

    const handleUploadLigandGroup = async (groupName: string, description: string, file: File) => {
        const formData = new FormData();
        formData.append('groupName', groupName);
        formData.append('description', description);
        formData.append('file', file);
        dispatch({ type: 'SET_LOADING', payload: true });
        try {
            await api.post('/ligands/ligand_groups/upload', formData);
            // Refresh data
            const [ligandsData, groupsData] = await Promise.all([api.get('/ligands/get'), api.get('/ligands/ligand_group')]);
            if(ligandsData?.ligands) dispatch({ type: 'SET_LIGANDS', payload: ligandsData.ligands.map(mapApiLigandToLigand) });
            if(groupsData?.groups) dispatch({ type: 'SET_LIGAND_GROUPS', payload: groupsData.groups });
            addNotification(`Group "${groupName}" uploaded.`, NotificationType.SUCCESS);
            setIsLigandGroupModalOpen(false);
        } catch (e) { addNotification('Failed to upload group', NotificationType.ERROR); } finally { dispatch({ type: 'SET_LOADING', payload: false }); }
    };

    const handleCreateGroup = async (groupName: string) => {
        dispatch({ type: 'SET_LOADING', payload: true });
        try {
            await api.put('/ligands/assign_group', { groupName, ligandIds: selectedLigands.map(l => l.id) });
             // Refresh data
             const [ligandsData, groupsData] = await Promise.all([api.get('/ligands/get'), api.get('/ligands/ligand_group')]);
             if(ligandsData?.ligands) dispatch({ type: 'SET_LIGANDS', payload: ligandsData.ligands.map(mapApiLigandToLigand) });
             if(groupsData?.groups) dispatch({ type: 'SET_LIGAND_GROUPS', payload: groupsData.groups });
             dispatch({ type: 'SET_SELECTED_LIGANDS', payload: [] });
             addNotification(`Group "${groupName}" created.`, NotificationType.SUCCESS);
             setIsCreateGroupModalOpen(false);
        } catch (e) { addNotification('Failed to create group', NotificationType.ERROR); } finally { dispatch({ type: 'SET_LOADING', payload: false }); }
    };

    const handleRunDocking = async () => {
        if (!runName.trim()) { addNotification('Name required.', NotificationType.ERROR); return; }
        if (!selectedProtein) { addNotification('Select a protein.', NotificationType.ERROR); return; }
        if (selectedLigands.length === 0) { addNotification('Select at least one ligand.', NotificationType.ERROR); return; }
        
        setIsDocking(true);
        // Use snake_case for backend compatibility
        const payload = {
            name: runName,
            description: runDescription,
            protein_id: selectedProtein.id,
            ligand_ids: selectedLigands.map(l => l.id),
            docking_type: dockingType,
            exhaustiveness,
            num_modes: numModes,
            center_x: centerX,
            center_y: centerY,
            center_z: centerZ
        };
        try {
            const newApiRun = await api.post('/docking/generate', payload);
            const newRun = mapApiDockingRunToDockingRun(newApiRun, currentUser);
            addNotification(`Docking started for "${runName}".`, NotificationType.SUCCESS);
            dispatch({ type: 'SET_DOCKING_RUNS', payload: [newRun, ...dockingRuns] });
            setView('list');
            // Reset form
            setRunName(''); setRunDescription(''); dispatch({ type: 'SET_SELECTED_PROTEIN', payload: null }); dispatch({ type: 'SET_SELECTED_LIGANDS', payload: [] });
        } catch (e) { addNotification('Failed to start docking.', NotificationType.ERROR); } finally { setIsDocking(false); }
    };

    const handleSelectLigand = (ligand: Ligand, isSelected: boolean) => {
        dispatch({ type: 'SET_SELECTED_LIGANDS', payload: prev => isSelected ? [...prev, ligand] : prev.filter(l => l.id !== ligand.id) });
    };

    // --- Render ---

    const energyChartOption: EChartsOption = {
        animation: true,
        title: {
            text: selectedResult ? `Mode vs Energy` : 'Mode vs Energy',
            subtext: selectedResult ? `${selectedResult.smiles.substring(0, 30)}...` : 'Select a result',
            itemGap: 8,
            left: 'center',
            textStyle: { 
                color: '#fff', 
                fontFamily: 'Greycliff CF',
                fontSize: 16 
            },
            subtextStyle: {
                fontSize: 12,
                color: 'rgba(255,255,255,0.6)'
            }
        },
        tooltip: { trigger: 'axis' },
        grid: { 
            top: 80,
            left: 60, 
            right: '4%', 
            bottom: '3%', 
            containLabel: true 
        },
        xAxis: { type: 'category', data: Array.from({ length: selectedRunDetails?.numModes || numModes }, (_, i) => `Mode ${i + 1}`), axisLabel: { color: 'rgba(255,255,255,0.7)' } },
        yAxis: { type: 'value', name: 'Energy (kcal/mol)', axisLabel: { color: 'rgba(255,255,255,0.7)' }, splitLine: { lineStyle: { color: 'rgba(255,255,255,0.1)' } } },
        series: [{ data: selectedResult ? selectedResult.energyModes : [], type: 'line', smooth: true, lineStyle: { color: 'rgba(87, 181, 231, 1)' }, areaStyle: { color: 'rgba(87, 181, 231, 0.2)' } }]
    };

    if (view === 'create') {
        return (
            <section className="min-h-screen py-24 bg-black">
                <div className="container mx-auto px-6">
                    <div className="flex justify-between items-center mb-8">
                        <h2 className="text-4xl font-argent text-white">New Docking Run</h2>
                        <button onClick={() => setView('list')} className="font-greycliff text-sm text-white/70 hover:text-white transition flex items-center gap-2">
                             Back to Runs <i className="ri-arrow-right-line"></i>
                        </button>
                    </div>

                    {/* Section 1: Protein Selection */}
                    <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 mb-12">
                        {/* Left Column: Protein List */}
                        <div className="lg:col-span-8 bg-gray-900 rounded-xl border border-white/10 p-6 flex flex-col h-[600px]">
                             <div className="flex justify-between items-center mb-4">
                                <h3 className="font-greycliff text-lg text-white flex items-center gap-2"><i className="ri-flask-line text-cyan-400"></i> Select Target Protein</h3>
                                <button onClick={() => setIsProteinModalOpen(true)} className="text-xs bg-white/10 hover:bg-white/20 px-3 py-1.5 rounded text-white transition flex items-center gap-1"><i className="ri-add-line"></i> Add New Protein</button>
                            </div>
                            <div className="mb-4 relative">
                                <input type="text" placeholder="Search proteins by name or ID..." value={proteinSearch} onChange={e => {setProteinSearch(e.target.value); setProteinPage(1);}} className="w-full bg-black/40 border border-white/10 rounded-lg py-2.5 pl-9 pr-3 text-sm text-white focus:outline-none focus:border-cyan-400/50" />
                                <i className="ri-search-line absolute left-3 top-3 text-white/40 text-sm"></i>
                            </div>
                            
                            <div className="flex-grow overflow-y-auto border border-white/5 rounded-lg mb-4 custom-scrollbar">
                                <table className="w-full text-sm text-left">
                                    <thead className="bg-black/40 sticky top-0 text-xs text-white/50 z-10">
                                        <tr>
                                            <th className="p-3 text-center w-12"></th>
                                            <th className="p-3 cursor-pointer hover:text-white transition-colors" onClick={() => toggleSort(proteinSort, setProteinSort, 'name')}>
                                                Protein Name <SortIndicator active={proteinSort.key === 'name'} direction={proteinSort.direction} />
                                            </th>
                                            <th className="p-3 cursor-pointer hover:text-white transition-colors" onClick={() => toggleSort(proteinSort, setProteinSort, 'rcsbId')}>
                                                RCSB ID <SortIndicator active={proteinSort.key === 'rcsbId'} direction={proteinSort.direction} />
                                            </th>
                                            <th className="p-3 text-right cursor-pointer hover:text-white transition-colors" onClick={() => toggleSort(proteinSort, setProteinSort, 'method')}>
                                                Method <SortIndicator active={proteinSort.key === 'method'} direction={proteinSort.direction} />
                                            </th>
                                        </tr>
                                    </thead>
                                    <tbody className="text-white/80">
                                        {paginatedProteins.map(p => (
                                            <tr key={p.id} onClick={() => dispatch({ type: 'SET_SELECTED_PROTEIN', payload: p })} className={`border-b border-white/5 cursor-pointer hover:bg-white/5 transition-colors ${selectedProtein?.id === p.id ? 'bg-cyan-500/10' : ''}`}>
                                                <td className="p-3 text-center">
                                                    <div className={`w-5 h-5 rounded-full border flex items-center justify-center mx-auto ${selectedProtein?.id === p.id ? 'border-cyan-400' : 'border-white/30'}`}>
                                                        {selectedProtein?.id === p.id && <div className="w-2.5 h-2.5 rounded-full bg-cyan-400"></div>}
                                                    </div>
                                                </td>
                                                <td className="p-3 font-medium text-white">{p.name}</td>
                                                <td className="p-3 font-mono text-xs text-white/60">{p.rcsbId}</td>
                                                <td className="p-3 text-right text-xs text-white/60">{p.method}</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                            <Pagination currentPage={proteinPage} totalPages={proteinTotalPages} onPageChange={setProteinPage} itemsPerPage={proteinItemsPerPage} onItemsPerPageChange={setProteinItemsPerPage} totalItems={filteredProteins.length} pageSizeOptions={[5, 10, 20]} />
                        </div>

                        {/* Right Column: Selected Protein Details */}
                        <div className="lg:col-span-4 bg-gray-900 rounded-xl border border-white/10 p-6 flex flex-col h-[600px] relative overflow-hidden">
                             {selectedProtein ? (
                                <>
                                    <div className="absolute top-0 right-0 w-32 h-32 bg-cyan-500/10 rounded-bl-full blur-2xl pointer-events-none"></div>
                                    <h3 className="font-greycliff text-lg text-white mb-6 z-10">Selected Protein Details</h3>
                                    <div className="space-y-1 flex-grow overflow-y-auto custom-scrollbar pr-2 z-10">
                                        <DetailRow label="Protein Name" value={selectedProtein.name} />
                                        <DetailRow label="RCSB ID" value={selectedProtein.rcsbId} />
                                        <DetailRow label="Title" value={selectedProtein.title} />
                                        <DetailRow label="Method" value={selectedProtein.method} />
                                        {/* Assuming Length A is a proxy for Resolution or similar structural metric if not explicitly available */}
                                        <DetailRow label="Dimensions (A)" value={`${selectedProtein.lengthA} x ${selectedProtein.lengthB} x ${selectedProtein.lengthC}`} /> 
                                        <DetailRow label="Uniprot ID" value={selectedProtein.uniprotId} />
                                        <DetailRow label="Molecule" value={selectedProtein.moleculeType} />
                                        <DetailRow label="Organism" value={selectedProtein.organism} />
                                        <DetailRow label="Release Date" value={selectedProtein.depositionDate} />
                                        <div className="pt-4 mt-2 border-t border-white/10">
                                            <p className="text-xs text-white/50 mb-1">Ligand Info</p>
                                            <p className="text-sm text-white">{selectedProtein.ligandName} <span className="text-white/40 text-xs ml-2">{selectedProtein.ligandFormula}</span></p>
                                        </div>
                                    </div>
                                    <div className="mt-4 pt-4 border-t border-white/10 z-10">
                                        <button onClick={() => dispatch({ type: 'SET_SELECTED_PROTEIN', payload: null })} className="w-full py-2 border border-white/20 hover:bg-white/5 rounded-lg text-sm text-white/70 transition">Deselect Protein</button>
                                    </div>
                                </>
                             ) : (
                                <div className="h-full flex flex-col items-center justify-center text-center opacity-50">
                                    <i className="ri-microscope-line text-6xl mb-4"></i>
                                    <p className="font-greycliff text-lg">No Protein Selected</p>
                                    <p className="text-sm mt-2 max-w-[200px]">Select a protein from the list to view its details here.</p>
                                </div>
                             )}
                        </div>
                    </div>

                    {/* Section 2: Ligand Selection */}
                    <h3 className="text-3xl font-argent text-white mb-6">Ligand Selection</h3>
                    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 mb-12">
                         {/* Col 1: Ligand Groups (Filters) - Moved to Left for better UX flow */}
                        <div className="lg:col-span-3 bg-gray-900 rounded-xl border border-white/10 p-6 flex flex-col h-[500px]">
                            <div className="flex justify-between items-center mb-4">
                                <h3 className="font-greycliff text-lg text-white">Ligand Groups</h3>
                                <div className="flex gap-1">
                                    <button onClick={() => setIsCreateGroupModalOpen(true)} disabled={selectedLigands.length === 0} className="p-1.5 rounded bg-white/10 hover:bg-white/20 text-white/80 transition disabled:opacity-50" title="Create Group from Selection"><i className="ri-add-line"></i></button>
                                    <button onClick={() => setIsLigandGroupModalOpen(true)} className="p-1.5 rounded bg-white/10 hover:bg-white/20 text-white/80 transition" title="Upload Group CSV"><i className="ri-upload-cloud-line"></i></button>
                                </div>
                            </div>
                            <div className="flex-grow overflow-y-auto custom-scrollbar space-y-2 pr-1">
                                <button 
                                    onClick={() => { setLigandGroupFilter(''); setLigandPage(1); }} 
                                    className={`w-full text-left p-3 rounded-lg border transition-all flex justify-between items-center ${ligandGroupFilter === '' ? 'bg-cyan-500/20 border-cyan-500/50 text-white' : 'bg-black/20 border-white/5 text-white/60 hover:bg-white/5'}`}
                                >
                                    <span className="text-sm font-medium">All Ligands</span>
                                    <span className="text-xs opacity-60 bg-black/30 px-2 py-0.5 rounded-full">{ligands.length}</span>
                                </button>
                                {ligandGroups.map(g => (
                                    <button 
                                        key={g.name} 
                                        onClick={() => { setLigandGroupFilter(g.name); setLigandPage(1); }} 
                                        className={`w-full text-left p-3 rounded-lg border transition-all flex justify-between items-center ${ligandGroupFilter === g.name ? 'bg-cyan-500/20 border-cyan-500/50 text-white' : 'bg-black/20 border-white/5 text-white/60 hover:bg-white/5'}`}
                                    >
                                        <span className="text-sm font-medium truncate max-w-[150px]">{g.name}</span>
                                        <span className="text-xs opacity-60 bg-black/30 px-2 py-0.5 rounded-full">{g.count}</span>
                                    </button>
                                ))}
                            </div>
                        </div>

                        {/* Col 2: Search & List */}
                        <div className="lg:col-span-5 bg-gray-900 rounded-xl border border-white/10 p-6 flex flex-col h-[500px]">
                            <div className="mb-4">
                                <div className="relative">
                                    <input type="text" placeholder="Search ligand by name or SMILES ID" value={ligandSearch} onChange={e => {setLigandSearch(e.target.value); setLigandPage(1);}} className="w-full bg-black/40 border border-white/10 rounded-lg py-2.5 pl-9 pr-3 text-sm text-white focus:outline-none focus:border-cyan-400/50" />
                                    <i className="ri-search-line absolute left-3 top-3 text-white/40 text-sm"></i>
                                </div>
                            </div>
                             <div className="flex-grow overflow-y-auto border border-white/5 rounded-lg mb-4 custom-scrollbar">
                                <table className="w-full text-sm text-left">
                                    <thead className="bg-black/40 sticky top-0 text-xs text-white/50 z-10">
                                        <tr>
                                            <th className="p-3 text-center w-10">
                                                <input type="checkbox" className="rounded bg-gray-700 border-transparent text-cyan-500 focus:ring-0" 
                                                    checked={paginatedLigands.length > 0 && paginatedLigands.every(l => selectedLigands.some(s => s.id === l.id))}
                                                    onChange={(e) => {
                                                        const isChecked = e.target.checked;
                                                        paginatedLigands.forEach(l => handleSelectLigand(l, isChecked));
                                                    }}
                                                />
                                            </th>
                                            <th className="p-3 cursor-pointer hover:text-white transition-colors" onClick={() => toggleSort(ligandSort, setLigandSort, 'name')}>
                                                Ligand Name <SortIndicator active={ligandSort.key === 'name'} direction={ligandSort.direction} />
                                            </th>
                                            <th className="p-3 cursor-pointer hover:text-white transition-colors" onClick={() => toggleSort(ligandSort, setLigandSort, 'smiles')}>
                                                SMILES ID <SortIndicator active={ligandSort.key === 'smiles'} direction={ligandSort.direction} />
                                            </th>
                                        </tr>
                                    </thead>
                                    <tbody className="text-white/80">
                                        {paginatedLigands.map(l => {
                                            const isSelected = selectedLigands.some(s => s.id === l.id);
                                            return (
                                                <tr key={l.id} className={`border-b border-white/5 hover:bg-white/5 ${isSelected ? 'bg-cyan-500/10' : ''}`}>
                                                    <td className="p-3 text-center">
                                                        <input type="checkbox" checked={isSelected} onChange={(e) => handleSelectLigand(l, e.target.checked)} className="rounded bg-gray-700 border-transparent text-cyan-500 focus:ring-0" />
                                                    </td>
                                                    <td className="p-3 font-medium text-white truncate max-w-[100px]">{l.name}</td>
                                                    <td className="p-3 font-mono text-xs text-white/50 truncate max-w-[150px]">{l.smiles}</td>
                                                </tr>
                                            );
                                        })}
                                    </tbody>
                                </table>
                            </div>
                            <Pagination currentPage={ligandPage} totalPages={ligandTotalPages} onPageChange={setLigandPage} itemsPerPage={ligandItemsPerPage} onItemsPerPageChange={setLigandItemsPerPage} totalItems={filteredLigands.length} pageSizeOptions={[10, 20, 50]} />
                        </div>

                        {/* Col 3: Selected Ligands */}
                        <div className="lg:col-span-4 bg-gray-900 rounded-xl border border-white/10 p-6 flex flex-col h-[500px]">
                             <div className="flex justify-between items-center mb-4">
                                <h3 className="font-greycliff text-lg text-white">Selected Ligands</h3>
                                {selectedLigands.length > 0 && (
                                    <button onClick={() => dispatch({ type: 'SET_SELECTED_LIGANDS', payload: [] })} className="text-xs text-red-400 hover:text-red-300">Clear All</button>
                                )}
                            </div>
                            <div className="flex-grow overflow-y-auto custom-scrollbar bg-black/20 rounded-lg p-2 space-y-1">
                                {selectedLigands.length > 0 ? selectedLigands.map(l => (
                                    <div key={l.id} className="flex justify-between items-center p-2 rounded hover:bg-white/5 group">
                                        <div className="overflow-hidden">
                                            <p className="text-sm text-white truncate">{l.name}</p>
                                            <p className="text-xs text-white/40 font-mono truncate">{l.smiles}</p>
                                        </div>
                                        <button onClick={() => handleSelectLigand(l, false)} className="text-white/30 hover:text-white opacity-0 group-hover:opacity-100 transition"><i className="ri-close-line"></i></button>
                                    </div>
                                )) : (
                                    <div className="h-full flex flex-col items-center justify-center text-white/30 text-sm">
                                        <p>No ligands selected.</p>
                                    </div>
                                )}
                            </div>
                            <div className="mt-4 pt-4 border-t border-white/10 text-right">
                                <span className="text-sm font-greycliff text-white/70">Total Selected: <span className="text-white font-bold">{selectedLigands.length}</span></span>
                            </div>
                        </div>
                    </div>

                    {/* Section 3: Configuration & Launch */}
                    <div className="bg-gray-900 rounded-xl border border-white/10 p-8">
                        <h3 className="text-2xl font-argent text-white mb-6">Configuration & Launch</h3>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-8">
                            <div className="space-y-4">
                                <FormInput label="Run Name" id="run-name" value={runName} onChange={e => setRunName(e.target.value)} placeholder="e.g. Test Run 1" />
                                <FormTextarea label="Description" id="run-desc" value={runDescription} onChange={e => setRunDescription(e.target.value)} placeholder="Optional description..." />
                            </div>
                            <div className="space-y-4">
                                <div>
                                    <label className="block text-sm font-greycliff text-white/70 mb-2">Docking Method</label>
                                    <div className="grid grid-cols-2 gap-4">
                                        <button onClick={() => setDockingType('blind')} className={`p-3 rounded-lg text-center text-sm font-greycliff border transition-all ${dockingType === 'blind' ? 'bg-cyan-500/20 border-cyan-400 text-white' : 'bg-black/20 border-white/10 text-white/60 hover:border-white/30'}`}>Blind Docking</button>
                                        <button onClick={() => setDockingType('targeted')} className={`p-3 rounded-lg text-center text-sm font-greycliff border transition-all ${dockingType === 'targeted' ? 'bg-cyan-500/20 border-cyan-400 text-white' : 'bg-black/20 border-white/10 text-white/60 hover:border-white/30'}`}>Targeted Docking</button>
                                    </div>
                                </div>
                                {dockingType === 'targeted' && (
                                    <div className="grid grid-cols-3 gap-4 animate-fade-in">
                                        <div><label className="text-xs text-white/50 mb-1 block">Center X</label><input type="number" className="w-full bg-black/40 rounded p-2 text-sm text-white border border-white/10 focus:border-cyan-500/50 outline-none" value={centerX} onChange={e => setCenterX(Number(e.target.value))} /></div>
                                        <div><label className="text-xs text-white/50 mb-1 block">Center Y</label><input type="number" className="w-full bg-black/40 rounded p-2 text-sm text-white border border-white/10 focus:border-cyan-500/50 outline-none" value={centerY} onChange={e => setCenterY(Number(e.target.value))} /></div>
                                        <div><label className="text-xs text-white/50 mb-1 block">Center Z</label><input type="number" className="w-full bg-black/40 rounded p-2 text-sm text-white border border-white/10 focus:border-cyan-500/50 outline-none" value={centerZ} onChange={e => setCenterZ(Number(e.target.value))} /></div>
                                    </div>
                                )}
                                <div className="grid grid-cols-2 gap-4">
                                     <div><label className="text-sm text-white/70 mb-1 block">Exhaustiveness ({exhaustiveness})</label><input type="range" min="1" max="32" value={exhaustiveness} onChange={e => setExhaustiveness(Number(e.target.value))} className="w-full h-1 bg-gray-700 rounded-lg appearance-none cursor-pointer accent-cyan-400 mt-2" /></div>
                                     <FormInput label="Binding Modes" id="num-modes" type="number" min="1" max="20" value={numModes} onChange={e => setNumModes(Number(e.target.value))} />
                                </div>
                            </div>
                        </div>
                        
                        <div className="flex justify-end pt-6 border-t border-white/10">
                            <button 
                                onClick={handleRunDocking} 
                                disabled={isDocking || !runName || !selectedProtein || selectedLigands.length === 0}
                                className="px-8 py-4 bg-gradient-to-r from-cyan-500 to-blue-600 rounded-xl font-greycliff text-white font-bold text-lg shadow-lg hover:shadow-cyan-500/20 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-3"
                            >
                                {isDocking ? <i className="ri-loader-4-line animate-spin text-2xl"></i> : <i className="ri-rocket-2-fill text-2xl"></i>}
                                {isDocking ? 'Initializing Docking...' : 'Initialize Docking Run'}
                            </button>
                        </div>
                    </div>
                </div>

                {/* Modals for Create View */}
                <AddProteinModal isOpen={isProteinModalOpen} onClose={() => setIsProteinModalOpen(false)} onAddProtein={handleAddProtein} />
                <AddLigandGroupModal isOpen={isLigandGroupModalOpen} onClose={() => setIsLigandGroupModalOpen(false)} onUpload={handleUploadLigandGroup} title="Upload Ligand Group" />
                <CreateLigandGroupModal isOpen={isCreateGroupModalOpen} onClose={() => setIsCreateGroupModalOpen(false)} onCreate={handleCreateGroup} selectedLigands={selectedLigands} />
            </section>
        );
    }
    
    if (view === 'details' && selectedRunDetails) {
        return (
            <section className="min-h-screen py-24 bg-black">
                <div className="container mx-auto px-6">
                    <button onClick={() => setView('list')} className="mb-8 font-greycliff text-sm text-white/70 hover:text-white transition flex items-center gap-2">
                        <i className="ri-arrow-left-line"></i> Back to Docking Runs
                    </button>
                    <div className="bg-white/5 p-8 rounded-lg mb-8">
                        <div className="flex justify-between items-start">
                            <div>
                                <h2 className="text-3xl font-argent mb-2">{selectedRunDetails.name}</h2>
                                <p className="font-greycliff text-white/70 max-w-2xl">{selectedRunDetails.description}</p>
                            </div>
                            <StatusBadge status={selectedRunDetails.status} />
                        </div>
                        <hr className="border-white/10 my-6" />
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-6 font-greycliff text-sm">
                            <div><p className="text-white/60">Protein</p><p>{selectedRunDetails.proteinName}</p></div>
                            <div><p className="text-white/60">Ligands</p><p>{selectedRunDetails.ligandCount}</p></div>
                            <div><p className="text-white/60">Created By</p><p>{selectedRunDetails.createdBy}</p></div>
                            <div><p className="text-white/60">Created At</p><p>{selectedRunDetails.createdAt}</p></div>
                        </div>
                    </div>
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                        <div className="bg-white/5 p-6 rounded-lg">
                            <div className="flex justify-between items-center mb-4">
                                <h3 className="font-greycliff text-lg">Results Table</h3>
                                <button onClick={handleDownloadCSV} disabled={currentRunResults.length === 0} className="text-sm bg-white/10 hover:bg-white/20 px-3 py-1.5 rounded text-white transition flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed">
                                    <i className="ri-download-line"></i> Download CSV
                                </button>
                            </div>
                            <div className="overflow-auto max-h-[400px] relative border border-white/10 rounded-lg">
                                 <table className="w-full text-sm text-left table-fixed">
                                     <thead className="bg-gray-800 sticky top-0 z-10">
                                         <tr>
                                             <th className="p-3 font-greycliff w-[15%] text-center">No.</th>
                                             <th className="p-3 font-greycliff w-[45%]">SMILES</th>
                                             <th className="p-3 font-greycliff w-[20%] text-right cursor-pointer hover:text-white transition-colors" onClick={() => toggleSort(resultsSort, setResultsSort, 'bindingEnergy')}>
                                                 Energy <SortIndicator active={resultsSort.key === 'bindingEnergy'} direction={resultsSort.direction} />
                                             </th>
                                             <th className="p-3 font-greycliff w-[20%] text-right cursor-pointer hover:text-white transition-colors" onClick={() => toggleSort(resultsSort, setResultsSort, 'rmsd')}>
                                                 RMSD <SortIndicator active={resultsSort.key === 'rmsd'} direction={resultsSort.direction} />
                                             </th>
                                         </tr>
                                     </thead>
                                     <tbody>
                                         {paginatedResults.map((result, index) => (
                                             <tr key={result.id} className={`border-b border-white/10 hover:bg-white/20 cursor-pointer ${selectedResultId === result.id ? 'bg-white/15' : ''}`} onClick={() => setSelectedResultId(result.id)}>
                                                 <td className="p-3 font-greycliff text-center">{((resultsCurrentPage - 1) * resultsItemsPerPage) + index + 1}</td>
                                                 <td className="p-3 font-mono text-xs break-words">{result.smiles}</td>
                                                 <td className="p-3 font-greycliff text-right">{result.bindingEnergy}</td>
                                                 <td className="p-3 font-greycliff text-right">{result.rmsd}</td>
                                             </tr>
                                         ))}
                                     </tbody>
                                 </table>
                            </div>
                            <Pagination currentPage={resultsCurrentPage} totalPages={resultsTotalPages} onPageChange={setResultsCurrentPage} itemsPerPage={resultsItemsPerPage} onItemsPerPageChange={setResultsItemsPerPage} totalItems={currentRunResults.length} />
                        </div>
                        <div className="bg-white/5 p-6 rounded-lg min-h-[400px]">
                            <EChartComponent option={energyChartOption} style={{ width: '100%', height: '100%' }} />
                        </div>
                    </div>
                </div>
            </section>
        );
    }

    // List View (Default)
    return (
        <section id="docking" className="min-h-screen py-24 bg-black">
            <div className="container mx-auto px-6">
                <div className="flex justify-between items-center mb-8">
                    <h2 className="text-4xl font-argent">Docking Runs</h2>
                    <button onClick={() => setView('create')} className="px-6 py-3 font-greycliff !rounded-button flex items-center gap-2 transition-all duration-300 ease-in-out bg-gradient-to-r from-cyan-500 to-blue-500 text-white shadow-lg shadow-cyan-500/20 hover:shadow-xl hover:shadow-cyan-500/40 hover:-translate-y-px">
                        <i className="ri-add-line"></i> Create Docking Run
                    </button>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
                    <DashboardStatCard icon="ri-archive-line" label="Total Docker Runs" value={dashboardStats.totalDocker} color="bg-blue-500/30 text-blue-300" />
                    <DashboardStatCard icon="ri-time-line" label="Average Time" value={dashboardStats.averageTime} color="bg-yellow-500/30 text-yellow-300" />
                    <DashboardStatCard icon="ri-check-double-line" label="Success Reports" value={dashboardStats.successReports} color="bg-green-500/30 text-green-300" />
                    <DashboardStatCard icon="ri-loader-4-line" label="Processing Reports" value={dashboardStats.processingReports} color="bg-cyan-500/30 text-cyan-300" />
                </div>
                
                <div className="bg-white/5 p-4 rounded-lg mb-8 flex flex-col md:flex-row gap-4 items-center">
                    <div className="relative flex-grow w-full md:w-auto">
                        <input type="text" placeholder="Search by run name..." className="w-full pl-10 pr-4 py-2 bg-black/40 rounded-lg font-greycliff text-sm focus:outline-none focus:ring-2 focus:ring-white/20 text-white placeholder-white/50" value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} />
                        <i className="ri-search-line absolute left-3 top-1/2 -translate-y-1/2 text-white/50"></i>
                    </div>
                    <div className="flex gap-4">
                        <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className="bg-black/40 rounded-lg font-greycliff text-sm p-2 text-white focus:outline-none focus:ring-1 focus:ring-white/20">
                            <option value="all">All Status</option>
                            <option value={DockingStatus.SUCCESS}>Success</option>
                            <option value={DockingStatus.PROCESSING}>Processing</option>
                            <option value={DockingStatus.FAILURE}>Failure</option>
                        </select>
                        <select value={userFilter} onChange={(e) => setUserFilter(e.target.value)} className="bg-black/40 rounded-lg font-greycliff text-sm p-2 text-white focus:outline-none focus:ring-1 focus:ring-white/20">
                            <option value="all">All Users</option>
                            {[...new Set(dockingRuns.map(r => r.createdBy).filter(Boolean))].map(u => <option key={u} value={u}>{u}</option>)}
                        </select>
                    </div>
                </div>

                <div className="bg-white/5 p-6 rounded-lg">
                    <div className="overflow-auto max-h-[600px] relative border border-white/10 rounded-lg">
                        <table className="w-full text-sm text-left">
                            <thead className="bg-gray-800 sticky top-0 z-10">
                                <tr>
                                    <th className="p-3 font-greycliff w-[20%] cursor-pointer hover:text-white transition-colors" onClick={() => toggleSort(runsSort, setRunsSort, 'name')}>
                                        Name <SortIndicator active={runsSort.key === 'name'} direction={runsSort.direction} />
                                    </th>
                                    <th className="p-3 font-greycliff w-[15%] cursor-pointer hover:text-white transition-colors" onClick={() => toggleSort(runsSort, setRunsSort, 'proteinName')}>
                                        Protein <SortIndicator active={runsSort.key === 'proteinName'} direction={runsSort.direction} />
                                    </th>
                                    <th className="p-3 font-greycliff text-center cursor-pointer hover:text-white transition-colors" onClick={() => toggleSort(runsSort, setRunsSort, 'ligandCount')}>
                                        Ligands <SortIndicator active={runsSort.key === 'ligandCount'} direction={runsSort.direction} />
                                    </th>
                                    <th className="p-3 font-greycliff cursor-pointer hover:text-white transition-colors" onClick={() => toggleSort(runsSort, setRunsSort, 'dockingType')}>
                                        Docking Type <SortIndicator active={runsSort.key === 'dockingType'} direction={runsSort.direction} />
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
                                    <th className="p-3 font-greycliff text-center">Actions</th>
                                </tr>
                            </thead>
                            <tbody>
                                {paginatedRuns.length > 0 ? paginatedRuns.map(run => (
                                    <tr key={run.id} className="border-b border-white/10 hover:bg-white/5 transition-colors">
                                        <td className="p-3 font-greycliff text-white">{run.name}</td>
                                        <td className="p-3 font-greycliff">{run.proteinName}</td>
                                        <td className="p-3 font-greycliff text-center">{run.ligandCount}</td>
                                        <td className="p-3 font-greycliff capitalize">{run.dockingType}</td>
                                        <td className="p-3 font-greycliff">{run.createdAt}</td>
                                        <td className="p-3 font-greycliff">{run.createdBy}</td>
                                        <td className="p-3 font-greycliff text-center"><StatusBadge status={run.status} /></td>
                                        <td className="p-3 text-center">
                                            <div className="flex justify-center items-center gap-2">
                                                <button onClick={() => handleViewDetails(run)} disabled={run.status !== DockingStatus.SUCCESS} className="p-1 text-white/70 hover:text-white disabled:text-white/30 disabled:cursor-not-allowed transition"><i className="ri-eye-line"></i></button>
                                                <button onClick={() => handleDeleteRun(run.id)} className="p-1 text-red-500/70 hover:text-red-500 transition"><i className="ri-delete-bin-line"></i></button>
                                            </div>
                                        </td>
                                    </tr>
                                )) : (
                                    <tr><td colSpan={8} className="p-8 text-center font-greycliff text-white/50">No docking runs found.</td></tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                    <Pagination currentPage={runsCurrentPage} totalPages={runsTotalPages} onPageChange={setRunsCurrentPage} itemsPerPage={runsItemsPerPage} onItemsPerPageChange={setRunsItemsPerPage} totalItems={filteredRuns.length} />
                </div>
            </div>
        </section>
    );
};
