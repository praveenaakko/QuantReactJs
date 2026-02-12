
import React from 'react';
import { useStore } from '../store/store';
import { hasUserPhoto } from '../utils/userPhoto';

const ProfileDetailItem: React.FC<{ icon: string, label: string, value: string }> = ({ icon, label, value }) => (
    <div className="flex items-start space-x-4">
        <i className={`${icon} text-white/50 text-xl mt-1`}></i>
        <div>
            <p className="text-sm text-white/60 font-greycliff">{label}</p>
            <p className="font-greycliff text-white">{value}</p>
        </div>
    </div>
);

export const ProfileModal: React.FC = () => {
  const { state, dispatch } = useStore();
  const { isProfileModalOpen, currentUser } = state;

  const handleClose = () => dispatch({ type: 'CLOSE_PROFILE_MODAL' });
  const handleLogout = () => dispatch({ type: 'LOGOUT' });

  if (!isProfileModalOpen || !currentUser) return null;

  // Check if photoUrl is valid (not null, undefined string, or empty)
  const hasPhoto = hasUserPhoto(currentUser.photoUrl);

  return (
    <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-[100]" onClick={handleClose}>
      <div 
        className="bg-gray-900 rounded-2xl p-8 w-full max-w-sm border border-white/10" 
        onClick={e => e.stopPropagation()}
        style={{
            backgroundImage: `radial-gradient(circle at top right, rgba(120, 120, 255, 0.1), transparent 40%)`
        }}
      >
        <div className="flex justify-end mb-4">
            <button onClick={handleClose} className="text-white/50 hover:text-white transition"><i className="ri-close-line text-2xl"></i></button>
        </div>
        <div className="flex flex-col items-center text-center">
            <div className="w-28 h-28 rounded-full border-4 border-gray-700 mb-4 overflow-hidden bg-white/10 flex items-center justify-center">
                {hasPhoto ? (
                    <img
                        src={currentUser.photoUrl}
                        alt="User Profile"
                        className="w-full h-full object-cover"
                    />
                ) : (
                     <i className="ri-user-line text-5xl text-white/50"></i>
                )}
            </div>
            <h2 className="text-3xl font-argent text-white">{currentUser.name}</h2>
            <p className="font-greycliff text-white/70 capitalize">{currentUser.role} Role</p>
        </div>
        
        <hr className="border-t border-white/10 my-8" />

        <div className="space-y-6 text-left">
            <ProfileDetailItem icon="ri-mail-line" label="Contact" value={currentUser.email} />
            {currentUser.additionalInfo && <ProfileDetailItem icon="ri-information-line" label="Additional Info" value={currentUser.additionalInfo} />}
        </div>
        
        <hr className="border-t border-white/10 my-8" />
        
        <button
            onClick={handleLogout}
            className="w-full px-6 py-2 bg-white/10 text-white font-greycliff !rounded-button hover:bg-red-500/50 hover:border-red-500/50 transition flex items-center justify-center gap-2"
        >
            <i className="ri-logout-box-r-line"></i>
            Logout
        </button>
      </div>
    </div>
  );
};
