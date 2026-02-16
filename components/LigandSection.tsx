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
    const fetchLigandsAndGroups = async () => {
      if (ligands.length > 0 && ligandGroups.length > 0) return;
      dispatch({ type: 'SET_LOADING', payload: true });
      try {
        const [ligandsData, groupsData] = await Promise.all([
          api.get('/ligands/get'),
          api.get('/ligands/ligand_group')
        ]);
        dispatch({
          type: 'SET_LIGANDS',
          payload: (ligandsData?.ligands || []).map(mapApiLigandToLigand),
        });
        dispatch({
          type: 'SET_LIGAND_GROUPS',
          payload: groupsData?.groups || [],
        });
      } catch (error) {
        addNotification(error instanceof Error ? error.message : 'Failed to load ligands.', NotificationType.ERROR);
      } finally {
        dispatch({ type: 'SET_LOADING', payload: false });
      }
    };
    fetchLigandsAndGroups();
  }, [ligands.length, ligandGroups.length, dispatch, addNotification]);
  
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
    const formData = new FormData();
    formData.append('groupName', groupName);
    formData.append('description', description);
    formData.append('file', file);

    dispatch({ type: 'SET_LOADING', payload: true });
    try {
      await api.post('/ligands/ligand_groups/upload', formData);
      const [ligandsData, groupsData] = await Promise.all([
        api.get('/ligands/get'),
        api.get('/ligands/ligand_group')
      ]);
      dispatch({ type: 'SET_LIGANDS', payload: (ligandsData?.ligands || []).map(mapApiLigandToLigand) });
      dispatch({ type: 'SET_LIGAND_GROUPS', payload: groupsData?.groups || [] });
      addNotification(`Group "${groupName}" uploaded successfully.`, NotificationType.SUCCESS);
      setIsLigandModalOpen(false);
    } catch (error) {
      addNotification(error instanceof Error ? error.message : 'Failed to upload ligand group.', NotificationType.ERROR);
    } finally {
      dispatch({ type: 'SET_LOADING', payload: false });
    }
  };

  const handleCreateGroup = async (groupName: string) => {
    if (!groupName.trim()) {
      addNotification('Group name cannot be empty.', NotificationType.ERROR);
      return;
    }
    dispatch({ type: 'SET_LOADING', payload: true });
    try {
      await api.put('/ligands/assign_group', { groupName, ligandIds: selectedLigands.map(l => l.id) });
      const [ligandsData, groupsData] = await Promise.all([
        api.get('/ligands/get'),
        api.get('/ligands/ligand_group')
      ]);
      dispatch({ type: 'SET_LIGANDS', payload: (ligandsData?.ligands || []).map(mapApiLigandToLigand) });
      dispatch({ type: 'SET_LIGAND_GROUPS', payload: groupsData?.groups || [] });
      dispatch({ type: 'SET_SELECTED_LIGANDS', payload: [] });
      setSelectedGroups([]);
      addNotification(`Group "${groupName}" created with ${selectedLigands.length} ligands.`, NotificationType.SUCCESS);
      setCreateGroupModalOpen(false);
    } catch (error) {
      addNotification(error instanceof Error ? error.message : 'Failed to create ligand group.', NotificationType.ERROR);
    } finally {
      dispatch({ type: 'SET_LOADING', payload: false });
    }
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
