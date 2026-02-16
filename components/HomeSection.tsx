
import React, { useMemo, useEffect, useState } from 'react';
import { UserRole as UserRoleEnum, SavedModel, DockingRun, User, UserStatus, UserRole, DockingStatus, TrainingRun, TrainingStatus, PredictionRun, PredictionStatus, CompoundGenRun, SynthesisReport, View } from '../types';
import { EChartComponent } from './EChartComponent';
import type { EChartsOption } from 'echarts';
import { UserManagementSection } from './UserManagementSection';
import { useStore } from '../store/store';
import api from '../config/api';
import { normalizeUserPhoto } from '../utils/userPhoto';
import { toEpochMs } from '../utils/dateTime';

interface DashboardSummary {
  proteinCount: number;
  ligandCount: number;
  ligandGroupCount?: number;
  modelCount: number;
  dockingRunCount: number;
  trainingRunCount: number;
  predictionRunCount: number;
  modelAccuracyRange?: string;
  totalLigandsDocked?: number;
}

const NewStatCard: React.FC<{ 
  icon: string; 
  label: string; 
  value: string | number; 
  subtext?: string; 
  iconColor: string; 
  bgColor: string;
}> = ({ icon, label, value, subtext, iconColor, bgColor }) => (
  <div className="bg-[#111318] p-6 rounded-2xl border border-white/5 flex items-center gap-6 hover:border-white/10 transition-all group shadow-lg shadow-black/20">
    <div className={`w-14 h-14 rounded-full flex items-center justify-center shrink-0 ${bgColor} ${iconColor} bg-opacity-10 group-hover:bg-opacity-20 transition-all`}>
      <i className={`${icon} text-2xl`}></i>
    </div>
    <div>
      <p className="text-white/50 font-greycliff text-xs font-semibold uppercase tracking-wider mb-1">{label}</p>
      <p className="text-white font-argent text-3xl leading-none">{value}</p>
      {subtext && <p className="text-white/30 font-greycliff text-xs mt-1">{subtext}</p>}
    </div>
  </div>
);

// Generic status badge for all run types
const StatusBadge: React.FC<{ status: string }> = ({ status }) => {
    const statusStyles: { [key: string]: string } = {
        'success': 'bg-green-500/10 text-green-400 border-green-500/20',
        'processing': 'bg-blue-500/10 text-blue-400 border-blue-500/20 animate-pulse',
        'failure': 'bg-red-500/10 text-red-400 border-red-500/20',
    };
    return (
        <span className={`inline-flex shrink-0 px-2 py-1 text-xs font-greycliff rounded border capitalize whitespace-nowrap ${statusStyles[status] || 'bg-gray-500/20 text-gray-400 border-gray-500/30'}`}>
            {status}
        </span>
    );
};

// MAPPING FUNCTIONS
const mapApiDockingRunToDockingRun = (apiRun: any, currentUser: any): DockingRun => ({
    id: String(apiRun.id),
    name: apiRun.name,
    description: apiRun.description || '',
    proteinName: apiRun.protein_name,
    ligandCount: apiRun.ligand_count,
    dockingType: apiRun.docking_type,
    createdAt: apiRun.created_at || apiRun.createdAt || '',
    createdBy: apiRun.created_by || currentUser?.name || 'Unknown',
    status: apiRun.status as DockingStatus,
    duration: apiRun.duration,
    exhaustiveness: apiRun.exhaustiveness,
    numModes: apiRun.num_modes,
    center_x: apiRun.center_x,
    center_y: apiRun.center_y,
    center_z: apiRun.center_z,
});

const mapApiTrainingRunToTrainingRun = (apiRun: any, currentUser: any): TrainingRun => ({
    id: String(apiRun.id),
    name: apiRun.name,
    datasetName: apiRun.datasetName || apiRun.dataset_name || 'N/A',
    taskType: apiRun.taskType || apiRun.task_type || 'Prediction',
    createdAt: apiRun.createdAt || apiRun.created_at || '',
    createdBy: apiRun.createdBy || apiRun.created_by || currentUser?.name || 'Unknown',
    status: apiRun.status as TrainingStatus,
    duration: apiRun.duration,
    modelCount: apiRun.modelCount || apiRun.model_count || 0,
});

const mapApiPredictionRunToPredictionRun = (apiRun: any, currentUser: any): PredictionRun => ({
    id: String(apiRun.id),
    name: apiRun.name,
    description: apiRun.description,
    modelName: apiRun.modelName || apiRun.model_name || 'N/A',
    modelId: String(apiRun.modelId || apiRun.model_id || ''),
    modelType: apiRun.modelType || apiRun.model_type || 'N/A',
    modelBuilderName: apiRun.modelBuilderName || apiRun.model_builder_name || 'N/A',
    inputCount: apiRun.inputCount || apiRun.input_count || 0,
    createdAt: apiRun.createdAt || apiRun.created_at || '',
    createdBy: apiRun.createdBy || apiRun.created_by || currentUser?.name || 'Unknown',
    status: apiRun.status as PredictionStatus,
    duration: apiRun.duration,
});

const mapApiUserToUser = (apiUser: any): User => ({
  id: String(apiUser.id),
  name: apiUser.name,
  email: apiUser.email,
  photoUrl: normalizeUserPhoto(apiUser.photo ?? apiUser.photoUrl),
  status: apiUser.status as UserStatus,
  role: apiUser.role as UserRole,
  additionalInfo: apiUser.additionalInfo || '',
});

const mapApiSavedModelToSavedModel = (apiModel: any): SavedModel => ({
    id: String(apiModel.id),
    name: apiModel.name,
    modelType: (apiModel.modelType || apiModel.model_type || 'N/A').trim() || 'N/A',
    description: apiModel.description,
    performance: apiModel.performance,
    taskType: (String(apiModel.taskType || apiModel.task_type || 'prediction').toLowerCase() === 'classification')
      ? 'Classification'
      : 'Prediction',
    date: apiModel.date || apiModel.created_at || '',
    buildTime: apiModel.build_time,
});

const mapApiCompoundGenRunToCompoundGenRun = (apiRun: any): CompoundGenRun => ({
    id: String(apiRun.id),
    title: apiRun.title || apiRun.project_name || `Run ${apiRun.id}`,
    seeds: Number(apiRun.seeds ?? apiRun.seed_count ?? 0),
    outputSize: Number(apiRun.outputSize ?? apiRun.output_size ?? apiRun.volume ?? 0),
    generatedOn: apiRun.generatedOn || apiRun.generated_on || apiRun.created_at || new Date().toISOString(),
    status: (apiRun.status || 'processing') as CompoundGenRun['status'],
});

const mapApiSynthesisReportToSynthesisReport = (apiReport: any): SynthesisReport => ({
    id: String(apiReport.id),
    projectName: apiReport.projectName || apiReport.project_name || apiReport.title || `Report ${apiReport.id}`,
    targetMolecule: apiReport.targetMolecule || apiReport.target_molecule || '',
    generatedOn: apiReport.generatedOn || apiReport.generated_on || apiReport.created_at || new Date().toISOString(),
    routes: Number(apiReport.routes ?? apiReport.route_count ?? 0),
    status: (apiReport.status || 'processing') as SynthesisReport['status'],
});

export const HomeSection: React.FC = () => {
  const { state, dispatch } = useStore();
  const { savedModels, dockingRuns, trainingRuns, predictionRuns, compoundGenRuns, synthesisReports, currentUser } = state;
  const [summary, setSummary] = useState<DashboardSummary | null>(null);
  const switchView = (view: View) => dispatch({ type: 'SET_VIEW', payload: view });
  
  useEffect(() => {
    const fetchData = async () => {
        dispatch({ type: 'SET_LOADING', payload: true });
        
        try {
            const promises: Promise<any>[] = [
                api.get('/dashboard/summary'),
                api.get('/ml/models'),
                api.get('/docking/runs?limit=5'),
                api.get('/ml/training/runs?limit=5'),
                api.get('/ml/predictions?limit=5'),
                api.get('/compounds/runs'),
                api.get('/synthesis/reports'),
            ];

            if (currentUser?.role === 'admin') {
                promises.push(api.get('/users/'));
            }

            const [
                summaryData,
                modelsData,
                dockingRunsData,
                trainingRunsData,
                predictionRunsData,
                compoundRunsData,
                synthesisReportsData,
                usersDataResponse
            ] = await Promise.all(promises);
            
            setSummary(summaryData);
            dispatch({ type: 'SET_SAVED_MODELS', payload: (modelsData || []).map(mapApiSavedModelToSavedModel) });
            dispatch({ type: 'SET_DOCKING_RUNS', payload: (dockingRunsData || []).map((r: any) => mapApiDockingRunToDockingRun(r, currentUser)) });
            dispatch({ type: 'SET_TRAINING_RUNS', payload: (trainingRunsData || []).map((r: any) => mapApiTrainingRunToTrainingRun(r, currentUser)) });
            dispatch({ type: 'SET_PREDICTION_RUNS', payload: (predictionRunsData || []).map((r: any) => mapApiPredictionRunToPredictionRun(r, currentUser)) });
            dispatch({ type: 'SET_COMPOUND_GEN_RUNS', payload: (compoundRunsData || []).map(mapApiCompoundGenRunToCompoundGenRun) });
            dispatch({ type: 'SET_SYNTHESIS_REPORTS', payload: (synthesisReportsData || []).map(mapApiSynthesisReportToSynthesisReport) });

            if (usersDataResponse && usersDataResponse.users) {
                dispatch({ type: 'SET_USERS', payload: (usersDataResponse.users || []).map(mapApiUserToUser) });
            }

        } catch (error) {
            console.error("Failed to fetch dashboard data:", error);
        } finally {
            dispatch({ type: 'SET_LOADING', payload: false });
        }
    };

    fetchData();
  }, [dispatch, currentUser]);

  const recentDockingRuns = useMemo(
    () => [...dockingRuns].sort((a, b) => (toEpochMs(b.createdAt) ?? 0) - (toEpochMs(a.createdAt) ?? 0)).slice(0, 5),
    [dockingRuns]
  );
  const recentTrainingRuns = useMemo(
    () => [...trainingRuns].sort((a, b) => (toEpochMs(b.createdAt) ?? 0) - (toEpochMs(a.createdAt) ?? 0)).slice(0, 5),
    [trainingRuns]
  );
  const recentPredictionRuns = useMemo(
    () => [...predictionRuns].sort((a, b) => (toEpochMs(b.createdAt) ?? 0) - (toEpochMs(a.createdAt) ?? 0)).slice(0, 5),
    [predictionRuns]
  );
  const recentCompoundRuns = useMemo(
    () => [...compoundGenRuns].sort((a, b) => (toEpochMs(b.generatedOn) ?? 0) - (toEpochMs(a.generatedOn) ?? 0)).slice(0, 5),
    [compoundGenRuns]
  );
  const recentSynthesisReports = useMemo(
    () => [...synthesisReports].sort((a, b) => (toEpochMs(b.generatedOn) ?? 0) - (toEpochMs(a.generatedOn) ?? 0)).slice(0, 5),
    [synthesisReports]
  );

  // Calculate Chart Data for Model Build Times
  const buildTimeChartOption = useMemo<EChartsOption>(() => {
    // Buckets: <5 min, 5-10 min, 10-15 min, >15 min
    const buckets = {
        '<5 min': 0,
        '5-10 min': 0,
        '10-15 min': 0,
        '>15 min': 0
    };

    savedModels.forEach(model => {
        const minutes = (model.buildTime || 0) / 60;
        if (minutes < 5) buckets['<5 min']++;
        else if (minutes >= 5 && minutes < 10) buckets['5-10 min']++;
        else if (minutes >= 10 && minutes < 15) buckets['10-15 min']++;
        else buckets['>15 min']++;
    });

    return {
        backgroundColor: 'transparent',
        grid: { top: 40, right: 30, bottom: 30, left: 50, containLabel: true },
        xAxis: {
            type: 'category',
            data: Object.keys(buckets),
            axisLine: { lineStyle: { color: 'rgba(255,255,255,0.1)' } },
            axisLabel: { color: 'rgba(255,255,255,0.6)', fontFamily: 'Greycliff CF' },
            axisTick: { show: false }
        },
        yAxis: {
            type: 'value',
            name: 'Number of Models',
            nameLocation: 'middle',
            nameGap: 40,
            nameTextStyle: { color: 'rgba(255,255,255,0.5)', fontFamily: 'Greycliff CF' },
            splitLine: { lineStyle: { color: 'rgba(255,255,255,0.05)' } },
            axisLabel: { color: 'rgba(255,255,255,0.6)', fontFamily: 'Greycliff CF' }
        },
        tooltip: {
            trigger: 'item',
            backgroundColor: 'rgba(0,0,0,0.8)',
            borderColor: '#333',
            textStyle: { color: '#fff' }
        },
        series: [{
            data: Object.values(buckets),
            type: 'bar',
            barWidth: '40%',
            itemStyle: {
                color: '#8b5cf6', // Solid purple color as per design
                borderRadius: [2, 2, 0, 0]
            },
            label: {
                show: true,
                position: 'top',
                color: 'rgba(255,255,255,0.8)'
            }
        }]
    };
  }, [savedModels]);

  return (
    <section id="dashboard" className="min-h-screen py-20 bg-black relative overflow-hidden">
        {/* Subtle grid background */}
        <div className="absolute inset-0 bg-grid-white/5 [mask-image:linear-gradient(to_bottom,rgba(255,255,255,0.1)_0%,transparent_80%)]"></div>
        
        {/* Molecular accent (mockup) */}
        <div className="absolute top-0 right-0 w-[800px] h-[800px] bg-blue-500/5 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2 pointer-events-none"></div>

        <div className="container mx-auto px-6 relative z-10">
            {/* Centered Header Area */}
            <div className="flex flex-col items-center text-center mb-16 mt-8">
                <h1 className="text-6xl md:text-7xl font-argent text-white mb-4">QuantCure</h1>
                <p className="font-greycliff text-lg text-white/60 max-w-2xl leading-relaxed">
                    An overview of your discovery pipeline. Monitor assets, track performance,
                    and launch new experiments.
                </p>
            </div>

            {/* Stats Grid */}
            {summary && (
                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6 mb-12">
                    {/* Row 1 */}
                    <NewStatCard 
                        icon="ri-flask-line" 
                        label="Proteins in DB" 
                        value={summary.proteinCount} 
                        iconColor="text-blue-400"
                        bgColor="bg-blue-500/20"
                    />
                    <NewStatCard 
                        icon="ri-bubble-chart-line" 
                        label="Ligands in DB" 
                        value={summary.ligandCount}
                        subtext={summary.ligandGroupCount ? `${summary.ligandGroupCount} groups` : 'Loading groups...'}
                        iconColor="text-green-400"
                        bgColor="bg-green-500/20"
                    />
                    <NewStatCard 
                        icon="ri-brain-line" 
                        label="Models Built" 
                        value={summary.modelCount} 
                        iconColor="text-purple-400"
                        bgColor="bg-purple-500/20" 
                    />
                    
                    {/* Row 2 */}
                    <NewStatCard 
                        icon="ri-plug-line" 
                        label="Docking Projects" 
                        value={summary.dockingRunCount} 
                        iconColor="text-yellow-400"
                        bgColor="bg-yellow-500/20" 
                    />
                    <NewStatCard 
                        icon="ri-bar-chart-2-line" 
                        label="Model Accuracy / R²" 
                        value={summary.modelAccuracyRange || 'Calculating...'} 
                        iconColor="text-red-400"
                        bgColor="bg-red-500/20" 
                    />
                    <NewStatCard 
                        icon="ri-stack-line" 
                        label="Total Ligands Processed" 
                        value={summary.totalLigandsDocked || 0} 
                        subtext="Across all docking runs"
                        iconColor="text-cyan-400"
                        bgColor="bg-cyan-500/20" 
                    />
                    <NewStatCard 
                        icon="ri-database-2-line" 
                        label="Compound Pipelines" 
                        value={compoundGenRuns.length}
                        subtext={`${compoundGenRuns.filter(r => r.status === 'success').length} completed`}
                        iconColor="text-indigo-400"
                        bgColor="bg-indigo-500/20" 
                    />
                    <NewStatCard 
                        icon="ri-git-branch-line" 
                        label="Synthesis Reports" 
                        value={synthesisReports.length}
                        subtext={`${synthesisReports.reduce((acc, r) => acc + (r.routes || 0), 0)} total routes`}
                        iconColor="text-orange-400"
                        bgColor="bg-orange-500/20" 
                    />
                </div>
            )}

            <div className="mb-12 bg-gradient-to-r from-blue-500/10 via-cyan-500/5 to-emerald-500/10 border border-white/10 rounded-2xl p-6 flex flex-wrap items-center justify-between gap-4">
                <div>
                    <p className="text-[10px] uppercase tracking-[0.2em] text-white/40 font-greycliff font-bold">Pipeline Shortcuts</p>
                    <h3 className="text-2xl font-argent text-white mt-1">Jump directly to active workflows</h3>
                </div>
                <div className="flex flex-wrap gap-2">
                    <button onClick={() => switchView('compound-gen')} className="px-4 py-2 rounded-lg border border-blue-400/30 text-blue-300 hover:bg-blue-500/10 font-greycliff text-xs uppercase tracking-wider">Compound Gen</button>
                    <button onClick={() => switchView('synthesis-route')} className="px-4 py-2 rounded-lg border border-orange-400/30 text-orange-300 hover:bg-orange-500/10 font-greycliff text-xs uppercase tracking-wider">Synthesis Route</button>
                    <button onClick={() => switchView('docker')} className="px-4 py-2 rounded-lg border border-green-400/30 text-green-300 hover:bg-green-500/10 font-greycliff text-xs uppercase tracking-wider">Docking</button>
                    <button onClick={() => switchView('ml-builder')} className="px-4 py-2 rounded-lg border border-violet-400/30 text-violet-300 hover:bg-violet-500/10 font-greycliff text-xs uppercase tracking-wider">ML Builder</button>
                    <button onClick={() => switchView('ml-predictor')} className="px-4 py-2 rounded-lg border border-cyan-400/30 text-cyan-300 hover:bg-cyan-500/10 font-greycliff text-xs uppercase tracking-wider">ML Predictor</button>
                </div>
            </div>
            
            {/* Charts Section */}
            <div className="grid grid-cols-1 lg:grid-cols-1 gap-8 mb-12">
                <div className="bg-[#111318] p-8 rounded-2xl border border-white/5 backdrop-blur-sm shadow-lg shadow-black/30">
                    <div className="text-center mb-8">
                         <h3 className="font-argent text-2xl text-white/90 mb-1">Model Build Times</h3>
                         <p className="font-greycliff text-sm text-white/40">Distribution of model training times</p>
                    </div>
                    <div className="h-[350px] w-full">
                        <EChartComponent option={buildTimeChartOption} style={{ height: '100%', width: '100%' }} />
                    </div>
                </div>
            </div>

            {/* Recent Activity Tables */}
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-5 gap-8">
                {/* Recent Docking Runs */}
                <div className="lg:col-span-1 bg-[#111318] p-6 rounded-2xl border border-white/5 backdrop-blur-sm shadow-lg shadow-black/20">
                    <h3 className="font-argent text-xl mb-4 text-white">Recent Docking Runs</h3>
                    <ul className="space-y-3">
                        {recentDockingRuns.map(run => (
                            <li key={run.id} className="flex justify-between items-center gap-3 font-greycliff text-sm p-3 rounded-lg hover:bg-white/5 transition-colors border border-transparent hover:border-white/5">
                                <div className="min-w-0 flex-1">
                                    <p className="text-white font-medium truncate">{run.name}</p>
                                    <p className="text-white/40 text-xs truncate">vs {run.proteinName}</p>
                                </div>
                                <StatusBadge status={run.status} />
                            </li>
                        ))}
                         {recentDockingRuns.length === 0 && <p className="text-white/30 text-center py-8 font-greycliff italic">No recent docking runs.</p>}
                    </ul>
                </div>

                {/* Recent Training Runs */}
                <div className="lg:col-span-1 bg-[#111318] p-6 rounded-2xl border border-white/5 backdrop-blur-sm shadow-lg shadow-black/20">
                    <h3 className="font-argent text-xl mb-4 text-white">Recent Training Runs</h3>
                     <ul className="space-y-3">
                        {recentTrainingRuns.map(run => (
                            <li key={run.id} className="flex justify-between items-center gap-3 font-greycliff text-sm p-3 rounded-lg hover:bg-white/5 transition-colors border border-transparent hover:border-white/5">
                                <div className="min-w-0 flex-1">
                                    <p className="text-white font-medium truncate">{run.name}</p>
                                    <p className="text-white/40 text-xs truncate">{run.datasetName}</p>
                                </div>
                                <StatusBadge status={run.status} />
                            </li>
                        ))}
                        {recentTrainingRuns.length === 0 && <p className="text-white/30 text-center py-8 font-greycliff italic">No recent training runs.</p>}
                    </ul>
                </div>

                {/* Recent Prediction Runs */}
                <div className="bg-[#111318] p-6 rounded-2xl border border-white/5 backdrop-blur-sm shadow-lg shadow-black/20">
                    <h3 className="font-argent text-xl mb-4 text-white">Recent Prediction Runs</h3>
                     <ul className="space-y-3">
                        {recentPredictionRuns.map(run => (
                            <li key={run.id} className="flex justify-between items-center gap-3 font-greycliff text-sm p-3 rounded-lg hover:bg-white/5 transition-colors border border-transparent hover:border-white/5">
                                <div className="min-w-0 flex-1">
                                    <p className="text-white font-medium truncate">{run.name}</p>
                                    <p className="text-white/40 text-xs truncate">using {run.modelName}</p>
                                </div>
                                <StatusBadge status={run.status} />
                            </li>
                        ))}
                        {recentPredictionRuns.length === 0 && <p className="text-white/30 text-center py-8 font-greycliff italic">No recent prediction runs.</p>}
                    </ul>
                </div>

                {/* Recent Compound Generation Runs */}
                <div className="bg-[#111318] p-6 rounded-2xl border border-white/5 backdrop-blur-sm shadow-lg shadow-black/20">
                    <h3 className="font-argent text-xl mb-4 text-white">Recent Compound Gen</h3>
                    <ul className="space-y-3">
                        {recentCompoundRuns.map(run => (
                            <li key={run.id} className="flex justify-between items-center gap-3 font-greycliff text-sm p-3 rounded-lg hover:bg-white/5 transition-colors border border-transparent hover:border-white/5">
                                <div className="min-w-0 flex-1">
                                    <p className="text-white font-medium truncate">{run.title}</p>
                                    <p className="text-white/40 text-xs truncate">{run.outputSize} outputs</p>
                                </div>
                                <StatusBadge status={run.status} />
                            </li>
                        ))}
                        {recentCompoundRuns.length === 0 && <p className="text-white/30 text-center py-8 font-greycliff italic">No recent compound runs.</p>}
                    </ul>
                </div>

                {/* Recent Synthesis Reports */}
                <div className="bg-[#111318] p-6 rounded-2xl border border-white/5 backdrop-blur-sm shadow-lg shadow-black/20">
                    <h3 className="font-argent text-xl mb-4 text-white">Recent Synthesis Reports</h3>
                    <ul className="space-y-3">
                        {recentSynthesisReports.map(report => (
                            <li key={report.id} className="flex justify-between items-center gap-3 font-greycliff text-sm p-3 rounded-lg hover:bg-white/5 transition-colors border border-transparent hover:border-white/5">
                                <div className="min-w-0 flex-1">
                                    <p className="text-white font-medium truncate">{report.projectName}</p>
                                    <p className="text-white/40 text-xs truncate">{report.routes} routes</p>
                                </div>
                                <StatusBadge status={report.status} />
                            </li>
                        ))}
                        {recentSynthesisReports.length === 0 && <p className="text-white/30 text-center py-8 font-greycliff italic">No recent synthesis reports.</p>}
                    </ul>
                </div>
            </div>

            {currentUser?.role === UserRoleEnum.ADMIN && (
                <div className="mt-12">
                    <UserManagementSection />
                </div>
            )}
        </div>
    </section>
  );
};
