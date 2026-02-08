
import React, { useMemo, useEffect, useState } from 'react';
import { UserRole as UserRoleEnum, SavedModel, DockingRun, User, UserStatus, UserRole, DockingStatus, TrainingRun, TrainingStatus, PredictionRun, PredictionStatus } from '../types';
import { EChartComponent } from './EChartComponent';
import type { EChartsOption } from 'echarts';
import { UserManagementSection } from './UserManagementSection';
import { useStore } from '../store/store';
import api from '../config/api';

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
        <span className={`px-2 py-1 text-xs font-greycliff rounded border capitalize ${statusStyles[status] || 'bg-gray-500/20 text-gray-400 border-gray-500/30'}`}>
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
    createdAt: new Date(apiRun.created_at).toLocaleString(),
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
    datasetName: apiRun.datasetName,
    taskType: apiRun.taskType,
    createdAt: new Date(apiRun.createdAt).toLocaleString(),
    createdBy: apiRun.createdBy || currentUser?.name || 'Unknown',
    status: apiRun.status as TrainingStatus,
    duration: apiRun.duration,
    modelCount: apiRun.modelCount,
});

const mapApiPredictionRunToPredictionRun = (apiRun: any, currentUser: any): PredictionRun => ({
    id: String(apiRun.id),
    name: apiRun.name,
    description: apiRun.description,
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

const mapApiUserToUser = (apiUser: any): User => ({
  id: String(apiUser.id),
  name: apiUser.name,
  email: apiUser.email,
  photoUrl: `/${String(apiUser.photo).replace(/\\/g, '/').replace('app/', '')}`,
  status: apiUser.status as UserStatus,
  role: apiUser.role as UserRole,
  additionalInfo: apiUser.additionalInfo || '',
});

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

export const HomeSection: React.FC = () => {
  const { state, dispatch } = useStore();
  const { savedModels, dockingRuns, trainingRuns, predictionRuns, currentUser, users } = state;
  const [summary, setSummary] = useState<DashboardSummary | null>(null);
  
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
                usersDataResponse
            ] = await Promise.all(promises);
            
            setSummary(summaryData);
            dispatch({ type: 'SET_SAVED_MODELS', payload: (modelsData || []).map(mapApiSavedModelToSavedModel) });
            dispatch({ type: 'SET_DOCKING_RUNS', payload: (dockingRunsData || []).map((r: any) => mapApiDockingRunToDockingRun(r, currentUser)) });
            dispatch({ type: 'SET_TRAINING_RUNS', payload: (trainingRunsData || []).map((r: any) => mapApiTrainingRunToTrainingRun(r, currentUser)) });
            dispatch({ type: 'SET_PREDICTION_RUNS', payload: (predictionRunsData || []).map((r: any) => mapApiPredictionRunToPredictionRun(r, currentUser)) });

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

  const recentDockingRuns = useMemo(() => dockingRuns.slice(0, 5), [dockingRuns]);
  const recentTrainingRuns = useMemo(() => trainingRuns.slice(0, 5), [trainingRuns]);
  const recentPredictionRuns = useMemo(() => predictionRuns.slice(0, 5), [predictionRuns]);

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
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-12">
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
                </div>
            )}
            
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
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Recent Docking Runs */}
                <div className="lg:col-span-1 bg-[#111318] p-6 rounded-2xl border border-white/5 backdrop-blur-sm shadow-lg shadow-black/20">
                    <h3 className="font-argent text-xl mb-4 text-white">Recent Docking Runs</h3>
                    <ul className="space-y-3">
                        {recentDockingRuns.map(run => (
                            <li key={run.id} className="flex justify-between items-center font-greycliff text-sm p-3 rounded-lg hover:bg-white/5 transition-colors border border-transparent hover:border-white/5">
                                <div>
                                    <p className="text-white font-medium">{run.name}</p>
                                    <p className="text-white/40 text-xs">vs {run.proteinName}</p>
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
                            <li key={run.id} className="flex justify-between items-center font-greycliff text-sm p-3 rounded-lg hover:bg-white/5 transition-colors border border-transparent hover:border-white/5">
                                <div>
                                    <p className="text-white font-medium">{run.name}</p>
                                    <p className="text-white/40 text-xs">{run.datasetName}</p>
                                </div>
                                <StatusBadge status={run.status} />
                            </li>
                        ))}
                        {recentTrainingRuns.length === 0 && <p className="text-white/30 text-center py-8 font-greycliff italic">No recent training runs.</p>}
                    </ul>
                </div>

                {/* Recent Prediction Runs */}
                <div className="lg:col-span-1 bg-[#111318] p-6 rounded-2xl border border-white/5 backdrop-blur-sm shadow-lg shadow-black/20">
                    <h3 className="font-argent text-xl mb-4 text-white">Recent Prediction Runs</h3>
                     <ul className="space-y-3">
                        {recentPredictionRuns.map(run => (
                            <li key={run.id} className="flex justify-between items-center font-greycliff text-sm p-3 rounded-lg hover:bg-white/5 transition-colors border border-transparent hover:border-white/5">
                                <div>
                                    <p className="text-white font-medium">{run.name}</p>
                                    <p className="text-white/40 text-xs">using {run.modelName}</p>
                                </div>
                                <StatusBadge status={run.status} />
                            </li>
                        ))}
                        {recentPredictionRuns.length === 0 && <p className="text-white/30 text-center py-8 font-greycliff italic">No recent prediction runs.</p>}
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