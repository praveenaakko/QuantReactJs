import React from 'react';

interface ConfirmationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  message: React.ReactNode;
  confirmText?: string;
  cancelText?: string;
  isConfirming?: boolean;
}

export const ConfirmationModal: React.FC<ConfirmationModalProps> = ({
  isOpen,
  onClose,
  onConfirm,
  title,
  message,
  confirmText = 'Confirm',
  cancelText = 'Cancel',
  isConfirming = false,
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-[100]" onClick={onClose}>
      <div className="bg-gray-900 rounded-lg p-8 w-full max-w-md border border-red-500/30" onClick={e => e.stopPropagation()}>
        <div className="flex items-start space-x-4">
            <div className="shrink-0 flex items-center justify-center h-12 w-12 rounded-full bg-red-500/20">
                 <i className="ri-error-warning-line text-red-400 text-2xl"></i>
            </div>
            <div>
                <h2 className="text-2xl font-argent text-white">{title}</h2>
                <div className="mt-2 text-sm font-greycliff text-white/70">
                    {message}
                </div>
            </div>
        </div>
        <div className="flex justify-end gap-4 mt-8">
          <button
            type="button"
            onClick={onClose}
            disabled={isConfirming}
            className="px-6 py-2 bg-white/10 text-white font-greycliff !rounded-button hover:bg-white/20 transition disabled:opacity-50"
          >
            {cancelText}
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={isConfirming}
            className="px-6 py-2 bg-red-600 text-white font-greycliff !rounded-button hover:bg-red-700 transition disabled:opacity-50 disabled:bg-red-600/50 flex items-center justify-center w-28"
          >
            {isConfirming ? <i className="ri-loader-4-line animate-spin"></i> : confirmText}
          </button>
        </div>
      </div>
    </div>
  );
};
