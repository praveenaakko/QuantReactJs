
import React from 'react';
import { UserRole, View } from '../types';
import { useStore } from '../store/store';

export const Header: React.FC = () => {
    const { state, dispatch } = useStore();
    const { currentView, currentUser, isLoading } = state;
    
    const navLinkClasses = "font-greycliff hover:bg-white/20 transition cursor-pointer px-3 py-1 rounded-md";
    const activeLinkClasses = "bg-white/10 text-white";

    const handleViewChange = (view: View) => {
        if (view === currentView || isLoading) {
          return;
        }
    
        dispatch({ type: 'SET_LOADING', payload: true });
        dispatch({ type: 'RESET_WORKFLOW_STATE' });
    
        setTimeout(() => {
            dispatch({ type: 'SET_VIEW', payload: view });
            dispatch({ type: 'SET_LOADING', payload: false });
        }, 500);
    };

    return (
        <nav className="fixed w-full bg-black/90 backdrop-blur-sm z-50 border-b border-white/10">
            <div className="container mx-auto px-6 py-4">
                <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-8">
                        <h1 className="text-2xl font-argent text-white">QuantCure</h1>
                        <div className="hidden md:flex items-center space-x-4">
                            <button onClick={() => handleViewChange('dashboard')} className={`${navLinkClasses} ${currentView === 'dashboard' ? activeLinkClasses : 'text-white/70'}`}>Dashboard</button>
                            <button onClick={() => handleViewChange('docker')} className={`${navLinkClasses} ${currentView === 'docker' ? activeLinkClasses : 'text-white/70'}`}>Docker</button>
                            <button onClick={() => handleViewChange('ml-builder')} className={`${navLinkClasses} ${currentView === 'ml-builder' ? activeLinkClasses : 'text-white/70'}`}>ML Builder</button>
                            <button onClick={() => handleViewChange('ml-predictor')} className={`${navLinkClasses} ${currentView === 'ml-predictor' ? activeLinkClasses : 'text-white/70'}`}>ML Predictor</button>
                        </div>
                    </div>
                    <div className="flex items-center gap-4">
                        {currentUser?.role === UserRole.ADMIN && (
                            <button onClick={() => dispatch({ type: 'OPEN_CREATE_USER_MODAL' })} className="px-6 py-2 bg-white/10 text-white font-greycliff !rounded-button hover:bg-white/20 transition">
                                Create User
                            </button>
                        )}
                        <button onClick={() => dispatch({ type: 'OPEN_PROFILE_MODAL' })} className="px-6 py-2 bg-white text-black font-greycliff !rounded-button hover:bg-white/90 transition">
                            Profile
                        </button>
                    </div>
                </div>
            </div>
        </nav>
    );
};