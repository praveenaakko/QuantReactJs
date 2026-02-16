
import React, { useState, useMemo, useEffect } from 'react';
import { useStore } from '../store/store';
import { Pagination } from './Pagination';
import { NewGenerationRunModal } from './NewGenerationRunModal';
import { NotificationType, CompoundGenRun } from '../types';
import { EChartComponent } from './EChartComponent';
import { ConfirmationModal } from './ConfirmationModal';
import type { EChartsOption } from 'echarts';
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
        'success': 'bg-green-500/10 text-green-500 border border-green-500/20',
        'processing': 'bg-blue-500/10 text-blue-400 border border-blue-400/20 animate-pulse',
        'failure': 'bg-red-500/10 text-red-400 border-red-500/20',
    };
    return (
        <span className={`px-4 py-1 text-[10px] font-bold rounded-full capitalize tracking-wider font-greycliff ${statusStyles[status] || 'bg-gray-500/20 text-gray-400'}`}>
            {status}
        </span>
    );
};

const RO5RulesIndicator: React.FC<{ passed: number; total: number }> = ({ passed, total }) => {
  const ruleArray = Array.from({ length: total }, (_, i) => i + 1);
  return (
    <div className="flex flex-col items-center gap-1">
      <div className="flex gap-0.5">
        {ruleArray.map((i) => (
          <div
            key={i}
            className={`w-3 h-1.5 rounded-sm transition-all duration-500 ${i <= passed ? 'bg-blue-500 shadow-[0_0_8px_rgba(59,130,246,0.5)]' : 'bg-white/10'}`}
          />
        ))}
      </div>
      <span className="text-[10px] font-bold text-blue-400/80">{passed}/{total} Rules</span>
    </div>
  );
};

interface LibraryItem {
  smiles: string;
  weight: number;
  ro5: number | string;
  npCount: number;
}

type SortKey = keyof CompoundGenRun;
interface SortConfig {
  key: SortKey;
  direction: 'asc' | 'desc';
}

type LibrarySortKey = keyof LibraryItem;
interface LibrarySortConfig {
  key: LibrarySortKey;
  direction: 'asc' | 'desc';
}

const parseRo5Value = (ro5: number | string): { passed: number; total: number } => {
    if (typeof ro5 === 'number' && Number.isFinite(ro5)) {
        const passed = Math.max(0, Math.floor(ro5));
        return { passed, total: 5 };
    }

    if (typeof ro5 === 'string') {
        const ratioMatch = ro5.match(/^\s*(\d+)\s*\/\s*(\d+)\s*$/);
        if (ratioMatch) {
            const passed = Number.parseInt(ratioMatch[1], 10);
            const total = Number.parseInt(ratioMatch[2], 10);
            if (Number.isFinite(passed) && Number.isFinite(total) && total > 0) {
                return { passed: Math.max(0, passed), total };
            }
        }

        const numericValue = Number.parseFloat(ro5);
        if (Number.isFinite(numericValue)) {
            const passed = Math.max(0, Math.floor(numericValue));
            return { passed, total: 5 };
        }
    }

    return { passed: 0, total: 5 };
};

export const CompoundGenSection: React.FC = () => {
    const { state, dispatch } = useStore();
    const { compoundGenRuns } = state;
    const [view, setView] = useState<'list' | 'details'>('list');
    const [selectedRun, setSelectedRun] = useState<CompoundGenRun | null>(null);
    const [libraryData, setLibraryData] = useState<LibraryItem[]>([]);
    const [statsData, setStatsData] = useState<any>(null);
    const [searchTerm, setSearchTerm] = useState('');
    const [currentPage, setCurrentPage] = useState(1);
    const [itemsPerPage, setItemsPerPage] = useState(5);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [libSearchTerm, setLibSearchTerm] = useState('');
    const [sortConfig, setSortConfig] = useState<SortConfig>({ key: 'generatedOn', direction: 'desc' });
    const [libSortConfig, setLibSortConfig] = useState<LibrarySortConfig>({ key: 'weight', direction: 'desc' });
    
    const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
    const [runToDelete, setRunToDelete] = useState<CompoundGenRun | null>(null);
    const [isDeleting, setIsDeleting] = useState(false);

    const mapApiCompoundGenRun = (apiRun: any): CompoundGenRun => ({
      id: String(apiRun?.id ?? ''),
      title: apiRun?.title || apiRun?.project_name || `Run ${apiRun?.id ?? ''}`,
      seeds: Number(apiRun?.seeds ?? apiRun?.seed_count ?? 0),
      outputSize: Number(apiRun?.outputSize ?? apiRun?.output_size ?? apiRun?.volume ?? 0),
      generatedOn: apiRun?.generatedOn || apiRun?.generated_on || apiRun?.created_at || '',
      status: (apiRun?.status || 'processing') as CompoundGenRun['status'],
    });

    const addNotification = (message: string, type: NotificationType) => {
        const id = Date.now();
        dispatch({ type: 'ADD_NOTIFICATION', payload: { id, message, type } });
        setTimeout(() => dispatch({ type: 'REMOVE_NOTIFICATION', payload: id }), 3000);
    };

    useEffect(() => {
        if (view === 'list') {
            fetchRuns();
        }
    }, [view]);

    const fetchRuns = async () => {
        dispatch({ type: 'SET_LOADING', payload: true });
        try {
            const data = await api.get('/compounds/runs');
            dispatch({
              type: 'SET_COMPOUND_GEN_RUNS',
              payload: (Array.isArray(data) ? data : []).map(mapApiCompoundGenRun),
            });
        } catch (error) {
            console.error(error);
            addNotification('Failed to fetch generation runs.', NotificationType.ERROR);
        } finally {
            dispatch({ type: 'SET_LOADING', payload: false });
        }
    };

    const handleStartRun = async (title: string, file: File, volume: number) => {
        setIsModalOpen(false);
        dispatch({ type: 'SET_LOADING', payload: true });
        const formData = new FormData();
        formData.append('title', title);
        formData.append('volume', String(volume));
        formData.append('file', file);

        try {
            const newRun = await api.post('/compounds/generate', formData);
            dispatch({ type: 'SET_COMPOUND_GEN_RUNS', payload: [mapApiCompoundGenRun(newRun), ...compoundGenRuns] });
            addNotification(`Pipeline "${title}" has been successfully initiated.`, NotificationType.SUCCESS);
        } catch (error) {
            addNotification('Failed to start generation run.', NotificationType.ERROR);
        } finally {
            dispatch({ type: 'SET_LOADING', payload: false });
        }
    };

    const handleViewDetails = async (run: CompoundGenRun) => {
        if (run.status !== 'success') return;
        dispatch({ type: 'SET_LOADING', payload: true });
        try {
            const data = await api.get(`/compounds/runs/${run.id}`);
            setSelectedRun(run);
            setLibraryData(data.library || []);
            setStatsData(data.stats || null);
            setView('details');
        } catch (error) {
            addNotification('Failed to load run details.', NotificationType.ERROR);
        } finally {
            dispatch({ type: 'SET_LOADING', payload: false });
        }
    };

    const confirmDelete = (run: CompoundGenRun) => {
        setRunToDelete(run);
        setIsDeleteModalOpen(true);
    };

    const handleDeleteRun = async () => {
        if (!runToDelete) return;
        setIsDeleting(true);
        try {
            await api.delete(`/compounds/runs/${runToDelete.id}`);
            dispatch({ type: 'DELETE_COMPOUND_GEN_RUN', payload: runToDelete.id });
            addNotification(`Run "${runToDelete.title}" deleted successfully.`, NotificationType.SUCCESS);
        } catch (error) {
            addNotification('Failed to delete run.', NotificationType.ERROR);
        } finally {
            setIsDeleting(false);
            setIsDeleteModalOpen(false);
            setRunToDelete(null);
        }
    };

    const escapeCsvValue = (value: string | number): string => {
      const str = String(value ?? '');
      if (/[",\n]/.test(str)) {
        return `"${str.replace(/"/g, '""')}"`;
      }
      return str;
    };

    const handleDownloadLibraryCsv = () => {
      if (!selectedRun || sortedLibrary.length === 0) {
        addNotification('No molecular library rows available to export.', NotificationType.ERROR);
        return;
      }

      const headers = ['smiles', 'molecular_weight', 'rules_passed', 'np_count'];
      const rows = sortedLibrary.map((item) => {
        const ro5 = parseRo5Value(item.ro5);
        return [
          escapeCsvValue(item.smiles),
          escapeCsvValue(item.weight),
          escapeCsvValue(`${ro5.passed}/${ro5.total}`),
          escapeCsvValue(item.npCount),
        ].join(',');
      });

      const csvContent = `${headers.join(',')}\n${rows.join('\n')}`;
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      const safeTitle = (selectedRun.title || 'molecular_library').replace(/\s+/g, '_');
      link.setAttribute('href', url);
      link.setAttribute('download', `${safeTitle}_library.csv`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    };

    const handleSort = (key: SortKey) => {
      let direction: 'asc' | 'desc' = 'asc';
      if (sortConfig.key === key && sortConfig.direction === 'asc') {
        direction = 'desc';
      }
      setSortConfig({ key, direction });
    };

    const handleLibSort = (key: LibrarySortKey) => {
      let direction: 'asc' | 'desc' = 'asc';
      if (libSortConfig.key === key && libSortConfig.direction === 'asc') {
        direction = 'desc';
      }
      setLibSortConfig({ key, direction });
    };

    const sortedAndFilteredRuns = useMemo(() => {
      const filtered = compoundGenRuns.filter(run => {
        const title = run.title || '';
        return title.toLowerCase().includes(searchTerm.toLowerCase());
      });

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
    }, [compoundGenRuns, searchTerm, sortConfig]);

    const sortedLibrary = useMemo(() => {
      const filtered = libraryData.filter(item => {
        const smiles = item.smiles || '';
        return smiles.toLowerCase().includes(libSearchTerm.toLowerCase());
      });

      return [...filtered].sort((a, b) => {
        const getSortValue = (item: LibraryItem, key: LibrarySortKey): number | string => {
            if (key === 'ro5') return parseRo5Value(item.ro5).passed;
            return item[key];
        };
        const valA = getSortValue(a, libSortConfig.key);
        const valB = getSortValue(b, libSortConfig.key);

        if (valA < valB) return libSortConfig.direction === 'asc' ? -1 : 1;
        if (valA > valB) return libSortConfig.direction === 'asc' ? 1 : -1;
        return 0;
      });
    }, [libraryData, libSearchTerm, libSortConfig]);

    const derivedDistribution = useMemo(() => {
        const counts: number[] = [];
        for (const item of libraryData) {
            const { passed } = parseRo5Value(item.ro5);
            counts[passed] = (counts[passed] || 0) + 1;
        }
        return counts;
    }, [libraryData]);

    // Distribution is based on "rules passed", not denominator totals.
    const maxRulesInDataset = useMemo(() => {
        const maxPassedFromLibrary = libraryData.reduce((max, item) => {
            const { passed } = parseRo5Value(item.ro5);
            return Math.max(max, passed);
        }, 0);
        const maxFromStats = Array.isArray(statsData?.distribution) ? Math.max(statsData.distribution.length - 1, 0) : 0;
        return Math.max(maxPassedFromLibrary, maxFromStats, 5);
    }, [libraryData, statsData]);

    const lipinskiCompliance = useMemo(() => {
        const rawCompliance = statsData?.lipinski_compliance;
        if (typeof rawCompliance === 'number' && Number.isFinite(rawCompliance)) return rawCompliance;
        if (typeof rawCompliance === 'string') {
            const parsed = Number.parseFloat(rawCompliance);
            if (Number.isFinite(parsed)) return parsed;
        }

        if (libraryData.length === 0) return 0;
        const compliantCount = libraryData.filter((item) => {
            const { passed, total } = parseRo5Value(item.ro5);
            return total > 0 && passed >= total;
        }).length;
        return Number(((compliantCount / libraryData.length) * 100).toFixed(1));
    }, [statsData, libraryData]);

    const paginatedRuns = useMemo(() => 
      sortedAndFilteredRuns.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage),
      [sortedAndFilteredRuns, currentPage, itemsPerPage]
    );
    
    const totalPages = Math.ceil(sortedAndFilteredRuns.length / itemsPerPage);

    const distributionChartOption: EChartsOption = useMemo(() => {
        // Create labels from 0 to maxRulesInDataset
        const labels = Array.from({ length: maxRulesInDataset + 1 }, (_, i) => String(i));
        
        // Prefer backend distribution when available, otherwise derive from library data.
        const rawDistribution = Array.isArray(statsData?.distribution) && statsData.distribution.length > 0
            ? statsData.distribution
            : derivedDistribution;
        const chartData = labels.map((_, i) => rawDistribution[i] || 0);

        return {
            backgroundColor: 'transparent',
            tooltip: { trigger: 'axis', axisPointer: { type: 'shadow' } },
            grid: { left: '5%', right: '5%', top: '15%', bottom: '15%', containLabel: true },
            xAxis: {
                type: 'category',
                data: labels,
                name: 'Rules Passed',
                nameLocation: 'middle',
                nameGap: 30,
                axisLine: { lineStyle: { color: 'rgba(255,255,255,0.1)' } },
                axisLabel: { color: 'rgba(255,255,255,0.4)', fontSize: 10 },
                splitLine: { show: false }
            },
            yAxis: {
                type: 'value',
                axisLine: { show: false },
                axisLabel: { color: 'rgba(255,255,255,0.4)', fontSize: 10 },
                splitLine: { lineStyle: { color: 'rgba(255,255,255,0.05)', type: 'dashed' } }
            },
            series: [{
                data: chartData,
                type: 'bar',
                barWidth: '50%',
                itemStyle: {
                    color: (params: any) => params.dataIndex >= (maxRulesInDataset - 1) ? '#3b82f6' : '#2d3748',
                    borderRadius: [4, 4, 0, 0]
                }
            }]
        };
    }, [statsData, maxRulesInDataset, derivedDistribution]);

    const SortIndicator = ({ columnKey, currentSortKey, direction }: { columnKey: string, currentSortKey: string, direction: 'asc' | 'desc' }) => {
      if (currentSortKey !== columnKey) return <i className="ri-expand-up-down-line ml-1 opacity-20 group-hover:opacity-40 transition-opacity"></i>;
      return direction === 'asc' 
        ? <i className="ri-arrow-up-s-line ml-1 text-cyan-400"></i> 
        : <i className="ri-arrow-down-s-line ml-1 text-cyan-400"></i>;
    };

    if (view === 'details' && selectedRun) {
      return (
        <section className="min-h-screen py-24 bg-black">
          <div className="container mx-auto px-6">
            <button 
              onClick={() => setView('list')}
              className="mb-8 font-greycliff text-[10px] font-bold tracking-widest text-white/40 hover:text-white transition flex items-center gap-2 uppercase"
            >
              <i className="ri-arrow-left-line text-sm"></i> Back to Registry
            </button>

            <div className="bg-[#111318] p-10 rounded-2xl border border-white/5 mb-8 shadow-2xl relative overflow-hidden">
              <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-blue-500/5 rounded-full blur-[120px] -translate-y-1/2 translate-x-1/2 pointer-events-none"></div>
              
              <div className="flex items-start gap-4 mb-6">
                <span className="px-2 py-0.5 bg-blue-500/20 text-blue-400 border border-blue-500/30 rounded text-[9px] font-bold tracking-widest uppercase">Generated Dataset</span>
                <h2 className="text-4xl font-argent text-white">{selectedRun.title}</h2>
              </div>
              <p className="text-white/50 font-greycliff max-w-2xl text-sm leading-relaxed mb-10">
                Library generated by Bio-Quant engine. Optimized for specific receptor occupancy and compliance with molecular properties criteria.
              </p>

              <div className="grid grid-cols-2 md:grid-cols-4 gap-12 pt-8 border-t border-white/5">
                <div>
                  <p className="text-white/30 text-[10px] font-bold uppercase tracking-widest mb-2 font-greycliff">Seed Library</p>
                  <p className="text-white text-2xl font-argent">{selectedRun.seeds} Seeds</p>
                </div>
                <div>
                  <p className="text-white/30 text-[10px] font-bold uppercase tracking-widest mb-2 font-greycliff">Total Output</p>
                  <p className="text-white text-2xl font-argent">{selectedRun.outputSize} SMILES</p>
                </div>
                <div>
                  <p className="text-white/30 text-[10px] font-bold uppercase tracking-widest mb-2 font-greycliff">Engine</p>
                  <p className="text-white text-2xl font-argent">Bio-Quant 4.0</p>
                </div>
                <div>
                  <p className="text-white/30 text-[10px] font-bold uppercase tracking-widest mb-2 font-greycliff">Analysis Date</p>
                  <p className="text-white text-2xl font-argent">{formatDate12h(selectedRun.generatedOn)}</p>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-stretch">
              <div className="lg:col-span-2 bg-[#111318] rounded-2xl border border-white/5 overflow-hidden flex flex-col shadow-xl h-full">
                <div className="p-6 border-b border-white/5 flex justify-between items-center bg-white/[0.01]">
                   <div className="flex items-center gap-3">
                      <i className="ri-database-2-line text-blue-400"></i>
                      <h3 className="font-greycliff font-bold text-white text-[10px] uppercase tracking-widest">Molecular Library</h3>
                   </div>
                   <div className="flex items-center gap-2">
                     <button
                       onClick={handleDownloadLibraryCsv}
                       disabled={sortedLibrary.length === 0}
                       className="h-10 px-3 rounded-lg border border-white/10 bg-white/5 text-white/80 hover:bg-white/10 transition disabled:opacity-40 disabled:cursor-not-allowed flex items-center gap-2 text-xs font-greycliff uppercase tracking-wider"
                       title="Download molecular library CSV"
                     >
                       <i className="ri-download-2-line"></i>
                       Download CSV
                     </button>
                     <div className="relative w-64">
                      <input 
                        type="text" 
                        placeholder="Filter library..." 
                        className="w-full bg-black/40 border border-white/5 rounded-lg py-2 pl-9 pr-3 text-[11px] font-greycliff focus:outline-none focus:border-white/20 text-white placeholder-white/20"
                        value={libSearchTerm}
                        onChange={e => setLibSearchTerm(e.target.value)}
                      />
                      <i className="ri-search-line absolute left-3 top-1/2 -translate-y-1/2 text-white/20"></i>
                     </div>
                   </div>
                </div>
                <div className="overflow-auto custom-scrollbar flex-grow" style={{ maxHeight: '600px' }}>
                   <table className="w-full text-left table-fixed">
                      <thead className="bg-gray-800 text-[9px] uppercase tracking-widest text-white/50 font-bold sticky top-0 z-10">
                        <tr>
                          <th 
                            className="p-4 pl-6 font-greycliff cursor-pointer hover:bg-gray-700 transition-colors group select-none w-1/2"
                            onClick={() => handleLibSort('smiles')}
                          >
                            Smiles Notation <SortIndicator columnKey="smiles" currentSortKey={libSortConfig.key} direction={libSortConfig.direction} />
                          </th>
                          <th 
                            className="p-4 text-center font-greycliff cursor-pointer hover:bg-gray-700 transition-colors group select-none"
                            onClick={() => handleLibSort('weight')}
                          >
                            Mol. Weight <SortIndicator columnKey="weight" currentSortKey={libSortConfig.key} direction={libSortConfig.direction} />
                          </th>
                          <th 
                            className="p-4 text-center font-greycliff cursor-pointer hover:bg-gray-700 transition-colors group select-none"
                            onClick={() => handleLibSort('ro5')}
                          >
                            Rules Passed <SortIndicator columnKey="ro5" currentSortKey={libSortConfig.key} direction={libSortConfig.direction} />
                          </th>
                          <th 
                            className="p-4 pr-6 text-center font-greycliff cursor-pointer hover:bg-gray-700 transition-colors group select-none"
                            onClick={() => handleLibSort('npCount')}
                          >
                            NP Count <SortIndicator columnKey="npCount" currentSortKey={libSortConfig.key} direction={libSortConfig.direction} />
                          </th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-white/5">
                        {sortedLibrary.map((item, idx) => {
                          const ro5 = parseRo5Value(item.ro5);
                          return (
                            <tr key={idx} className="hover:bg-white/[0.02] transition-colors group">
                              <td className="p-4 pl-6 font-mono text-[10px] text-white/40 group-hover:text-white/70 transition-colors truncate">
                                {item.smiles}
                              </td>
                              <td className="p-4 text-center font-greycliff font-bold text-white text-xs">
                                {item.weight} <span className="text-[9px] text-white/20 font-normal">Da</span>
                              </td>
                              <td className="p-4 text-center">
                                <RO5RulesIndicator passed={ro5.passed} total={ro5.total} />
                              </td>
                              <td className="p-4 pr-6 text-center">
                                <span className="px-3 py-1 bg-white/5 border border-white/10 rounded-md text-[10px] font-bold text-white/60">
                                  {item.npCount}
                                </span>
                              </td>
                            </tr>
                          );
                        })}
                        {sortedLibrary.length === 0 && (
                             <tr>
                                <td colSpan={4} className="p-12 text-center text-white/20 font-greycliff font-bold uppercase tracking-widest text-xs">No matching SMILES found.</td>
                            </tr>
                        )}
                      </tbody>
                   </table>
                </div>
              </div>

              <div className="space-y-8 flex flex-col justify-between h-full min-h-[600px]">
                <div className="bg-[#111318] p-6 rounded-2xl border border-white/5 shadow-xl flex-grow flex flex-col">
                   <div className="flex items-center gap-3 mb-6">
                      <i className="ri-shield-check-line text-green-400"></i>
                      <div>
                        <h3 className="font-greycliff font-bold text-white text-[10px] uppercase tracking-widest">Property Distribution</h3>
                        <p className="text-[9px] text-white/30 uppercase mt-0.5 tracking-tighter font-bold">Compounds per number of rules passed</p>
                      </div>
                   </div>
                   <div className="flex-grow">
                      <EChartComponent option={distributionChartOption} style={{ height: '100%', width: '100%' }} />
                   </div>
                </div>

                <div className="bg-[#111318] p-8 rounded-2xl border border-white/5 shadow-xl shrink-0">
                   <div className="flex justify-between items-center mb-6">
                      <h3 className="font-greycliff font-bold text-white/50 text-[10px] uppercase tracking-widest">Rule Compliance</h3>
                      <span className="text-green-400 font-argent text-lg">{lipinskiCompliance}%</span>
                   </div>
                   <div className="w-full h-2 bg-white/5 rounded-full overflow-hidden mb-2">
                      <div className="h-full bg-green-500 shadow-[0_0_10px_rgba(34,197,94,0.4)] transition-all duration-1000" style={{ width: `${lipinskiCompliance}%` }}></div>
                   </div>
                   <p className="text-[9px] text-white/20 font-greycliff font-bold uppercase tracking-wider text-right italic">Optimized Library Target</p>
                </div>
              </div>
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
                        <h2 className="text-4xl font-argent text-white">Compound Generation</h2>
                        <p className="text-white/60 font-greycliff text-sm mt-1 max-w-2xl">
                            Registry of generated chemical libraries from optimized seed sets.
                        </p>
                    </div>
                    <button 
                        onClick={() => setIsModalOpen(true)}
                        className="px-6 py-3 font-greycliff !rounded-button flex items-center gap-2 transition-all duration-300 ease-in-out bg-gradient-to-r from-cyan-500 to-blue-500 text-white shadow-lg shadow-cyan-500/20 hover:shadow-xl hover:shadow-cyan-500/40 hover:-translate-y-px"
                    >
                        <i className="ri-add-line"></i> Create New Pipeline
                    </button>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
                    <DashboardStatCard icon="ri-database-2-line" label="Registry Count" value={compoundGenRuns.length} color="bg-blue-500/30 text-blue-300" />
                    <DashboardStatCard icon="ri-node-tree" label="Total Candidates" value={compoundGenRuns.reduce((acc, r) => acc + (r.outputSize || 0), 0)} color="bg-green-500/30 text-green-300" />
                    <DashboardStatCard icon="ri-time-line" label="Compute Hours" value="482.5" color="bg-yellow-500/30 text-yellow-300" />
                    <DashboardStatCard icon="ri-checkbox-circle-line" label="Compliance" value="99.1%" color="bg-purple-500/30 text-purple-300" />
                </div>

                <div className="bg-white/5 p-4 rounded-lg mb-8 flex flex-col md:flex-row gap-4 items-center border border-white/10">
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
                </div>

                <div className="bg-white/5 p-6 rounded-lg shadow-xl border border-white/10">
                    <div className="overflow-auto max-h-[600px] relative border border-white/10 rounded-lg">
                        <table className="w-full text-sm text-left">
                            <thead className="bg-gray-800 sticky top-0 z-10 text-white font-greycliff">
                                <tr>
                                    <th 
                                      className="p-3 w-[30%] font-greycliff cursor-pointer hover:bg-gray-700 transition-colors group select-none"
                                      onClick={() => handleSort('title')}
                                    >
                                      Project Name <SortIndicator columnKey="title" currentSortKey={sortConfig.key} direction={sortConfig.direction} />
                                    </th>
                                    <th 
                                      className="p-3 text-center font-greycliff cursor-pointer hover:bg-gray-700 transition-colors group select-none"
                                      onClick={() => handleSort('outputSize')}
                                    >
                                      Output Volume <SortIndicator columnKey="outputSize" currentSortKey={sortConfig.key} direction={sortConfig.direction} />
                                    </th>
                                    <th 
                                      className="p-3 font-greycliff cursor-pointer hover:bg-gray-700 transition-colors group select-none"
                                      onClick={() => handleSort('generatedOn')}
                                    >
                                      Generated On <SortIndicator columnKey="generatedOn" currentSortKey={sortConfig.key} direction={sortConfig.direction} />
                                    </th>
                                    <th 
                                      className="p-3 font-greycliff cursor-pointer hover:bg-gray-700 transition-colors group select-none"
                                      onClick={() => handleSort('seeds')}
                                    >
                                      Reference Seeds <SortIndicator columnKey="seeds" currentSortKey={sortConfig.key} direction={sortConfig.direction} />
                                    </th>
                                    <th 
                                      className="p-3 text-center font-greycliff cursor-pointer hover:bg-gray-700 transition-colors group select-none"
                                      onClick={() => handleSort('status')}
                                    >
                                      Status <SortIndicator columnKey="status" currentSortKey={sortConfig.key} direction={sortConfig.direction} />
                                    </th>
                                    <th className="p-3 text-center font-greycliff select-none">Actions</th>
                                </tr>
                            </thead>
                            <tbody>
                                {paginatedRuns.map(run => (
                                    <tr key={run.id} className="border-b border-white/10 hover:bg-white/5 transition-colors group">
                                        <td className="p-3 font-greycliff text-white font-medium">
                                            <div className="text-base">{run.title}</div>
                                            <div className="text-[10px] text-white/30 uppercase tracking-widest">ID: {run.id}</div>
                                        </td>
                                        <td className="p-3 text-center">
                                            <span className="px-3 py-1 bg-white/5 border border-white/10 rounded-full text-[10px] font-bold text-white/70">
                                                {run.outputSize} SMILES
                                            </span>
                                        </td>
                                        <td className="p-3 font-greycliff text-white/60 text-xs">
                                            {formatDate12h(run.generatedOn)}
                                        </td>
                                        <td className="p-3">
                                            <div className="text-white/80 font-greycliff text-xs">
                                                Seed Set: <span className="text-white">{run.seeds} Molecules</span>
                                            </div>
                                            <div className="text-[10px] text-white/30 font-bold uppercase">Engine: Bio-Quant 4.0</div>
                                        </td>
                                        <td className="p-3 text-center">
                                            <StatusBadge status={run.status} />
                                        </td>
                                        <td className="p-3 text-center">
                                            <div className="flex justify-center items-center gap-4">
                                                <button 
                                                  onClick={() => handleViewDetails(run)} 
                                                  disabled={run.status !== 'success'}
                                                  className={`text-white/70 hover:text-cyan-400 transition-all transform hover:scale-110 ${run.status !== 'success' ? 'opacity-20 cursor-not-allowed' : ''}`}
                                                  title="View Library Details"
                                                >
                                                  <i className="ri-eye-line text-lg"></i>
                                                </button>
                                                <button 
                                                  onClick={() => confirmDelete(run)}
                                                  className="text-white/30 hover:text-red-500 transition-all transform hover:scale-110"
                                                  title="Delete Generation Run"
                                                >
                                                  <i className="ri-delete-bin-line text-lg"></i>
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                                {paginatedRuns.length === 0 && (
                                    <tr>
                                        <td colSpan={6} className="p-12 text-center text-white/20 font-greycliff font-bold uppercase tracking-widest">No generation records found.</td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                    {sortedAndFilteredRuns.length > itemsPerPage && (
                        <Pagination 
                            currentPage={currentPage} 
                            totalPages={totalPages} 
                            onPageChange={setCurrentPage}
                            itemsPerPage={itemsPerPage}
                            onItemsPerPageChange={setItemsPerPage}
                            totalItems={sortedAndFilteredRuns.length}
                        />
                    )}
                </div>
            </div>
            <NewGenerationRunModal 
                isOpen={isModalOpen} 
                onClose={() => setIsModalOpen(false)} 
                onStart={handleStartRun} 
            />
            <ConfirmationModal 
                isOpen={isDeleteModalOpen}
                onClose={() => setIsDeleteModalOpen(false)}
                onConfirm={handleDeleteRun}
                title="Delete Generation Run"
                message={`Are you sure you want to delete the run "${runToDelete?.title}"? This action cannot be undone and all generated molecular data for this run will be permanently removed.`}
                confirmText="Delete"
                isConfirming={isDeleting}
            />
        </section>
    );
};
