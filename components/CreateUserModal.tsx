
import React, { useState } from 'react';
import type { User } from '../types';
import { UserRole, UserStatus, NotificationType } from '../types';
import { useStore } from '../store/store';
import api from '../config/api';

interface CreateUserModalProps {
    addNotification: (message: string, type: NotificationType) => void;
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

export const CreateUserModal: React.FC<CreateUserModalProps> = ({ addNotification }) => {
  const { state, dispatch } = useStore();
  const { isCreateUserModalOpen } = state;
  
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [additionalInfo, setAdditionalInfo] = useState('');
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleClose = () => dispatch({ type: 'CLOSE_CREATE_USER_MODAL' });

  if (!isCreateUserModalOpen) return null;

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      setPhotoFile(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setPhotoPreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };
  
  const resetForm = () => {
    setName('');
    setEmail('');
    setPassword('');
    setConfirmPassword('');
    setAdditionalInfo('');
    setPhotoFile(null);
    setPhotoPreview(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password !== confirmPassword) {
      addNotification("Passwords do not match.", NotificationType.ERROR);
      return;
    }
    
    setIsSubmitting(true);
    
    const formData = new FormData();
    formData.append('name', name);
    formData.append('email', email);
    formData.append('password', password);
    formData.append('additionalInfo', additionalInfo);
    if (photoFile) {
        formData.append('photo', photoFile);
    }

    try {
        const responseData = await api.post('/auth/register', formData);

        // Construct the new user object for the state update.
        // This combines form data with the response from the server to handle cases
        // where the API response might be incomplete (e.g., missing a 'name' property).
        const newUser: User = {
            id: responseData.id || `temp-id-${Date.now()}-${Math.random()}`, // Use server ID or a temporary fallback
            name: name, // Use name from the form state, which is guaranteed to be correct
            email: email,
            additionalInfo: additionalInfo,
            photoUrl: responseData.photoUrl || photoPreview || "", 
            status: responseData.status || UserStatus.PENDING, // Default to PENDING
            role: responseData.role || UserRole.USER, // Default to USER
        };

        dispatch({ type: 'CREATE_USER', payload: newUser });
        // Use the 'name' from the form state for the notification to avoid errors if the API response lacks it.
        addNotification(`User "${name}" created successfully. Account is pending verification.`, NotificationType.SUCCESS);
        resetForm();
        handleClose();

    } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred.';
        addNotification(errorMessage, NotificationType.ERROR);
    } finally {
        setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-[100]" onClick={handleClose}>
      <div className="bg-gray-900 rounded-lg p-8 w-full max-w-2xl max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-2xl font-argent">Create New User</h2>
          <button onClick={handleClose} className="text-white/50 hover:text-white"><i className="ri-close-line text-2xl"></i></button>
        </div>
        <form onSubmit={handleSubmit} className="space-y-4">
            <div className="flex items-center space-x-6">
                <div className="shrink-0">
                    {photoPreview ? (
                        <img className="h-20 w-20 object-cover rounded-full border border-white/20" src={photoPreview} alt="New profile photo" />
                    ) : (
                        <div className="h-20 w-20 rounded-full bg-white/10 flex items-center justify-center border border-white/20 text-white/50">
                            <i className="ri-user-add-line text-3xl"></i>
                        </div>
                    )}
                </div>
                <label className="block">
                    <span className="sr-only">Choose profile photo</span>
                    <input type="file" accept="image/*" onChange={handleFileChange} className="block w-full text-sm text-slate-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-violet-50 file:text-violet-700 hover:file:bg-violet-100"/>
                </label>
            </div>
          <FormInput label="Full Name" id="name" type="text" value={name} onChange={e => setName(e.target.value)} required />
          <FormInput label="Email Address" id="email" type="email" value={email} onChange={e => setEmail(e.target.value)} required />
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <FormInput label="Password" id="password" type="password" value={password} onChange={e => setPassword(e.target.value)} required />
            <FormInput label="Confirm Password" id="confirm-password" type="password" value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)} required />
          </div>
          <FormTextarea label="Additional Info" id="additional-info" value={additionalInfo} onChange={e => setAdditionalInfo(e.target.value)} placeholder="e.g., Role, department, or a short bio..."/>
          
          <div className="flex justify-end gap-4 pt-4">
            <button type="button" onClick={handleClose} className="px-6 py-2 bg-white/10 text-white font-greycliff !rounded-button hover:bg-white/20 transition">Cancel</button>
            <button type="submit" disabled={isSubmitting} className="px-6 py-2 bg-white text-black font-greycliff !rounded-button hover:bg-white/90 transition disabled:bg-white/50 disabled:cursor-not-allowed flex items-center justify-center w-36">
              {isSubmitting ? <i className="ri-loader-4-line animate-spin"></i> : 'Create User'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
