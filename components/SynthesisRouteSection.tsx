
import React, { useState, useMemo, useEffect } from 'react';
import { useStore } from '../store/store';
import { Pagination } from './Pagination';
import { InitializeSynthesisRunModal } from './InitializeSynthesisRunModal';
import { NotificationType, SynthesisReport } from '../types';
import { ConfirmationModal } from './ConfirmationModal';
import api from '../config/api';
import { formatDate12h, toEpochMs } from '../utils/dateTime';

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

const StatusBadge: React.FC<{ status: string }> = ({ status }) => {
    const statusStyles: { [key: string]: string } = {
        'success': 'bg-green-500/10 text-green-500',
        'processing': 'bg-blue-500/10 text-blue-400 animate-pulse',
        'failure': 'bg-red-500/10 text-red-500',
    };
    return (
        <span className={`px-4 py-1 text-xs font-greycliff font-bold rounded-full capitalize ${statusStyles[status] || 'bg-gray-500/20 text-gray-400'}`}>
            {status}
        </span>
    );
};

interface RouteCardProps {
  number: number;
  steps: number;
  yieldPerc: number;
  onAnalyze: () => void;
}

const RouteCard: React.FC<RouteCardProps> = ({ number, steps, yieldPerc, onAnalyze }) => (
  <div className="bg-[#0b0c10] border border-white/5 rounded-xl p-6 relative overflow-hidden group hover:border-white/10 transition-all shadow-xl">
    <div className="flex justify-between items-start mb-10">
      <div className="flex items-center gap-4">
        <div className="w-8 h-8 rounded bg-blue-500/10 border border-blue-500/20 flex items-center justify-center">
          <span className="text-blue-400 font-bold text-[10px] font-greycliff">R{number}</span>
        </div>
        <h4 className="text-lg font-argent text-white">Route {number}</h4>
      </div>
      <i className="ri-stack-line text-white/10 text-xl"></i>
    </div>
    
    <div className="flex justify-between items-end mb-8">
      <div>
        <p className="text-[9px] font-bold text-white/30 uppercase tracking-widest font-greycliff mb-1">Complexity</p>
        <p className="text-white font-greycliff font-bold">{steps} Steps</p>
      </div>
      <div className="text-right">
        <p className="text-[9px] font-bold text-white/30 uppercase tracking-widest font-greycliff mb-1">Total Yield</p>
        <p className="text-green-400 font-greycliff font-bold">{yieldPerc}%</p>
      </div>
    </div>

    <button 
      onClick={onAnalyze}
      className="w-full py-3 bg-white/5 hover:bg-white/10 border border-white/5 rounded-lg text-[10px] font-bold tracking-widest uppercase text-white/70 transition-all flex items-center justify-center gap-2"
    >
      Analyze Pathway <i className="ri-arrow-right-s-line"></i>
    </button>
  </div>
);

interface Step {
  id: string;
  smiles: string;
  yieldPerc: number;
  confidence: number;
  conditions: string;
  reagents: string;
  reactantA?: string;
  reactantB?: string;
  product?: string;
}

type SortKey = keyof SynthesisReport;
interface SortConfig {
  key: SortKey;
  direction: 'asc' | 'desc';
}

type StepSortKey = keyof Step;
interface StepSortConfig {
  key: StepSortKey;
  direction: 'asc' | 'desc';
}

export const SynthesisRouteSection: React.FC = () => {
    const { state, dispatch } = useStore();
    const { synthesisReports } = state;
    const [view, setView] = useState<'list' | 'details' | 'analysis'>('list');
    const [selectedReport, setSelectedReport] = useState<SynthesisReport | null>(null);
    const [candidateRoutes, setCandidateRoutes] = useState<any[]>([]);
    const [selectedRoute, setSelectedRoute] = useState<any | null>(null);
    const [pathwaySteps, setPathwaySteps] = useState<Step[]>([]);
    const [selectedStepIndex, setSelectedStepIndex] = useState(0);
    const [searchTerm, setSearchTerm] = useState('');
    const [currentPage, setCurrentPage] = useState(1);
    const [itemsPerPage, setItemsPerPage] = useState(5);
    const [isModalOpen, setIsModalOpen] = useState(false);
    
    // Sorting States
    const [sortConfig, setSortConfig] = useState<SortConfig>({ key: 'generatedOn', direction: 'desc' });
    const [stepSortConfig, setStepSortConfig] = useState<StepSortConfig>({ key: 'id', direction: 'asc' });
    
    // Delete State
    const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
    const [reportToDelete, setReportToDelete] = useState<SynthesisReport | null>(null);
    const [isDeleting, setIsDeleting] = useState(false);

    const mapApiSynthesisReport = (apiReport: any): SynthesisReport => ({
      id: String(apiReport?.id ?? ''),
      projectName: apiReport?.projectName || apiReport?.project_name || apiReport?.title || `Report ${apiReport?.id ?? ''}`,
      targetMolecule: apiReport?.targetMolecule || apiReport?.target_molecule || '',
      generatedOn: apiReport?.generatedOn || apiReport?.generated_on || apiReport?.created_at || '',
      routes: Number(apiReport?.routes ?? apiReport?.route_count ?? 0),
      status: (apiReport?.status || 'processing') as SynthesisReport['status'],
    });

    const addNotification = (message: string, type: NotificationType) => {
        const id = Date.now();
        dispatch({ type: 'ADD_NOTIFICATION', payload: { id, message, type } });
        setTimeout(() => dispatch({ type: 'REMOVE_NOTIFICATION', payload: id }), 3000);
    };

    useEffect(() => {
        if (view === 'list') {
            fetchReports();
        }
    }, [view]);

    const fetchReports = async () => {
        dispatch({ type: 'SET_LOADING', payload: true });
        try {
            const data = await api.get('/synthesis/reports');
            dispatch({
              type: 'SET_SYNTHESIS_REPORTS',
              payload: (Array.isArray(data) ? data : []).map(mapApiSynthesisReport),
            });
        } catch (error) {
            console.error(error);
        } finally {
            dispatch({ type: 'SET_LOADING', payload: false });
        }
    };

    const handleStartRun = async (title: string, smiles: string, material: string) => {
        setIsModalOpen(false);
        dispatch({ type: 'SET_LOADING', payload: true });
        try {
            const newReport = await api.post('/synthesis/generate', {
                project_name: title,
                target_molecule: smiles,
                starting_material: material
            });
            dispatch({ type: 'SET_SYNTHESIS_REPORTS', payload: [mapApiSynthesisReport(newReport), ...synthesisReports] });
            addNotification(`Synthesis run "${title}" initiated. AI engine is calculating retrosynthetic pathways.`, NotificationType.SUCCESS);
        } catch (error) {
            addNotification('Failed to start synthesis run.', NotificationType.ERROR);
        } finally {
            dispatch({ type: 'SET_LOADING', payload: false });
        }
    };

    const handleViewReport = async (report: SynthesisReport) => {
        if (report.status !== 'success') return;
        dispatch({ type: 'SET_LOADING', payload: true });
        try {
            const data = await api.get(`/synthesis/reports/${report.id}`);
            setSelectedReport(report);
            setCandidateRoutes(data.routes || []);
            setView('details');
        } catch (error) {
            addNotification('Failed to load report candidate routes.', NotificationType.ERROR);
        } finally {
            dispatch({ type: 'SET_LOADING', payload: false });
        }
    };

    const handleAnalyzePathway = async (route: any) => {
        dispatch({ type: 'SET_LOADING', payload: true });
        try {
            const data = await api.get(`/synthesis/reports/${selectedReport?.id}/routes/${route.number}/steps`);
            setPathwaySteps(data.steps || []);
            setSelectedRoute(route);
            setSelectedStepIndex(0);
            setView('analysis');
        } catch (error) {
            addNotification('Failed to load pathway analysis steps.', NotificationType.ERROR);
        } finally {
            dispatch({ type: 'SET_LOADING', payload: false });
        }
    };

    const confirmDelete = (report: SynthesisReport) => {
        setReportToDelete(report);
        setIsDeleteModalOpen(true);
    };

    const handleDeleteReport = async () => {
        if (!reportToDelete) return;
        setIsDeleting(true);
        try {
            await api.delete(`/synthesis/reports/${reportToDelete.id}`);
            dispatch({ type: 'DELETE_SYNTHESIS_REPORT', payload: reportToDelete.id });
            addNotification(`Report "${reportToDelete.projectName}" deleted successfully.`, NotificationType.SUCCESS);
        } catch (error) {
            addNotification('Failed to delete synthesis report.', NotificationType.ERROR);
        } finally {
            setIsDeleting(false);
            setIsDeleteModalOpen(false);
            setReportToDelete(null);
        }
    };

    const handleSort = (key: SortKey) => {
      let direction: 'asc' | 'desc' = 'asc';
      if (sortConfig.key === key && sortConfig.direction === 'asc') {
        direction = 'desc';
      }
      setSortConfig({ key, direction });
    };

    const handleStepSort = (key: StepSortKey) => {
      let direction: 'asc' | 'desc' = 'asc';
      if (stepSortConfig.key === key && stepSortConfig.direction === 'asc') {
        direction = 'desc';
      }
      setStepSortConfig({ key, direction });
    };

    const sortedAndFilteredReports = useMemo(() => {
      const filtered = synthesisReports.filter(report => 
        report.projectName.toLowerCase().includes(searchTerm.toLowerCase())
      );

      return [...filtered].sort((a, b) => {
        let valA = a[sortConfig.key];
        let valB = b[sortConfig.key];
        if (sortConfig.key === 'generatedOn' && typeof valA === 'string' && typeof valB === 'string') {
          const parsedA = toEpochMs(valA);
          const parsedB = toEpochMs(valB);
          if (parsedA != null && parsedB != null) {
            valA = parsedA as any;
            valB = parsedB as any;
          }
        }
        if (valA < valB) return sortConfig.direction === 'asc' ? -1 : 1;
        if (valA > valB) return sortConfig.direction === 'asc' ? 1 : -1;
        return 0;
      });
    }, [synthesisReports, searchTerm, sortConfig]);

    const sortedPathwaySteps = useMemo(() => {
      return [...pathwaySteps].sort((a, b) => {
        const valA = a[stepSortConfig.key] ?? '';
        const valB = b[stepSortConfig.key] ?? '';
        if (valA < valB) return stepSortConfig.direction === 'asc' ? -1 : 1;
        if (valA > valB) return stepSortConfig.direction === 'asc' ? 1 : -1;
        return 0;
      });
    }, [pathwaySteps, stepSortConfig]);

    const paginatedReports = useMemo(() => 
      sortedAndFilteredReports.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage),
      [sortedAndFilteredReports, currentPage, itemsPerPage]
    );

    const totalPages = Math.ceil(sortedAndFilteredReports.length / itemsPerPage);

    const SortIndicator = ({ columnKey, activeKey, direction }: { columnKey: string, activeKey: string, direction: 'asc' | 'desc' }) => {
      if (activeKey !== columnKey) return <i className="ri-expand-up-down-line ml-1 opacity-20"></i>;
      return direction === 'asc' 
        ? <i className="ri-arrow-up-s-line ml-1 text-cyan-400"></i> 
        : <i className="ri-arrow-down-s-line ml-1 text-cyan-400"></i>;
    };

    if (view === 'analysis' && selectedReport && selectedRoute) {
      const currentStep = sortedPathwaySteps[selectedStepIndex];
      return (
        <section className="min-h-screen py-24 bg-black">
          <div className="container mx-auto px-6">
            <button 
              onClick={() => setView('details')}
              className="mb-10 font-greycliff text-[11px] font-bold tracking-widest text-white/40 hover:text-white transition flex items-center gap-2 uppercase"
            >
              <i className="ri-arrow-left-line"></i> Back to report dashboard
            </button>

            <div className="bg-[#111318] p-10 rounded-2xl border border-white/5 mb-8 shadow-2xl relative overflow-hidden flex flex-col md:flex-row justify-between items-center gap-8">
              <div>
                <h2 className="text-4xl font-argent text-white mb-2">Pathway Analysis: Route {selectedRoute.number}</h2>
                <p className="text-white/40 font-greycliff text-sm uppercase tracking-widest font-bold">Step-by-step structural transformation</p>
              </div>
              <div className="flex gap-4">
                <span className="px-4 py-1.5 bg-blue-500/10 border border-blue-500/30 rounded-full text-[10px] font-bold tracking-widest text-blue-400 uppercase">{selectedRoute.steps} Reactive Steps</span>
                <span className="px-4 py-1.5 bg-green-500/10 border border-blue-500/30 rounded-full text-[10px] font-bold tracking-widest text-green-400 uppercase">{selectedRoute.yield}% Cumulative Yield</span>
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
              <div className="lg:col-span-7 bg-[#111318] border border-white/5 rounded-2xl overflow-hidden shadow-xl">
                <div className="p-4 border-b border-white/5 flex items-center gap-2">
                   <i className="ri-stack-line text-white/20"></i>
                   <h3 className="font-greycliff font-bold text-[10px] uppercase tracking-widest text-white/60">Retrosynthesis Steps</h3>
                </div>
                <div className="overflow-auto max-h-[550px] custom-scrollbar">
                  <table className="w-full text-left">
                    <thead className="bg-gray-800 text-[9px] uppercase tracking-widest text-white/40 font-bold sticky top-0 z-10">
                      <tr>
                        <th className="p-4 pl-6 cursor-pointer hover:bg-gray-700 transition-colors" onClick={() => handleStepSort('id')}>
                          # <SortIndicator columnKey="id" activeKey={stepSortConfig.key} direction={stepSortConfig.direction} />
                        </th>
                        <th className="p-4 cursor-pointer hover:bg-gray-700 transition-colors" onClick={() => handleStepSort('smiles')}>
                          Reaction SMILES <SortIndicator columnKey="smiles" activeKey={stepSortConfig.key} direction={stepSortConfig.direction} />
                        </th>
                        <th className="p-4 text-right pr-6 cursor-pointer hover:bg-gray-700 transition-colors" onClick={() => handleStepSort('yieldPerc')}>
                          Yield <SortIndicator columnKey="yieldPerc" activeKey={stepSortConfig.key} direction={stepSortConfig.direction} />
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-white/5">
                      {sortedPathwaySteps.map((step, idx) => (
                        <tr 
                          key={step.id} 
                          onClick={() => setSelectedStepIndex(idx)}
                          className={`cursor-pointer transition-colors group ${selectedStepIndex === idx ? 'bg-blue-500/[0.03]' : 'hover:bg-white/[0.01]'}`}
                        >
                          <td className={`p-4 pl-6 text-[11px] font-bold font-mono ${selectedStepIndex === idx ? 'text-blue-400' : 'text-white/20'}`}>{step.id}</td>
                          <td className={`p-4 font-mono text-[10px] truncate max-w-[300px] ${selectedStepIndex === idx ? 'text-white/80' : 'text-white/30 group-hover:text-white/50'}`}>
                            {step.smiles}
                          </td>
                          <td className={`p-4 text-right pr-6 text-[11px] font-bold ${selectedStepIndex === idx ? 'text-green-400' : 'text-white/40 group-hover:text-white/60'}`}>{step.yieldPerc}%</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              <div className="lg:col-span-5 space-y-8">
                {currentStep && (
                  <div className="bg-[#111318] p-8 rounded-2xl border border-white/5 shadow-xl">
                    <div className="flex items-center gap-3 mb-10">
                      <i className="ri-pulse-line text-blue-400"></i>
                      <h3 className="font-greycliff font-bold text-white text-[11px] uppercase tracking-widest">Target Transformation Product</h3>
                    </div>

                    <div className="bg-white rounded-xl p-6 mb-10 relative border border-white/10 shadow-inner flex items-center justify-center min-h-[300px]">
                      <p className="absolute top-4 left-4 text-[9px] font-bold text-gray-400 uppercase tracking-widest">Step {currentStep.id} Product</p>
                      <img 
                        src={currentStep.product || "https://public.readdy.ai/ai/img_res/a3577d6bc6596859846bc038622c4d62.jpg"} 
                        alt="Target Product" 
                        className="max-w-full max-h-full object-contain filter contrast-125 opacity-90 hover:opacity-100 transition-opacity" 
                      />
                    </div>

                    <div className="grid grid-cols-1 gap-4 mb-6">
                       <div className="bg-black/20 p-4 rounded-xl border border-white/5">
                          <p className="text-[9px] font-bold text-white/30 uppercase tracking-widest mb-2">Reagents & Conditions</p>
                          <div className="flex flex-wrap gap-2">
                             <span className="px-2 py-1 bg-blue-500/10 text-blue-300 text-[10px] font-bold rounded border border-blue-500/20">{currentStep.reagents}</span>
                             <span className="px-2 py-1 bg-green-500/10 text-green-300 text-[10px] font-bold rounded border border-green-500/20">{currentStep.conditions}</span>
                          </div>
                       </div>
                    </div>

                    <div className="pt-6 border-t border-white/5">
                      <div className="flex justify-between items-center mb-3">
                        <p className="text-[9px] font-bold text-white/30 uppercase tracking-widest">AI Prediction Confidence</p>
                        <p className="text-white font-greycliff font-bold text-xs">{currentStep.confidence}%</p>
                      </div>
                      <div className="w-full h-1 bg-white/5 rounded-full overflow-hidden">
                        <div 
                          className="h-full bg-blue-500 transition-all duration-500 ease-out shadow-[0_0_10px_rgba(59,130,246,0.5)]" 
                          style={{ width: `${currentStep.confidence}%` }}
                        ></div>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>

            <div className="mt-8 bg-[#111318] p-6 rounded-2xl border border-white/5 flex items-center justify-between">
               <div className="flex items-center gap-4 flex-1 min-w-0">
                  <div className="w-auto min-w-[100px] h-10 px-3 bg-white/5 rounded-lg flex items-center justify-center font-bold text-white font-mono text-xs truncate">
                    {currentStep?.id || '--'}
                  </div>
                  <p className="text-sm font-greycliff text-white/60 whitespace-nowrap">Selected Step Context</p>
               </div>
               <div className="flex gap-4 ml-4">
                  <button 
                    disabled={selectedStepIndex === 0}
                    onClick={() => setSelectedStepIndex(prev => prev - 1)}
                    className="px-6 py-2.5 bg-white/5 hover:bg-white/10 rounded-xl font-bold text-[10px] tracking-widest text-white/40 uppercase transition-all disabled:opacity-20"
                  >
                    Prev
                  </button>
                  <button 
                    disabled={selectedStepIndex === sortedPathwaySteps.length - 1}
                    onClick={() => setSelectedStepIndex(prev => prev + 1)}
                    className="px-8 py-2.5 bg-blue-600 hover:bg-blue-500 rounded-xl font-bold text-[10px] tracking-widest text-white uppercase transition-all disabled:opacity-20 shadow-lg shadow-blue-500/20"
                  >
                    Next
                  </button>
               </div>
            </div>
          </div>
        </section>
      );
    }

    if (view === 'details' && selectedReport) {
      return (
        <section className="min-h-screen py-24 bg-black">
          <div className="container mx-auto px-6">
            <button 
              onClick={() => setView('list')}
              className="mb-10 font-greycliff text-[11px] font-bold tracking-widest text-white/40 hover:text-white transition flex items-center gap-2 uppercase"
            >
              <i className="ri-arrow-left-line"></i> Back to all reports
            </button>

            <div className="flex flex-col lg:flex-row justify-between items-start mb-12 gap-8">
              <div className="max-w-3xl">
                <h2 className="text-5xl font-argent text-white mb-4">{selectedReport.projectName}</h2>
                <p className="text-white/50 font-greycliff text-lg leading-relaxed mb-10">
                  Optimization of {selectedReport.projectName} pathway targeting high molecular purity.
                </p>
                
                <div className="flex flex-wrap gap-12">
                  <div>
                    <p className="text-[10px] font-bold uppercase tracking-widest text-white/30 mb-2 font-greycliff">Target Molecule</p>
                    <p className="text-blue-400 font-mono text-xs">{selectedReport.targetMolecule}</p>
                  </div>
                  <div>
                    <p className="text-[10px] font-bold uppercase tracking-widest text-white/30 mb-2 font-greycliff">Timestamp</p>
                    <p className="text-white/60 font-greycliff text-xs uppercase">{formatDate12h(selectedReport.generatedOn)}</p>
                  </div>
                </div>
              </div>

              <div className="flex gap-4">
                <div className="bg-[#111318] border border-white/5 p-6 rounded-2xl w-40 flex flex-col items-center justify-center text-center">
                  <p className="text-[9px] font-bold text-white/30 uppercase tracking-widest font-greycliff mb-2">Candidate Routes</p>
                  <p className="text-4xl font-argent text-white">{selectedReport.routes}</p>
                </div>
                <div className="bg-[#111318] border border-white/5 p-6 rounded-2xl w-40 flex flex-col items-center justify-center text-center">
                  <p className="text-[9px] font-bold text-white/30 uppercase tracking-widest font-greycliff mb-2">Best Yield</p>
                  <p className="text-4xl font-argent text-green-400">{candidateRoutes.length > 0 ? Math.max(...candidateRoutes.map(r => r.yield)) : 0}%</p>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {candidateRoutes.map((route, idx) => (
                <RouteCard 
                  key={idx} 
                  number={route.number} 
                  steps={route.steps} 
                  yieldPerc={route.yield} 
                  onAnalyze={() => handleAnalyzePathway(route)} 
                />
              ))}
            </div>
          </div>
        </section>
      );
    }

    return (
        <section className="min-h-screen py-24 bg-black">
            <div className="container mx-auto px-6">
                <div className="flex justify-between items-center mb-8">
                    <div>
                        <h2 className="text-4xl font-argent text-white">Synthesis Reports</h2>
                        <p className="text-white/60 font-greycliff text-sm mt-1 max-w-2xl">
                            Retrosynthetic pathways optimized for maximum atom economy and chemical efficiency.
                        </p>
                    </div>
                    <button 
                        onClick={() => setIsModalOpen(true)}
                        className="px-6 py-3 font-greycliff !rounded-button flex items-center gap-2 transition-all duration-300 ease-in-out bg-gradient-to-r from-cyan-500 to-blue-500 text-white shadow-lg shadow-cyan-500/20 hover:shadow-xl hover:shadow-cyan-500/40 hover:-translate-y-px"
                    >
                        <i className="ri-add-line"></i> New Study Run
                    </button>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
                    <DashboardStatCard icon="ri-file-list-3-line" label="Total Reports" value={synthesisReports.length} color="bg-blue-500/30 text-blue-300" />
                    <DashboardStatCard icon="ri-checkbox-circle-line" label="Completed" value={synthesisReports.filter(r => r.status === 'success').length} color="bg-green-500/30 text-green-300" />
                    <DashboardStatCard icon="ri-pulse-line" label="Total Paths" value={synthesisReports.reduce((acc, r) => acc + r.routes, 0)} color="bg-purple-500/30 text-purple-300" />
                    <DashboardStatCard icon="ri-flashlight-line" label="Success Rate" value="96.4%" color="bg-yellow-500/30 text-yellow-300" />
                </div>

                <div className="bg-white/5 p-6 rounded-lg border border-white/10 shadow-xl">
                    <div className="overflow-auto max-h-[600px] relative border border-white/10 rounded-lg">
                        <table className="w-full text-sm text-left">
                            <thead className="bg-gray-800 sticky top-0 z-10 text-white font-greycliff">
                                <tr>
                                    <th 
                                      className="p-3 font-greycliff w-[25%] cursor-pointer hover:bg-gray-700 transition-colors group select-none"
                                      onClick={() => handleSort('projectName')}
                                    >
                                      Research Project <SortIndicator columnKey="projectName" activeKey={sortConfig.key} direction={sortConfig.direction} />
                                    </th>
                                    <th 
                                      className="p-3 font-greycliff w-[30%] cursor-pointer hover:bg-gray-700 transition-colors group select-none"
                                      onClick={() => handleSort('targetMolecule')}
                                    >
                                      Target Molecule <SortIndicator columnKey="targetMolecule" activeKey={sortConfig.key} direction={sortConfig.direction} />
                                    </th>
                                    <th 
                                      className="p-3 font-greycliff cursor-pointer hover:bg-gray-700 transition-colors group select-none"
                                      onClick={() => handleSort('generatedOn')}
                                    >
                                      Generated On <SortIndicator columnKey="generatedOn" activeKey={sortConfig.key} direction={sortConfig.direction} />
                                    </th>
                                    <th 
                                      className="p-3 font-greycliff text-center cursor-pointer hover:bg-gray-700 transition-colors group select-none"
                                      onClick={() => handleSort('routes')}
                                    >
                                      Routes <SortIndicator columnKey="routes" activeKey={sortConfig.key} direction={sortConfig.direction} />
                                    </th>
                                    <th 
                                      className="p-3 font-greycliff text-center cursor-pointer hover:bg-gray-700 transition-colors group select-none"
                                      onClick={() => handleSort('status')}
                                    >
                                      Status <SortIndicator columnKey="status" activeKey={sortConfig.key} direction={sortConfig.direction} />
                                    </th>
                                    <th className="p-3 font-greycliff text-center select-none">Actions</th>
                                    </tr>
                            </thead>
                            <tbody>
                                {paginatedReports.map(report => (
                                    <tr key={report.id} className="border-b border-white/10 hover:bg-white/5 transition-colors group">
                                        <td className="p-3">
                                            <div className="font-greycliff font-bold text-white">{report.projectName}</div>
                                            <div className="text-[10px] text-white/40 font-bold uppercase mt-1">ID: {report.id}</div>
                                        </td>
                                        <td className="p-3 text-xs text-white/50 font-mono truncate max-w-[200px]" title={report.targetMolecule}>
                                            {report.targetMolecule}
                                        </td>
                                        <td className="p-3 font-greycliff text-white/70 text-sm">
                                            {formatDate12h(report.generatedOn)}
                                        </td>
                                        <td className="p-3 text-center">
                                            <span className="text-white/80 font-bold">{report.routes}</span>
                                        </td>
                                        <td className="p-3 text-center">
                                            <StatusBadge status={report.status} />
                                        </td>
                                        <td className="p-3 text-center">
                                            <div className="flex justify-center items-center gap-6">
                                                <button 
                                                  onClick={() => handleViewReport(report)}
                                                  className={`text-white/70 hover:text-white transition-all transform hover:scale-110 ${report.status !== 'success' ? 'opacity-20 cursor-not-allowed' : ''}`} 
                                                  title="View Report"
                                                  disabled={report.status !== 'success'}
                                                >
                                                  <i className="ri-eye-line text-lg"></i>
                                                </button>
                                                <button 
                                                  onClick={() => confirmDelete(report)}
                                                  className="text-white/30 hover:text-red-500 transition-all transform hover:scale-110"
                                                  title="Delete Report"
                                                >
                                                  <i className="ri-delete-bin-line text-lg"></i>
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                                {paginatedReports.length === 0 && (
                                    <tr>
                                        <td colSpan={6} className="p-12 text-center text-white/20 font-greycliff font-bold uppercase tracking-widest">No reports found.</td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                    {sortedAndFilteredReports.length > itemsPerPage && (
                        <Pagination 
                            currentPage={currentPage} 
                            totalPages={totalPages} 
                            onPageChange={setCurrentPage}
                            itemsPerPage={itemsPerPage}
                            onItemsPerPageChange={setItemsPerPage}
                            totalItems={sortedAndFilteredReports.length}
                        />
                    )}
                </div>
            </div>
            <InitializeSynthesisRunModal 
                isOpen={isModalOpen} 
                onClose={() => setIsModalOpen(false)} 
                onStart={handleStartRun} 
            />
            <ConfirmationModal 
                isOpen={isDeleteModalOpen}
                onClose={() => setIsDeleteModalOpen(false)}
                onConfirm={handleDeleteReport}
                title="Delete Synthesis Report"
                message={`Are you sure you want to delete the research project "${reportToDelete?.projectName}"? All route analyses and data associated with this run will be permanently removed.`}
                confirmText="Delete"
                isConfirming={isDeleting}
            />
        </section>
    );
};
