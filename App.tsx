
import React, { useCallback, useEffect } from 'react';
import { Header } from './components/Header';
import { ProteinSection } from './components/ProteinSection';
import { LigandSection } from './components/LigandSection';
import { DockingSection } from './components/DockingSection';
import { Footer } from './components/Footer';
import { Notification } from './components/Notification';
import type { User, UserStatus, UserRole, SavedModel, DockingRun } from './types';
import { NotificationType } from './types';
import { MLBuilderSection } from './components/MLBuilderSection';
import { ProfileModal } from './components/ProfileModal';
import { MLPredictorSection } from './components/MLPredictorSection';
import { HomeSection } from './components/HomeSection';
import { LoginPage } from './components/LoginPage';
import { CreateUserModal } from './components/CreateUserModal';
import { useStore } from './store/store';
import { Loader } from './components/Loader';
import api from './config/api';

const App: React.FC = () => {
  const { state, dispatch } = useStore();
  const { notifications, currentView, currentUser, savedModels, isLoading } = state;

  const addNotification = useCallback((message: string, type: NotificationType) => {
    const id = Date.now() + Math.random();
    dispatch({ type: 'ADD_NOTIFICATION', payload: { id, message, type } });
    setTimeout(() => {
      dispatch({ type: 'REMOVE_NOTIFICATION', payload: id });
    }, 3000);
  }, [dispatch]);

  useEffect(() => {
    const token = localStorage.getItem('token');
    const storedUser = localStorage.getItem('user');

    if (token && storedUser) {
      try {
        const apiUser = JSON.parse(storedUser);
        
        const mappedUser: User = {
          id: String(apiUser.id),
          name: apiUser.name,
          email: apiUser.email,
          photoUrl: `/${String(apiUser.photo).replace(/\\/g, '/').replace('app/', '')}`,
          status: apiUser.status as UserStatus,
          role: apiUser.role as UserRole,
          additionalInfo: apiUser.additionalInfo || '',
        };

        dispatch({ type: 'LOGIN', payload: mappedUser });
      } catch (error) {
        console.error("Failed to parse user from localStorage", error);
        localStorage.removeItem('token');
        localStorage.removeItem('user');
      }
    }
  }, [dispatch]);
  
  useEffect(() => {
    // On view change, scroll to the top of the page
    window.scrollTo(0, 0);
  }, [currentView]);

  const onLoginSuccess = (user: User) => {
      addNotification(`Welcome back, ${user.name}!`, NotificationType.SUCCESS)
  }

  if (!currentUser) {
    return <LoginPage onLoginSuccess={onLoginSuccess} />;
  }

  return (
    <div className="bg-black text-white min-h-screen">
      <Header />
      {isLoading && <Loader />}
      <main className="relative z-0">
        {currentView === 'dashboard' && <HomeSection />}
        {currentView === 'docker' && (
          <DockingSection addNotification={addNotification} />
        )}
        {currentView === 'ml-builder' && <MLBuilderSection addNotification={addNotification} />}
        {/* FIX: Removed redundant `savedModels` prop. The `MLPredictorSection` component sources this data from the global store. */}
        {currentView === 'ml-predictor' && <MLPredictorSection addNotification={addNotification} />}
        <Footer />
      </main>
      <div className="fixed top-4 right-4 z-[100] space-y-2">
        {notifications.map(notification => (
          <Notification key={notification.id} notification={notification} />
        ))}
      </div>
      <ProfileModal />
      <CreateUserModal addNotification={addNotification}/>
    </div>
  );
};

export default App;