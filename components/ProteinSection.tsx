import React, { useState, useMemo, useEffect } from 'react';
import type { Protein } from '../types';
import { NotificationType } from '../types';
import { AddProteinModal } from './AddProteinModal';
import { Pagination } from './Pagination';
import { useStore } from '../store/store';
import api from '../config/api';

interface ProteinSectionProps {
  addNotification: (message: string, type: NotificationType) => void;
}

const ProteinDetailRow: React.FC<{ label: string; value: React.ReactNode }> = ({ label, value }) => (
  <div className="flex">
    <span className="font-greycliff text-white/80 w-40 shrink-0">{label}</span>
    <span className="font-greycliff text-white break-all">: {value}</span>
  </div>
);

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


const fileToBase64 = (file: File): Promise<string> =>
  new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => {
        const result = reader.result as string;
        // The result is "data:mime/type;base64,the_base_64_string", we extract only the base64 part.
        resolve(result.split(',')[1]);
    };
    reader.onerror = error => reject(error);
  });

export const ProteinSection: React.FC<ProteinSectionProps> = ({ addNotification }) => {
  const { state, dispatch } = useStore();
  const { proteins, selectedProtein } = state;

  const [searchInput, setSearchInput] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(5);
  
  useEffect(() => {
    const fetchProteins = async () => {
        // Only fetch if the protein list is empty
        if (proteins.length === 0) {
            dispatch({ type: 'SET_LOADING', payload: true });
            try {
                const proteinsData = await api.get('/proteins/get');
                const mappedProteins = (Array.isArray(proteinsData) ? proteinsData : []).map(mapApiProteinToProtein);
                if (mappedProteins.length > 0) {
                    dispatch({ type: 'SET_PROTEINS', payload: mappedProteins });
                }
            } catch (error) {
                console.error("Failed to fetch proteins", error);
                addNotification(error instanceof Error ? error.message : 'Could not load proteins from server.', NotificationType.ERROR);
            } finally {
                dispatch({ type: 'SET_LOADING', payload: false });
            }
        }
    };
    fetchProteins();
  }, [proteins.length, dispatch, addNotification]);

  const setSelectedProtein = (protein: Protein | null) => {
    dispatch({ type: 'SET_SELECTED_PROTEIN', payload: protein });
  };

  const handleAddProtein = async (proteinData: Omit<Protein, 'id'>, proteinFile: File | null) => {
    if (!proteinFile) {
        addNotification('A protein file (.pdb or .mol2) is required.', NotificationType.ERROR);
        return;
    }
    dispatch({ type: 'SET_LOADING', payload: true });
    try {
        const pdbfileBase64 = await fileToBase64(proteinFile);
        
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
            pdbfile: pdbfileBase64,
        };

        const newApiProtein = await api.post('/proteins/create', payload);
        const newProtein = mapApiProteinToProtein(newApiProtein);

        dispatch({ type: 'ADD_PROTEIN', payload: newProtein });
        addNotification(`Protein "${newProtein.name}" added successfully`, NotificationType.SUCCESS);
        setIsModalOpen(false);
    } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Failed to add protein.';
        addNotification(errorMessage, NotificationType.ERROR);
    } finally {
        dispatch({ type: 'SET_LOADING', payload: false });
    }
  };
  
  const filteredProteins = useMemo(() => 
    proteins.filter(p => 
      p.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
      p.rcsbId.toLowerCase().includes(searchTerm.toLowerCase())
    ), [searchTerm, proteins]);

  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, itemsPerPage]);
  
  const handleSearch = () => {
    setSearchTerm(searchInput);
  };

  const handlePageChange = (page: number) => {
    if (page > 0 && page <= totalPages) {
        setCurrentPage(page);
    }
  };

  const handleItemsPerPageChange = (size: number) => {
    setItemsPerPage(size);
    setCurrentPage(1);
  };

  const totalPages = Math.ceil(filteredProteins.length / itemsPerPage);
  const paginatedProteins = useMemo(() =>
    filteredProteins.slice(
      (currentPage - 1) * itemsPerPage,
      currentPage * itemsPerPage
    ),
    [filteredProteins, currentPage, itemsPerPage]
  );

  return (
    <section id="protein" className="min-h-screen py-24 bg-gradient-to-b from-black to-gray-900">
      <div className="container mx-auto px-6">
        <h2 className="text-4xl font-argent mb-12">Protein Selection</h2>
        <div className="flex flex-col lg:flex-row gap-8">
          <div className="lg:w-[70%]">
            <div className="bg-black/20 rounded-lg p-6">
              <div className="flex gap-4 mb-6">
                <div className="relative flex-grow">
                  <input 
                    type="text"
                    placeholder="Search protein by name or ID"
                    className="w-full px-4 py-3 bg-black/40 rounded-lg font-greycliff text-sm focus:outline-none focus:ring-2 focus:ring-white/20 text-white placeholder-white/50 pr-10"
                    value={searchInput}
                    onChange={(e) => setSearchInput(e.target.value)}
                    onKeyDown={(e) => { if (e.key === 'Enter') handleSearch(); }}
                  />
                  <i className="ri-search-line absolute right-4 top-1/2 -translate-y-1/2 text-white/50"></i>
                </div>
                <button
                    onClick={handleSearch}
                    className="px-6 py-3 bg-white/10 text-white font-greycliff !rounded-button hover:bg-white/20 transition whitespace-nowrap"
                >
                    Search
                </button>
              </div>
              <div className="overflow-y-auto max-h-[450px] mt-6 relative border border-white/10 rounded-lg">
                <table className="w-full text-sm">
                  <thead className="sticky top-0 bg-gray-900 z-10">
                    <tr>
                      <th className="p-3 text-center font-greycliff text-white">Select</th>
                      <th className="p-3 text-left font-greycliff text-white">RCSB ID</th>
                      <th className="p-3 text-left font-greycliff text-white">Protein</th>
                      <th className="p-3 text-left font-greycliff text-white">Method</th>
                      <th className="p-3 text-left font-greycliff text-white">Organism</th>
                      <th className="p-3 text-right font-greycliff text-white">Seq. Length</th>
                      <th className="p-3 text-right font-greycliff text-white">Chains</th>
                    </tr>
                  </thead>
                  <tbody>
                    {paginatedProteins.length > 0 ? paginatedProteins.map(protein => (
                      <tr key={protein.id} className="border-b border-white/10 hover:bg-white/5 cursor-pointer" onClick={() => setSelectedProtein(protein)}>
                        <td className="p-3 text-center"><input type="radio" name="protein-select" className="form-radio rounded bg-gray-700 border-transparent focus:ring-white/50 text-blue-500" checked={selectedProtein?.id === protein.id} readOnly /></td>
                        <td className="p-3 font-greycliff text-white">{protein.rcsbId}</td>
                        <td className="p-3 font-greycliff text-white">{protein.name}</td>
                        <td className="p-3 font-greycliff text-white">{protein.method}</td>
                        <td className="p-3 font-greycliff text-white">{protein.organism}</td>
                        <td className="p-3 font-greycliff text-white text-right">{protein.sequenceLength}</td>
                        <td className="p-3 font-greycliff text-white text-right">{protein.numChain}</td>
                      </tr>
                    )) : (
                      <tr>
                        <td colSpan={7} className="p-6 text-center font-greycliff text-white/50">
                          No proteins found.
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
                totalItems={filteredProteins.length}
              />
              <div className="flex flex-col items-center gap-4 mt-6">
                <span className="text-white/50 font-greycliff">or</span>
                <button 
                  onClick={() => setIsModalOpen(true)}
                  className="w-full px-6 py-3 bg-white/10 text-white font-greycliff !rounded-button hover:bg-white/20 transition whitespace-nowrap"
                >
                  Add Protein
                </button>
              </div>
            </div>
          </div>
          <div className="lg:w-[30%]">
            <div className="bg-black/20 p-6 rounded-lg sticky top-24">
              <h3 className="font-greycliff mb-6 text-white text-lg">Selected Protein Details</h3>
              {selectedProtein ? (
                <div className="space-y-2 text-sm max-h-[70vh] overflow-y-auto">
                  <ProteinDetailRow label="Protein Name" value={selectedProtein.name} />
                  <ProteinDetailRow label="RCSB ID" value={selectedProtein.rcsbId} />
                  <ProteinDetailRow label="Title" value={selectedProtein.title} />
                  <ProteinDetailRow label="Method" value={selectedProtein.method} />
                  <ProteinDetailRow label="Organism" value={selectedProtein.organism} />
                  <ProteinDetailRow label="UniProt ID" value={selectedProtein.uniprotId} />
                  <ProteinDetailRow label="PubMed ID" value={selectedProtein.pubmedId} />
                  <ProteinDetailRow label="Molecule" value={selectedProtein.moleculeType} />
                  <ProteinDetailRow label="Sequence Length" value={selectedProtein.sequenceLength} />
                  <ProteinDetailRow label="Chains" value={`${selectedProtein.chain} (${selectedProtein.numChain})`} />
                  <ProteinDetailRow label="Mutations" value={selectedProtein.mutations} />
                  <ProteinDetailRow label="Ligand" value={selectedProtein.ligandName} />
                  <ProteinDetailRow label="Release Date" value={selectedProtein.depositionDate} />
                </div>
              ) : (
                <p className="font-greycliff text-white/50 text-center">No protein selected.</p>
              )}
            </div>
          </div>
        </div>
      </div>
      <AddProteinModal 
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onAddProtein={handleAddProtein}
      />
    </section>
  );
}