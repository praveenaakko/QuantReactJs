import React, { useState, useRef } from 'react';

interface AddLigandGroupModalProps {
  isOpen: boolean;
  onClose: () => void;
  onUpload: (groupName: string, description: string, file: File) => void;
  title: string;
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

export const AddLigandGroupModal: React.FC<AddLigandGroupModalProps> = ({ isOpen, onClose, onUpload, title }) => {
  const [groupName, setGroupName] = useState('');
  const [description, setDescription] = useState('');
  const [csvFile, setCsvFile] = useState<File | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const resetForm = () => {
    setGroupName('');
    setDescription('');
    setCsvFile(null);
    if (fileInputRef.current) {
        fileInputRef.current.value = '';
    }
  };

  const handleClose = () => {
    resetForm();
    onClose();
  };

  if (!isOpen) return null;

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) {
      setCsvFile(null);
      return;
    }

    if (!file.name.toLowerCase().endsWith('.csv')) {
      alert('Please upload a valid CSV file.');
      event.target.value = '';
      setCsvFile(null);
      return;
    }
    setCsvFile(file);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!csvFile) {
      alert('Please select a CSV file to upload.');
      return;
    }
    onUpload(groupName, description, csvFile);
    // Reset form after successful upload
    resetForm();
  };

  return (
    <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-[100]" onClick={handleClose}>
      <div className="bg-gray-900 rounded-lg p-8 w-full max-w-lg" onClick={e => e.stopPropagation()}>
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-2xl font-argent">{title}</h2>
          <button onClick={handleClose} className="text-white/50 hover:text-white"><i className="ri-close-line text-2xl"></i></button>
        </div>
        <form onSubmit={handleSubmit} className="space-y-6">
          <FormInput
            label="Group Name"
            id="group-name"
            type="text"
            value={groupName}
            onChange={e => setGroupName(e.target.value)}
            required
            placeholder="e.g., Kinase Inhibitors"
          />
          <FormTextarea
            label="Description"
            id="description"
            value={description}
            onChange={e => setDescription(e.target.value)}
            placeholder="A brief description of the ligand group..."
          />
          <div>
            <label className="block text-sm font-greycliff text-white/70 mb-2">Ligand CSV File</label>
            <div className="relative border border-white/10 border-dashed rounded-lg p-6 flex flex-col items-center justify-center text-center">
              <i className="ri-upload-cloud-2-line text-3xl text-white/50 mb-2"></i>
              <span className="font-greycliff text-white/70 mb-1 break-all">{csvFile ? csvFile.name : 'Upload CSV with SMILES'}</span>
              <span className="text-xs text-white/40">{csvFile ? `${(csvFile.size / 1024).toFixed(2)} KB` : '.csv format required'}</span>
              <input ref={fileInputRef} type="file" accept=".csv" className="absolute inset-0 w-full h-full opacity-0 cursor-pointer" onChange={handleFileChange} />
            </div>
          </div>
          <div className="flex justify-end gap-4 mt-8">
            <button type="button" onClick={handleClose} className="px-6 py-2 bg-white/10 text-white font-greycliff !rounded-button hover:bg-white/20 transition">Cancel</button>
            <button type="submit" className="px-6 py-2 bg-white text-black font-greycliff !rounded-button hover:bg-white/90 transition">Upload Group</button>
          </div>
        </form>
      </div>
    </div>
  );
};