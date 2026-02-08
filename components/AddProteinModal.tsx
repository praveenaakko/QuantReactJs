
import React, { useState } from 'react';
import type { Protein } from '../types';

interface AddProteinModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAddProtein: (protein: Omit<Protein, 'id'>, proteinFile: File | null) => void;
}

const FormInput: React.FC<React.InputHTMLAttributes<HTMLInputElement> & { label: string }> = ({ label, id, className, ...props }) => (
  <div className={className}>
    <label htmlFor={id} className="block text-sm font-greycliff text-white/70 mb-1">{label}</label>
    <input id={id} {...props} className="w-full px-3 py-2 bg-black/40 rounded-lg font-greycliff text-sm focus:outline-none focus:ring-2 focus:ring-white/20 text-white placeholder-white/50" />
  </div>
);

const FormTextarea: React.FC<React.TextareaHTMLAttributes<HTMLTextAreaElement> & { label: string }> = ({ label, id, className, ...props }) => (
    <div className={className}>
      <label htmlFor={id} className="block text-sm font-greycliff text-white/70 mb-1">{label}</label>
      <textarea id={id} {...props} className="w-full px-3 py-2 bg-black/40 rounded-lg font-greycliff text-sm focus:outline-none focus:ring-2 focus:ring-white/20 text-white placeholder-white/50" />
    </div>
);


export const AddProteinModal: React.FC<AddProteinModalProps> = ({ isOpen, onClose, onAddProtein }) => {
    const [proteinFile, setProteinFile] = useState<File | null>(null);
  
    const [name, setName] = useState('');
    const [rcsbId, setRcsbId] = useState('');
    const [pubmedId, setPubmedId] = useState(0);
    const [title, setTitle] = useState('');
    const [pubmedAbstract, setPubmedAbstract] = useState('');
    const [method, setMethod] = useState('');
    const [lengthA, setLengthA] = useState(0);
    const [lengthB, setLengthB] = useState(0);
    const [lengthC, setLengthC] = useState(0);
    const [ligandName, setLigandName] = useState('');
    const [ligandFormula, setLigandFormula] = useState('');
    const [ligandInchi, setLigandInchi] = useState('');
    const [uniprotId, setUniprotId] = useState('');
    const [organism, setOrganism] = useState('');
    const [moleculeType, setMoleculeType] = useState('');
    const [polyType, setPolyType] = useState('');
    const [polyRcsbEntityPolymerType, setPolyRcsbEntityPolymerType] = useState('');
    const [polyPdbxSequenceOneLetterCode, setPolyPdbxSequenceOneLetterCode] = useState('');
    const [sequenceLength, setSequenceLength] = useState(0);
    const [mutations, setMutations] = useState(0);
    const [chain, setChain] = useState('');
    const [numChain, setNumChain] = useState(0);
    const [depositionDate, setDepositionDate] = useState('');

    const resetForm = () => {
        setName('');
        setRcsbId('');
        setPubmedId(0);
        setTitle('');
        setPubmedAbstract('');
        setMethod('');
        setLengthA(0);
        setLengthB(0);
        setLengthC(0);
        setLigandName('');
        setLigandFormula('');
        setLigandInchi('');
        setUniprotId('');
        setOrganism('');
        setMoleculeType('');
        setPolyType('');
        setPolyRcsbEntityPolymerType('');
        setPolyPdbxSequenceOneLetterCode('');
        setSequenceLength(0);
        setMutations(0);
        setChain('');
        setNumChain(0);
        setDepositionDate('');
        setProteinFile(null);
    };

    const handleClose = () => {
        resetForm();
        onClose();
    };

    if (!isOpen) return null;

    const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (!file) {
            setProteinFile(null);
            return;
        };

        const allowedExtensions = ['.pdb', '.mol2'];
        const fileExtension = file.name.slice(file.name.lastIndexOf('.')).toLowerCase();
        
        if (!allowedExtensions.includes(fileExtension)) {
            alert('Please upload a valid protein file (.pdb or .mol2)');
            event.target.value = '';
            setProteinFile(null);
            return;
        }
        setProteinFile(file);
    };
  
    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        onAddProtein({
            name,
            rcsbId,
            pubmedId,
            title,
            pubmedAbstract,
            method,
            lengthA,
            lengthB,
            lengthC,
            ligandName,
            ligandFormula,
            ligandInchi,
            uniprotId,
            organism,
            moleculeType,
            polyType,
            polyRcsbEntityPolymerType,
            polyPdbxSequenceOneLetterCode,
            sequenceLength,
            mutations,
            chain,
            numChain,
            depositionDate,
        }, proteinFile);
    }

    return (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-[100]" onClick={handleClose}>
            <div className="bg-gray-900 rounded-lg p-8 w-full max-w-4xl max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
                <div className="flex justify-between items-center mb-6">
                    <h2 className="text-2xl font-argent">Add New Protein</h2>
                    <button onClick={handleClose} className="text-white/50 hover:text-white"><i className="ri-close-line text-2xl"></i></button>
                </div>
                <form onSubmit={handleSubmit} className="space-y-6">
                    {/* General Information */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-x-6 gap-y-4">
                        <FormInput label="Protein Name" id="protein-name" type="text" value={name} onChange={e => setName(e.target.value)} required />
                        <FormInput label="RCSB ID" id="rcsb-id" type="text" value={rcsbId} onChange={e => setRcsbId(e.target.value)} required />
                        <FormInput label="UniProt ID" id="uniprot-id" type="text" value={uniprotId} onChange={e => setUniprotId(e.target.value)} required />
                        <FormInput label="Title" id="title" type="text" value={title} onChange={e => setTitle(e.target.value)} required className="md:col-span-3"/>
                        <FormInput label="Experimental Method" id="method" type="text" value={method} onChange={e => setMethod(e.target.value)} required />
                        <FormInput label="Source Organism" id="organism" type="text" value={organism} onChange={e => setOrganism(e.target.value)} required />
                        <FormInput label="Molecule Type" id="molecule-type" type="text" value={moleculeType} onChange={e => setMoleculeType(e.target.value)} required />
                    </div>

                    {/* PubMed Information */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-x-6 gap-y-4">
                        <FormInput label="PubMed ID" id="pubmed-id" type="number" min="0" value={pubmedId} onChange={e => setPubmedId(Number(e.target.value))} required />
                        <FormTextarea label="PubMed Abstract" id="pubmed-abstract" value={pubmedAbstract} onChange={e => setPubmedAbstract(e.target.value)} required className="md:col-span-3" rows={4} />
                    </div>
                    
                    {/* Polymer Information */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-x-6 gap-y-4">
                        <FormInput label="Polymer Type" id="poly-type" type="text" value={polyType} onChange={e => setPolyType(e.target.value)} required />
                        <FormInput label="Polymer Entity Type" id="poly-entity-type" type="text" value={polyRcsbEntityPolymerType} onChange={e => setPolyRcsbEntityPolymerType(e.target.value)} required />
                        <FormInput label="Sequence Length" id="sequence-length" type="number" min="0" value={sequenceLength} onChange={e => setSequenceLength(Number(e.target.value))} required />
                        <FormTextarea label="Sequence (One Letter Code)" id="poly-sequence" value={polyPdbxSequenceOneLetterCode} onChange={e => setPolyPdbxSequenceOneLetterCode(e.target.value)} required className="md:col-span-3" rows={4}/>
                    </div>

                     {/* Chain & Structural Information */}
                     <div className="grid grid-cols-1 md:grid-cols-3 gap-x-6 gap-y-4">
                        <FormInput label="Chains" id="chain" type="text" value={chain} onChange={e => setChain(e.target.value)} required />
                        <FormInput label="Number of Chains" id="num-chain" type="number" min="0" value={numChain} onChange={e => setNumChain(Number(e.target.value))} required />
                        <FormInput label="Mutations" id="mutations" type="number" min="0" value={mutations} onChange={e => setMutations(Number(e.target.value))} required />
                        <FormInput label="Length A (Å)" id="length-a" type="number" step="0.01" value={lengthA} onChange={e => setLengthA(Number(e.target.value))} required />
                        <FormInput label="Length B (Å)" id="length-b" type="number" step="0.01" value={lengthB} onChange={e => setLengthB(Number(e.target.value))} required />
                        <FormInput label="Length C (Å)" id="length-c" type="number" step="0.01" value={lengthC} onChange={e => setLengthC(Number(e.target.value))} required />
                    </div>

                    {/* Ligand Information */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-x-6 gap-y-4">
                        <FormInput label="Ligand Name" id="ligand-name" type="text" value={ligandName} onChange={e => setLigandName(e.target.value)} required />
                        <FormInput label="Ligand Formula" id="ligand-formula" type="text" value={ligandFormula} onChange={e => setLigandFormula(e.target.value)} required />
                        <FormInput label="Ligand Inchi" id="ligand-inchi" type="text" value={ligandInchi} onChange={e => setLigandInchi(e.target.value)} required />
                        <FormInput label="Release Date" id="deposition-date" type="date" value={depositionDate} onChange={e => setDepositionDate(e.target.value)} required />
                    </div>

                    {/* File Upload */}
                    <div className="mt-6">
                        <label className="block text-sm font-greycliff text-white/70 mb-2">Protein File</label>
                        <div className="relative border border-white/10 border-dashed rounded-lg p-6 flex flex-col items-center justify-center text-center">
                            <i className="ri-upload-cloud-2-line text-3xl text-white/50 mb-2"></i>
                            <span className="font-greycliff text-white/70 mb-1 break-all">{proteinFile ? proteinFile.name : 'Upload PDB file'}</span>
                            <span className="text-xs text-white/40">{proteinFile ? `${(proteinFile.size / 1024).toFixed(2)} KB` : '.pdb, .mol2 supported'}</span>
                            <input type="file" accept=".pdb,.mol2" className="absolute inset-0 w-full h-full opacity-0 cursor-pointer" onChange={handleFileChange} />
                        </div>
                    </div>
                    <div className="flex justify-end gap-4 mt-8">
                        <button type="button" onClick={handleClose} className="px-6 py-2 bg-white/10 text-white font-greycliff !rounded-button hover:bg-white/20 transition">Cancel</button>
                        <button type="submit" className="px-6 py-2 bg-white text-black font-greycliff !rounded-button hover:bg-white/90 transition">Save Protein</button>
                    </div>
                </form>
            </div>
        </div>
    );
};