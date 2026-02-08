
import React, { useState } from 'react';
import type { Ligand } from '../types';

interface CreateLigandGroupModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCreate: (groupName: string) => void;
  selectedLigands: Ligand[];
}

const FormInput: React.FC<React.InputHTMLAttributes<HTMLInputElement> & { label: string }> = ({ label, id, ...props }) => (
  <div>
    <label htmlFor={id} className="block text-sm font-greycliff text-white/70 mb-1">{label}</label>
    <input id={id} {...props} className="w-full px-3 py-2 bg-black/40 rounded-lg font-greycliff text-sm focus:outline-none focus:ring-2 focus:ring-white/20 text-white placeholder-white/50" />
  </div>
);

export const CreateLigandGroupModal: React.FC<CreateLigandGroupModalProps> = ({ isOpen, onClose, onCreate, selectedLigands }) => {
  const [groupName, setGroupName] = useState('');

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!groupName.trim()) {
      alert('Please provide a name for the group.');
      return;
    }
    onCreate(groupName);
    setGroupName('');
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-[100]" onClick={onClose}>
      <div className="bg-gray-900 rounded-lg p-8 w-full max-w-lg" onClick={e => e.stopPropagation()}>
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-2xl font-argent">Create New Ligand Group</h2>
          <button onClick={onClose} className="text-white/50 hover:text-white"><i className="ri-close-line text-2xl"></i></button>
        </div>
        <form onSubmit={handleSubmit} className="space-y-6">
          <FormInput
            label="New Group Name"
            id="new-group-name"
            type="text"
            value={groupName}
            onChange={e => setGroupName(e.target.value)}
            required
            placeholder="e.g., Custom Inhibitors"
          />
          <div>
            <label className="block text-sm font-greycliff text-white/70 mb-2">Selected Ligands ({selectedLigands.length})</label>
            <div className="bg-black/20 p-4 rounded-lg max-h-60 overflow-y-auto space-y-2">
              {selectedLigands.map(ligand => (
                <div key={ligand.id} className="text-sm font-greycliff text-white/90 flex justify-between items-center">
                    <span className="truncate pr-4">{ligand.name}</span>
                    <span className="text-white/50 font-mono text-xs truncate">{ligand.smiles}</span>
                </div>
              ))}
            </div>
          </div>
          <div className="flex justify-end gap-4 mt-8">
            <button type="button" onClick={onClose} className="px-6 py-2 bg-white/10 text-white font-greycliff !rounded-button hover:bg-white/20 transition">Cancel</button>
            <button type="submit" className="px-6 py-2 bg-white text-black font-greycliff !rounded-button hover:bg-white/90 transition" disabled={!groupName.trim()}>Create Group</button>
          </div>
        </form>
      </div>
    </div>
  );
};
