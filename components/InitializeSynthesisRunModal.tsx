
import React, { useState } from 'react';

interface InitializeSynthesisRunModalProps {
  isOpen: boolean;
  onClose: () => void;
  onStart: (title: string, smiles: string, material: string) => void;
}

const FormInput: React.FC<React.InputHTMLAttributes<HTMLInputElement> & { label: string }> = ({ label, id, ...props }) => (
  <div>
    <label htmlFor={id} className="block text-[10px] font-bold font-greycliff text-white/40 mb-2 uppercase tracking-widest">{label}</label>
    <input 
      id={id} 
      {...props} 
      className="w-full px-4 py-3 bg-black/40 border border-white/10 rounded-lg font-greycliff text-sm focus:outline-none focus:ring-1 focus:ring-white/20 text-white placeholder-white/20 transition-all" 
    />
  </div>
);

export const InitializeSynthesisRunModal: React.FC<InitializeSynthesisRunModalProps> = ({ isOpen, onClose, onStart }) => {
  const [title, setTitle] = useState('');
  const [smiles, setSmiles] = useState('');
  const [material, setMaterial] = useState('');

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title || !smiles) return;
    onStart(title, smiles, material);
    setTitle('');
    setSmiles('');
    setMaterial('');
  };

  return (
    <div className="fixed inset-0 bg-black/90 backdrop-blur-sm flex items-center justify-center z-[100]" onClick={onClose}>
      <div 
        className="bg-[#0b0c10] rounded-2xl w-full max-w-2xl border border-white/10 overflow-hidden shadow-2xl" 
        onClick={e => e.stopPropagation()}
      >
        <div className="p-6 border-b border-white/5 flex justify-between items-center">
          <h2 className="text-xl font-bold font-greycliff text-white">Initialize Synthesis Run</h2>
          <button onClick={onClose} className="text-white/30 hover:text-white transition-colors">
            <i className="ri-close-line text-2xl"></i>
          </button>
        </div>
        
        <form onSubmit={handleSubmit} className="p-8 space-y-8">
          <FormInput
            label="Project Title"
            id="synth-title"
            type="text"
            value={title}
            onChange={e => setTitle(e.target.value)}
            required
            placeholder="e.g., Kinase Inhibitor Project"
          />

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <FormInput
              label="Target Smiles"
              id="target-smiles"
              type="text"
              value={smiles}
              onChange={e => setSmiles(e.target.value)}
              required
              placeholder="CC(C)C1=CC=C..."
            />
            <FormInput
              label="Starting Material"
              id="starting-material"
              type="text"
              value={material}
              onChange={e => setMaterial(e.target.value)}
              placeholder="C1=CC=CC=C1"
            />
          </div>

          <button 
            type="submit" 
            className="w-full py-4 bg-[#14234a] hover:bg-[#1a2b56] rounded-xl font-greycliff text-white/90 font-bold text-xs tracking-widest uppercase shadow-lg transition-all flex items-center justify-center gap-2 mt-4"
          >
            Generate Synthesis Routes
          </button>
        </form>
      </div>
    </div>
  );
};
