import React, { useState, useMemo, useEffect } from 'react';
import type { Ligand, LigandGroup } from '../types';
import { NotificationType } from '../types';
import { AddLigandGroupModal } from './AddLigandGroupModal';
import { CreateLigandGroupModal } from './CreateLigandGroupModal';
import { Pagination } from './Pagination';
import { useStore } from '../store/store';
import api from '../config/api';

interface LigandSectionProps {
  addNotification: (message: string, type: NotificationType) => void;
}

// --- MOCK DATA ---
const staticLigandGroups: LigandGroup[] = [
  { name: 'Kinase Inhibitors', count: 8 },
  { name: 'Fragment Library', count: 12 },
  { name: 'Natural Products', count: 5 },
  { name: 'Pain Relief', count: 3 },
];

const staticLigands: Ligand[] = [
  // Kinase Inhibitors
  { id: 'l01', name: 'Gefitinib', smiles: 'C1=CC(=C(C=C1F)Cl)NC2=C3C=C(C=CC3=NC=C2)OCC(C(F)(F)F)O', formula: 'C22H24ClFN4O3', group: 'Kinase Inhibitors' },
  { id: 'l02', name: 'Erlotinib', smiles: 'C1=CC=C(C=C1)C#C.C1=CC(=C(C=C1NC2=C3C=C(C=CC3=NC=C2)OCCOC)OCCOC)N(C)C', formula: 'C22H23N3O4', group: 'Kinase Inhibitors' },
  { id: 'l03', name: 'Lapatinib', smiles: 'CS(=O)(=O)CCNCC1=CC=C(O1)C2=C(C=C3C(=C2)C(=NC=N3)NC4=CC(=C(C=C4)F)Cl)OC(C)C', formula: 'C29H26ClFN4O4S', group: 'Kinase Inhibitors' },
  { id: 'l04', name: 'Imatinib', smiles: 'CC1=C(C=C(C=C1)NC(=O)C2=CC=C(C=C2)CN3CCN(CC3)C)NC4=NC=C(C=C4)C5=CN=CC=C5', formula: 'C29H31N7O', group: 'Kinase Inhibitors' },
  { id: 'l05', name: 'Dasatinib', smiles: 'CC1=C(C(=CC=C1)Cl)NC(=O)C2=CN=C(S2)NC3=C(C=C(N=C3)N4CCN(CC4)CCO)C', formula: 'C22H26ClN7O2S', group: 'Kinase Inhibitors' },
  { id: 'l06', name: 'Sorafenib', smiles: 'CNC(=O)C1=NC=C(C=C1)OC2=CC=C(C=C2)NC(=O)NC3=CC=C(C=C3)C(F)(F)F', formula: 'C21H16ClF3N4O3', group: 'Kinase Inhibitors' },
  { id: 'l07', name: 'Sunitinib', smiles: 'CCN(CC)CCNC(=O)C1=C(NC(=C1C)C=C2C3=C(C=CC(=C3)F)NC2=O)C', formula: 'C22H27FN4O2', group: 'Kinase Inhibitors' },
  { id: 'l08', name: 'Pazopanib', smiles: 'CC1=CC=C(C=C1)S(=O)(=O)NC2=C(C=C(C=C2)N=NC3=C(C=CC(=C3)N(C)C)C)C', formula: 'C21H23N7O2S', group: 'Kinase Inhibitors' },
  
  // Fragment Library
  { id: 'l09', name: 'Fragment 001', smiles: 'c1ccccc1', formula: 'C6H6', group: 'Fragment Library' },
  { id: 'l10', name: 'Fragment 002', smiles: 'c1ccncc1', formula: 'C5H5N', group: 'Fragment Library' },
  { id: 'l11', name: 'Fragment 003', smiles: 'c1cncnc1', formula: 'C4H4N2', group: 'Fragment Library' },
  { id: 'l12', name: 'Fragment 004', smiles: 'c1cc[nH]c1', formula: 'C4H5N', group: 'Fragment Library' },
  { id: 'l13', name: 'Fragment 005', smiles: 'c1ccoc1', formula: 'C4H4O', group: 'Fragment Library' },
  { id: 'l14', name: 'Fragment 006', smiles: 'c1ccsc1', formula: 'C4H4S', group: 'Fragment Library' },
  { id: 'l15', name: 'Fragment 007', smiles: 'C1CCOC1', formula: 'C4H8O', group: 'Fragment Library' },
  { id: 'l16', name: 'Fragment 008', smiles: 'C1CCNCC1', formula: 'C5H11N', group: 'Fragment Library' },
  { id: 'l17', name: 'Fragment 009', smiles: 'CC(=O)N', formula: 'C2H5NO', group: 'Fragment Library' },
  { id: 'l18', name: 'Fragment 010', smiles: 'c1c[nH]cn1', formula: 'C3H4N2', group: 'Fragment Library' },
  { id: 'l19', name: 'Fragment 011', smiles: 'c1cn[nH]c1', formula: 'C3H4N2', group: 'Fragment Library' },
  { id: 'l20', name: 'Fragment 012', smiles: 'C(C)O', formula: 'C2H6O', group: 'Fragment Library' },
  
  // Natural Products
  { id: 'l21', name: 'Quercetin', smiles: 'C1=C(C=C(C(=C1)O)O)C2=C(C(=O)C3=C(C=C(C=C3O2)O)O)O', formula: 'C15H10O7', group: 'Natural Products' },
  { id: 'l22', name: 'Resveratrol', smiles: 'C1=CC(=CC=C1C=CC2=CC(=CC(=C2)O)O)O', formula: 'C14H12O3', group: 'Natural Products' },
  { id: 'l23', name: 'Caffeine', smiles: 'CN1C=NC2=C1C(=O)N(C(=O)N2C)C', formula: 'C8H10N4O2', group: 'Natural Products' },
  { id: 'l24', name: 'Morphine', smiles: 'C1CN2C3C4C1C5C2C3(C=CC4O)OC6=C5C(=C(C=C6)O)O', formula: 'C17H19NO3', group: 'Natural Products' },
  { id: 'l25', name: 'Taxol', smiles: 'CC1=C(C(=O)C2(C(C3C(C(C4(C(C3C(C(C2(C)C)OC(=O)C)OC(=O)C5=CC=CC=C5)O)O)C)OC(=O)C)OC(=O)C6=CC=CC=C6)O)C(=O)C(C(C1)O)NC(=O)C(C(C7=CC=CC=C7)O)NC(=O)C8=CC=CC=C8', formula: 'C47H51NO14', group: 'Natural Products' },
  
  // Pain Relief
  { id: 'l26', name: 'Aspirin', smiles: 'CC(=O)OC1=CC=CC=C1C(=O)O', formula: 'C9H8O4', group: 'Pain Relief' },
  { id: 'l27', name: 'Ibuprofen', smiles: 'CC(C)CC1=CC=C(C=C1)C(C)C(=O)O', formula: 'C13H18O2', group: 'Pain Relief' },
  { id: 'l28', name: 'Paracetamol', smiles: 'CC(=O)NC1=CC=C(C=C1)O', formula: 'C8H9NO2', group: 'Pain Relief' },
];


const mapApiLigandToLigand = (apiLigand: any): Ligand => ({
    id: String(apiLigand.id),
    name: apiLigand.name,
    smiles: apiLigand.smiles,
    formula: apiLigand.formula,
    group: apiLigand.group_name,
});

export const LigandSection: React.FC<LigandSectionProps> = ({ addNotification }) => {
  const { state, dispatch } = useStore();
  const { ligands, selectedLigands, ligandGroups } = state;

  const [searchTerm, setSearchTerm] = useState('');
  const [groupSearchTerm, setGroupSearchTerm] = useState('');
  const [isLigandModalOpen, setIsLigandModalOpen] = useState(false);
  const [isCreateGroupModalOpen, setCreateGroupModalOpen] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);
  const [selectedGroups, setSelectedGroups] = useState<string[]>([]);
  
  // Pagination state for ligand groups
  const [groupsCurrentPage, setGroupsCurrentPage] = useState(1);
  const [groupsItemsPerPage, setGroupsItemsPerPage] = useState(10);

  useEffect(() => {
    const loadMockData = () => {
        if (ligands.length === 0) {
            dispatch({ type: 'SET_LIGANDS', payload: staticLigands });
        }
        if (ligandGroups.length === 0) {
            dispatch({ type: 'SET_LIGAND_GROUPS', payload: staticLigandGroups });
        }
    };
    loadMockData();
  }, [ligands.length, ligandGroups.length, dispatch]);
  
  const setSelectedLigands = (payload: React.SetStateAction<Ligand[]>) => {
      dispatch({ type: 'SET_SELECTED_LIGANDS', payload });
  };
  
  const ligandGroupsWithCounts = useMemo(() => {
    return [...ligandGroups].sort((a, b) => a.name.localeCompare(b.name));
  }, [ligandGroups]);

  const filteredLigandGroups = useMemo(() =>
    ligandGroupsWithCounts.filter(group =>
      group.name.toLowerCase().includes(groupSearchTerm.toLowerCase())
    ),
    [ligandGroupsWithCounts, groupSearchTerm]
  );

  useEffect(() => {
    setGroupsCurrentPage(1);
  }, [groupSearchTerm, groupsItemsPerPage]);

  // Pagination logic for ligand groups
  const groupsTotalPages = Math.ceil(filteredLigandGroups.length / groupsItemsPerPage);
  const paginatedLigandGroups = useMemo(() =>
    filteredLigandGroups.slice(
      (groupsCurrentPage - 1) * groupsItemsPerPage,
      groupsCurrentPage * groupsItemsPerPage
    ),
    [filteredLigandGroups, groupsCurrentPage, groupsItemsPerPage]
  );
  
  const handleGroupsPageChange = (page: number) => {
    if (page > 0 && page <= groupsTotalPages) {
      setGroupsCurrentPage(page);
    }
  };

  const handleGroupsItemsPerPageChange = (size: number) => {
    setGroupsItemsPerPage(size);
    setGroupsCurrentPage(1);
  };


  const filteredLigands = useMemo(() =>
    ligands.filter(l => 
        l.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        l.smiles.toLowerCase().includes(searchTerm.toLowerCase())
      ), [ligands, searchTerm]);

  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, itemsPerPage]);

  const totalPages = Math.ceil(filteredLigands.length / itemsPerPage);
  const paginatedLigands = useMemo(() =>
    filteredLigands.slice(
      (currentPage - 1) * itemsPerPage,
      currentPage * itemsPerPage
    ),
    [filteredLigands, currentPage, itemsPerPage]
  );
  
  const handlePageChange = (page: number) => {
    if (page > 0 && page <= totalPages) {
      setCurrentPage(page);
    }
  };

  const handleItemsPerPageChange = (size: number) => {
    setItemsPerPage(size);
    setCurrentPage(1);
  };
  
  const handleSelectLigand = (ligand: Ligand, isSelected: boolean) => {
    setSelectedLigands(prev => {
      if (isSelected) {
        return [...prev, ligand];
      } else {
        return prev.filter(l => l.id !== ligand.id);
      }
    });
  };

  const handleSelectAllOnPage = (e: React.ChangeEvent<HTMLInputElement>) => {
    const isChecked = e.target.checked;
    setSelectedLigands(prev => {
      const pageLigandIds = new Set(paginatedLigands.map(l => l.id));
      const otherSelected = prev.filter(l => !pageLigandIds.has(l.id));
      if (isChecked) {
        return [...otherSelected, ...paginatedLigands];
      } else {
        return otherSelected;
      }
    });
  };
  
  const isAllOnPageSelected = paginatedLigands.length > 0 && paginatedLigands.every(l => selectedLigands.some(sl => sl.id === l.id));

  const handleUploadLigandGroup = async (groupName: string, description: string, file: File) => {
    dispatch({ type: 'SET_LOADING', payload: true });
    await new Promise(resolve => setTimeout(resolve, 1000)); // Simulate network delay

    // Simulate adding 5 new ligands for the uploaded group
    const newLigands: Ligand[] = Array.from({ length: 5 }, (_, i) => ({
      id: `l_new_${groupName.replace(/\s/g, '')}_${i}`,
      name: `${groupName} Ligand ${i + 1}`,
      smiles: `C1=CC=C(C=C${i+1})C`,
      formula: `C${6+i}H${6+i}`,
      group: groupName,
    }));
    
    // Check if group already exists to update count, otherwise add new group
    const existingGroup = ligandGroups.find(g => g.name === groupName);
    let updatedGroups: LigandGroup[];
    if (existingGroup) {
      updatedGroups = ligandGroups.map(g => g.name === groupName ? { ...g, count: g.count + 5 } : g);
    } else {
      updatedGroups = [...ligandGroups, { name: groupName, count: 5 }];
    }
    
    dispatch({ type: 'SET_LIGANDS', payload: [...ligands, ...newLigands] });
    dispatch({ type: 'SET_LIGAND_GROUPS', payload: updatedGroups });

    addNotification(`Simulated upload of group "${groupName}" with 5 ligands.`, NotificationType.SUCCESS);
    setIsLigandModalOpen(false);
    dispatch({ type: 'SET_LOADING', payload: false });
  };

  const handleCreateGroup = async (groupName: string) => {
    if (!groupName.trim()) {
      addNotification('Group name cannot be empty.', NotificationType.ERROR);
      return;
    }
    dispatch({ type: 'SET_LOADING', payload: true });
    await new Promise(resolve => setTimeout(resolve, 1000)); // Simulate network delay

    const selectedLigandIds = new Set(selectedLigands.map(l => l.id));

    // Update the group for selected ligands
    const updatedLigands = ligands.map(ligand => {
        if (selectedLigandIds.has(ligand.id)) {
            return { ...ligand, group: groupName };
        }
        return ligand;
    });

    // Recalculate group counts
    const groupCounts = updatedLigands.reduce((acc, ligand) => {
        if (ligand.group) {
            acc[ligand.group] = (acc[ligand.group] || 0) + 1;
        }
        return acc;
    }, {} as Record<string, number>);

    const updatedGroups = Object.entries(groupCounts).map(([name, count]) => ({ name, count }));

    dispatch({ type: 'SET_LIGANDS', payload: updatedLigands });
    dispatch({ type: 'SET_LIGAND_GROUPS', payload: updatedGroups });

    dispatch({ type: 'SET_SELECTED_LIGANDS', payload: [] });
    setSelectedGroups([]);
    
    addNotification(`Group "${groupName}" created with ${selectedLigands.length} ligands.`, NotificationType.SUCCESS);
    setCreateGroupModalOpen(false);
    dispatch({ type: 'SET_LOADING', payload: false });
  };

  const handleGroupSelect = (groupName: string, isSelected: boolean) => {
    setSelectedGroups(prev => isSelected ? [...prev, groupName] : prev.filter(g => g !== groupName));

    const ligandsInGroup = ligands.filter(l => l.group === groupName);

    if (isSelected) {
      dispatch({
        type: 'SET_SELECTED_LIGANDS',
        payload: (currentSelected: Ligand[]) => {
          const currentSelectedIds = new Set(currentSelected.map(l => l.id));
          const newLigandsToAdd = ligandsInGroup.filter(
            ligandInGroup => !currentSelectedIds.has(ligandInGroup.id)
          );
          return [...currentSelected, ...newLigandsToAdd];
        }
      });
    } else {
      const ligandIdsToRemove = new Set(ligandsInGroup.map(l => l.id));
      dispatch({
        type: 'SET_SELECTED_LIGANDS',
        payload: (currentSelected: Ligand[]) => currentSelected.filter(sl => !ligandIdsToRemove.has(sl.id))
      });
    }
  };
  
  const groupsMap = useMemo(() => {
    const map = new Map<string, Ligand[]>();
    ligands.forEach(ligand => {
        if (ligand.group) {
            if (!map.has(ligand.group)) {
                map.set(ligand.group, []);
            }
            map.get(ligand.group)!.push(ligand);
        }
    });
    return map;
  }, [ligands]);

  useEffect(() => {
    const updatedSelectedGroups: string[] = [];
    const selectedLigandIds = new Set(selectedLigands.map(l => l.id));

    groupsMap.forEach((ligandsInGroup, groupName) => {
        if (ligandsInGroup.length > 0) {
            const allInGroupSelected = ligandsInGroup.every(ligand => selectedLigandIds.has(ligand.id));
            if (allInGroupSelected) {
                updatedSelectedGroups.push(groupName);
            }
        }
    });

    if (JSON.stringify([...selectedGroups].sort()) !== JSON.stringify(updatedSelectedGroups.sort())) {
        setSelectedGroups(updatedSelectedGroups);
    }
  }, [selectedLigands, groupsMap, selectedGroups]);

  return (
    <>
      <section id="ligand" className="py-12 bg-gray-900">
        <div className="container mx-auto px-6">
          <h2 className="text-4xl font-argent mb-12">Ligand Selection</h2>
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
            <div className="lg:col-span-4">
              <div className="bg-black/20 rounded-lg p-6">
                <h3 className="font-greycliff text-lg text-white mb-4">Ligand Groups</h3>
                <div className="relative mb-4">
                  <input 
                    type="text"
                    placeholder="Search groups..."
                    className="w-full px-4 py-2 bg-black/40 rounded-lg font-greycliff text-sm focus:outline-none focus:ring-2 focus:ring-white/20 text-white placeholder-white/50 pr-10"
                    value={groupSearchTerm}
                    onChange={(e) => setGroupSearchTerm(e.target.value)}
                  />
                  <i className="ri-search-line absolute right-3 top-1/2 -translate-y-1/2 text-white/50"></i>
                </div>
                <div className="overflow-y-auto max-h-[550px] relative border border-white/10 rounded-lg">
                  <table className="w-full text-sm">
                    <thead className="sticky top-0 bg-gray-800 z-10">
                      <tr>
                        <th className="p-3 text-center font-greycliff text-white w-12">
                          <i className="ri-check-double-line"></i>
                        </th>
                        <th className="p-3 text-left font-greycliff text-white">Group Name</th>
                        <th className="p-3 text-right font-greycliff text-white">Count</th>
                      </tr>
                    </thead>
                    <tbody>
                      {paginatedLigandGroups.length > 0 ? paginatedLigandGroups.map(group => {
                        const isSelected = selectedGroups.includes(group.name);
                        return (
                          <tr key={group.name} className={`border-b border-white/10 hover:bg-white/5 cursor-pointer ${isSelected ? 'bg-white/10' : ''}`} onClick={() => handleGroupSelect(group.name, !isSelected)}>
                            <td className="p-3 text-center">
                              <input 
                                type="checkbox" 
                                className="form-checkbox rounded bg-gray-700 border-transparent focus:ring-white/50 text-blue-500 pointer-events-none"
                                checked={isSelected}
                                readOnly
                                aria-label={`Select group ${group.name}`}
                              />
                            </td>
                            <td className="p-3 font-greycliff text-white">{group.name}</td>
                            <td className="p-3 font-greycliff text-white text-right">{group.count}</td>
                          </tr>
                        );
                      }) : (
                        <tr>
                          <td colSpan={3} className="p-6 text-center font-greycliff text-white/50">
                            {groupSearchTerm ? 'No groups found matching your search.' : 'No ligand groups found.'}
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
                <Pagination
                    currentPage={groupsCurrentPage}
                    totalPages={groupsTotalPages}
                    onPageChange={handleGroupsPageChange}
                    itemsPerPage={groupsItemsPerPage}
                    onItemsPerPageChange={handleGroupsItemsPerPageChange}
                    totalItems={filteredLigandGroups.length}
                    pageSizeOptions={[5, 10, 20]}
                />
              </div>
            </div>
            
            <div className="lg:col-span-8">
              <div className="bg-black/20 rounded-lg p-6">
                <div className="flex flex-col md:flex-row justify-between items-center mb-6 gap-4">
                  <div className="relative flex-1 w-full md:w-auto">
                    <input 
                      type="text"
                      placeholder="Search by name or SMILES"
                      className="w-full px-4 py-3 bg-black/40 rounded-lg font-greycliff text-sm focus:outline-none focus:ring-2 focus:ring-white/20 text-white placeholder-white/50"
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                    />
                    <i className="ri-search-line absolute right-4 top-1/2 -translate-y-1/2 text-white/50"></i>
                  </div>
                  <div className="flex gap-4">
                    <button 
                      onClick={() => setCreateGroupModalOpen(true)}
                      disabled={selectedLigands.length === 0}
                      className="px-6 py-3 bg-white/10 text-white font-greycliff !rounded-button hover:bg-white/20 transition whitespace-nowrap disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      Create Group ({selectedLigands.length})
                    </button>
                    <button 
                      onClick={() => setIsLigandModalOpen(true)}
                      className="px-6 py-3 bg-white text-black font-greycliff !rounded-button hover:bg-white/90 transition whitespace-nowrap"
                    >
                      Upload Group
                    </button>
                  </div>
                </div>
                
                <div className="overflow-y-auto max-h-[550px] relative border border-white/10 rounded-lg">
                  <table className="w-full text-sm">
                    <thead className="sticky top-0 bg-gray-800 z-10">
                      <tr>
                        <th className="p-3 text-center font-greycliff text-white w-12">
                          <input 
                            type="checkbox" 
                            className="form-checkbox rounded bg-gray-700 border-transparent focus:ring-white/50 text-blue-500"
                            checked={isAllOnPageSelected}
                            onChange={handleSelectAllOnPage}
                            aria-label="Select all ligands on this page"
                          />
                        </th>
                        <th className="p-3 text-left font-greycliff text-white">Name</th>
                        <th className="p-3 text-left font-greycliff text-white">SMILES</th>
                        <th className="p-3 text-left font-greycliff text-white">Formula</th>
                        <th className="p-3 text-left font-greycliff text-white">Group</th>
                      </tr>
                    </thead>
                    <tbody>
                      {paginatedLigands.length > 0 ? paginatedLigands.map(ligand => {
                        const isSelected = selectedLigands.some(l => l.id === ligand.id);
                        return (
                          <tr key={ligand.id} className={`border-b border-white/10 hover:bg-white/5 ${isSelected ? 'bg-white/10' : ''}`}>
                            <td className="p-3 text-center">
                              <input 
                                type="checkbox" 
                                className="form-checkbox rounded bg-gray-700 border-transparent focus:ring-white/50 text-blue-500" 
                                checked={isSelected}
                                onChange={(e) => handleSelectLigand(ligand, e.target.checked)}
                                aria-label={`Select ligand ${ligand.name}`}
                              />
                            </td>
                            <td className="p-3 font-greycliff text-white">{ligand.name}</td>
                            <td className="p-3 font-mono text-xs text-white/80 truncate">{ligand.smiles}</td>
                            <td className="p-3 font-greycliff text-white">{ligand.formula}</td>
                            <td className="p-3 font-greycliff text-white">{ligand.group || 'N/A'}</td>
                          </tr>
                        );
                      }) : (
                        <tr>
                          <td colSpan={5} className="p-6 text-center font-greycliff text-white/50">
                            No ligands found.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>

                <Pagination
                  currentPage={currentPage}
                  totalPages={totalPages}
                  onPageChange={handlePageChange}
                  itemsPerPage={itemsPerPage}
                  onItemsPerPageChange={handleItemsPerPageChange}
                  totalItems={filteredLigands.length}
                />
              </div>
            </div>
          </div>
        </div>
      </section>
      <AddLigandGroupModal 
        isOpen={isLigandModalOpen}
        onClose={() => setIsLigandModalOpen(false)}
        onUpload={handleUploadLigandGroup}
        title="Upload New Ligand Group"
      />
      <CreateLigandGroupModal
        isOpen={isCreateGroupModalOpen}
        onClose={() => setCreateGroupModalOpen(false)}
        onCreate={handleCreateGroup}
        selectedLigands={selectedLigands}
      />
    </>
  );
};