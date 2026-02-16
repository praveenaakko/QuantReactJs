
import React, { useState, useRef } from 'react';

interface NewGenerationRunModalProps {
  isOpen: boolean;
  onClose: () => void;
  onStart: (title: string, file: File, volume: number) => void;
}

const FormInput: React.FC<React.InputHTMLAttributes<HTMLInputElement> & { label: string }> = ({ label, id, ...props }) => (
  <div>
    <label htmlFor={id} className="block text-[10px] font-bold font-greycliff text-white/50 mb-2 uppercase tracking-widest">{label}</label>
    <input id={id} {...props} className="w-full px-4 py-3 bg-black/40 border border-white/10 rounded-lg font-greycliff text-sm focus:outline-none focus:ring-2 focus:ring-cyan-500/20 text-white placeholder-white/20 transition-all" />
  </div>
);

export const NewGenerationRunModal: React.FC<NewGenerationRunModalProps> = ({ isOpen, onClose, onStart }) => {
  const [title, setTitle] = useState('');
  const [volume, setVolume] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const resetForm = () => {
    setTitle('');
    setVolume('');
    setFile(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleClose = () => {
    resetForm();
    onClose();
  };

  if (!isOpen) return null;

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = event.target.files?.[0];
    if (selectedFile) {
      if (!selectedFile.name.toLowerCase().endsWith('.csv')) {
        alert('Please upload a valid CSV file.');
        return;
      }
      setFile(selectedFile);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title || !file || !volume) return;
    onStart(title, file, parseInt(volume));
    resetForm();
  };

  const handleDownloadSampleCsv = () => {
    const csvContent = `smiles
CCO
CC(=O)O
C1=CC=CC=C1
CCN(CC)CC
CC(C)O
CN1C=NC2=C1C=O
CC(C)N
COC1=CC=CC=C1
CC(C)C(=O)O
CNC(=O)C`;
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', 'seed_compound_sample.csv');
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="fixed inset-0 bg-black/90 backdrop-blur-sm flex items-center justify-center z-[100]" onClick={handleClose}>
      <div className="bg-[#111318] rounded-2xl w-full max-w-xl border border-white/10 overflow-hidden shadow-2xl" onClick={e => e.stopPropagation()}>
        <div className="p-6 border-b border-white/5 flex justify-between items-center bg-white/[0.02]">
          <div className="flex items-center gap-3">
             <div className="w-10 h-10 rounded-lg bg-cyan-500/20 flex items-center justify-center text-cyan-400">
                <i className="ri-dna-line text-xl"></i>
             </div>
             <h2 className="text-xl font-argent text-white">New Generation Run</h2>
          </div>
          <button onClick={handleClose} className="text-white/30 hover:text-white transition-colors">
            <i className="ri-close-line text-2xl"></i>
          </button>
        </div>
        
        <form onSubmit={handleSubmit} className="p-8 space-y-8">
          <FormInput
            label="Project Title"
            id="run-title"
            type="text"
            value={title}
            onChange={e => setTitle(e.target.value)}
            required
            placeholder="e.g., G-Protein Inhibitor Library"
          />

          <div>
            <label className="block text-[10px] font-bold font-greycliff text-white/50 mb-2 uppercase tracking-widest">Target Dataset (CSV)</label>
            <div 
              className={`relative border-2 border-dashed rounded-xl p-10 flex flex-col items-center justify-center text-center transition-all group ${file ? 'border-cyan-500/50 bg-cyan-500/5' : 'border-white/10 hover:border-white/20 bg-black/20'}`}
              onClick={() => fileInputRef.current?.click()}
            >
              <i className={`ri-upload-cloud-2-line text-4xl mb-3 transition-colors ${file ? 'text-cyan-400' : 'text-white/20 group-hover:text-white/40'}`}></i>
              <span className="font-greycliff text-sm text-white/80 mb-1">
                {file ? file.name : 'Upload reference library'}
              </span>
              <span className="text-[10px] text-white/30 uppercase tracking-widest">
                {file ? `${(file.size / 1024).toFixed(2)} KB` : 'MAX FILE SIZE: 50MB'}
              </span>
              <input 
                ref={fileInputRef}
                type="file" 
                accept=".csv" 
                className="hidden" 
                onChange={handleFileChange} 
              />
            </div>
            <div className="mt-3 flex justify-center">
              <button
                type="button"
                onClick={handleDownloadSampleCsv}
                className="text-[10px] font-bold uppercase tracking-widest text-cyan-400 hover:text-cyan-300 transition-colors flex items-center gap-1"
              >
                <i className="ri-download-line text-xs"></i>
                Download Seed Compound Sample
              </button>
            </div>
          </div>

          <FormInput
            label="Output Volume"
            id="output-volume"
            type="number"
            value={volume}
            onChange={e => setVolume(e.target.value)}
            required
            placeholder="Number of compounds to generate"
          />

          <button 
            type="submit" 
            disabled={!title || !file || !volume}
            className="w-full py-4 bg-gradient-to-r from-cyan-500 to-blue-600 rounded-xl font-greycliff text-white font-bold text-sm tracking-widest uppercase shadow-lg shadow-cyan-500/10 hover:shadow-cyan-500/20 transition-all disabled:opacity-20 disabled:grayscale flex items-center justify-center gap-2"
          >
            <i className="ri-flashlight-fill"></i>
            Start AI Pipeline
          </button>
        </form>
      </div>
    </div>
  );
};
