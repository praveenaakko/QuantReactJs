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

  const isDangerAction = /delete|remove/i.test(confirmText) || /delete|remove/i.test(title);

  return (
    <div
      className="fixed inset-0 z-[120] flex items-center justify-center bg-black/75 backdrop-blur-sm p-4"
      onClick={onClose}
    >
      <div
        className="w-full max-w-xl overflow-hidden rounded-3xl border border-white/15 bg-[#0d1324] shadow-[0_30px_80px_rgba(0,0,0,0.65)]"
        onClick={e => e.stopPropagation()}
      >
        <div className={`h-1 w-full ${isDangerAction ? 'bg-gradient-to-r from-red-500/70 via-red-400/80 to-red-500/70' : 'bg-gradient-to-r from-cyan-500/70 via-cyan-400/80 to-cyan-500/70'}`}></div>

        <div className="px-7 pt-6 pb-5">
          <div className="flex items-start gap-4">
            <div className={`mt-0.5 flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl border ${isDangerAction ? 'border-red-400/35 bg-red-500/20' : 'border-cyan-400/35 bg-cyan-500/20'}`}>
              <i className={`${isDangerAction ? 'ri-alert-line text-red-200' : 'ri-information-line text-cyan-200'} text-xl`}></i>
            </div>
            <div className="min-w-0">
              <p className="text-[9px] uppercase tracking-[0.2em] text-white/45 font-greycliff font-bold mb-2">
                {isDangerAction ? 'Destructive Action' : 'Confirmation Required'}
              </p>
              <h2 className="text-2xl font-argent leading-tight text-white">{title}</h2>
              <div className="mt-2 text-sm font-greycliff leading-relaxed text-white/75">
                {message}
              </div>
            </div>
          </div>

          {isDangerAction && (
            <div className="mt-4 rounded-xl border border-red-500/25 bg-red-500/10 px-4 py-2.5 text-xs font-greycliff text-red-200/90">
              This action is permanent and cannot be reversed.
            </div>
          )}
        </div>

        <div className="flex flex-col-reverse gap-3 border-t border-white/10 bg-black/20 px-7 py-5 sm:flex-row sm:justify-end">
          <button
            type="button"
            onClick={onClose}
            disabled={isConfirming}
            className="inline-flex h-11 items-center justify-center rounded-xl border border-white/15 bg-white/[0.06] px-6 font-greycliff text-white/90 transition hover:bg-white/[0.12] disabled:cursor-not-allowed disabled:opacity-50"
          >
            {cancelText}
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={isConfirming}
            className={`inline-flex h-11 min-w-36 items-center justify-center rounded-xl px-6 font-greycliff font-semibold text-white transition disabled:cursor-not-allowed disabled:opacity-50 ${
              isDangerAction
                ? 'bg-red-600 shadow-[0_0_24px_rgba(220,38,38,0.35)] hover:bg-red-500'
                : 'bg-cyan-600 shadow-[0_0_24px_rgba(8,145,178,0.35)] hover:bg-cyan-500'
            }`}
          >
            {isConfirming ? <i className="ri-loader-4-line animate-spin text-lg"></i> : confirmText}
          </button>
        </div>
      </div>
    </div>
  );
};
