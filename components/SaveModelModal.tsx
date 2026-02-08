
import React, { useState, useEffect } from 'react';

interface SaveModelModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (name: string, description: string) => void;
  modelAlgorithm: string;
}

const FormInput: React.FC<React.InputHTMLAttributes<HTMLInputElement> & { label: string }> = ({ label, id, ...props }) => (
  <div>
    <label htmlFor={id} className="block text-sm font-greycliff text-white/70 mb-1">{label}</label>
    <input id={id} {...props} className="w-full px-3 py-2 bg-black/40 rounded-lg font-greycliff text-sm focus:outline-none focus:ring-2 focus:ring-white/20 text-white placeholder-white/50" />
  </div>
);

const FormTextarea: React.FC<React.TextareaHTMLAttributes<HTMLTextAreaElement> & { label: string }> = ({ label, id, ...props }) => (
  <div>
    <label htmlFor={id} className="block text-sm font-greycliff text-white/70 mb-1">{label}</label>
    <textarea id={id} {...props} rows={3} className="w-full px-3 py-2 bg-black/40 rounded-lg font-greycliff text-sm focus:outline-none focus:ring-2 focus:ring-white/20 text-white placeholder-white/50" />
  </div>
);


export const SaveModelModal: React.FC<SaveModelModalProps> = ({ isOpen, onClose, onSave, modelAlgorithm }) => {
  const [modelName, setModelName] = useState('');
  const [description, setDescription] = useState('');

  useEffect(() => {
    if (isOpen) {
      // Pre-fill model name when modal opens
      setModelName(`${modelAlgorithm} Model`);
      setDescription(''); // Reset description
    }
  }, [isOpen, modelAlgorithm]);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!modelName) {
      alert('Please provide a name for the model.');
      return;
    }
    onSave(modelName, description);
  };

  return (
    <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-[100]" onClick={onClose}>
      <div className="bg-gray-900 rounded-lg p-8 w-full max-w-lg" onClick={e => e.stopPropagation()}>
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-2xl font-argent">Save {modelAlgorithm} Model</h2>
          <button onClick={onClose} className="text-white/50 hover:text-white"><i className="ri-close-line text-2xl"></i></button>
        </div>
        <form onSubmit={handleSubmit} className="space-y-6">
          <FormInput
            label="Model Name"
            id="model-name"
            type="text"
            value={modelName}
            onChange={e => setModelName(e.target.value)}
            required
            placeholder="e.g., Final XGBoost for pIC50"
          />
          <FormTextarea
            label="Description"
            id="description"
            value={description}
            onChange={e => setDescription(e.target.value)}
            placeholder="A brief description of the model, dataset, or purpose..."
          />
          
          <div className="flex justify-end gap-4 mt-8">
            <button type="button" onClick={onClose} className="px-6 py-2 bg-white/10 text-white font-greycliff !rounded-button hover:bg-white/20 transition">Cancel</button>
            <button type="submit" className="px-6 py-2 bg-white text-black font-greycliff !rounded-button hover:bg-white/90 transition">Save Model</button>
          </div>
        </form>
      </div>
    </div>
  );
};
