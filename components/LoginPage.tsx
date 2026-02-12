import React, { useState } from 'react';
import { ThreeDBackground } from './ThreeDBackground';
import type { User } from '../types';
import { UserStatus, UserRole } from '../types';
import { useStore } from '../store/store';
import api from '../config/api';
import { normalizeUserPhoto } from '../utils/userPhoto';

interface LoginPageProps {
  onLoginSuccess: (user: User) => void;
}

const mapApiUserToUser = (apiUser: any): User => ({
  id: String(apiUser.id),
  name: apiUser.name,
  email: apiUser.email,
  photoUrl: normalizeUserPhoto(apiUser.photo ?? apiUser.photoUrl),
  status: apiUser.status as UserStatus,
  role: apiUser.role as UserRole,
  additionalInfo: apiUser.additionalInfo || '',
});


export const LoginPage: React.FC<LoginPageProps> = ({ onLoginSuccess }) => {
  const { dispatch } = useStore();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    try {
      const body = new FormData();
      body.append('email', email);
      body.append('password', password);

      const data = await api.post('/auth/login', { email, password });
      
      if (data.user.status === UserStatus.PENDING) {
        setError('Your account is pending verification by an administrator.');
        setIsLoading(false);
        return;
      }
      
      localStorage.setItem('token', data.token);
      localStorage.setItem('user', JSON.stringify(data.user));
      
      const mappedUser = mapApiUserToUser(data.user);
      
      dispatch({ type: 'LOGIN', payload: mappedUser });
      onLoginSuccess(mappedUser);

    } catch (err) {
      setError(err instanceof Error ? err.message : 'Login failed. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-black p-4 relative overflow-hidden">
      <ThreeDBackground />
      <div className="relative w-full max-w-sm z-10">
        {/* HUD Corner Elements */}
        <div className="hud-corner hud-corner-tl absolute top-0 left-0 w-10 h-10"></div>
        <div className="hud-corner hud-corner-tr absolute top-0 right-0 w-10 h-10"></div>
        <div className="hud-corner hud-corner-bl absolute bottom-0 left-0 w-10 h-10"></div>
        <div className="hud-corner hud-corner-br absolute bottom-0 right-0 w-10 h-10"></div>

        <div className="p-8 space-y-8">
          <div className="text-center">
            <h1 
              className="text-4xl font-argent text-white"
              style={{ textShadow: '0 0 10px rgba(6, 182, 212, 0.7)' }}
            >
              QuantCure
            </h1>
            <p className="font-greycliff text-white/70 mt-2">Initializing Synapse Interface...</p>
          </div>
          <form className="space-y-8" onSubmit={handleLogin}>
            <div className="relative">
              <i className="ri-mail-line absolute top-1/2 -translate-y-1/2 left-3 text-white/50"></i>
              <input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                autoComplete="email"
                className="w-full bg-transparent border-b-2 border-white/20 focus:border-cyan-400 focus:outline-none transition duration-300 py-3 pl-10 pr-4 font-greycliff text-white placeholder-white/50"
                placeholder="Email Address"
              />
            </div>
            <div className="relative">
              <i className="ri-lock-password-line absolute top-1/2 -translate-y-1/2 left-3 text-white/50"></i>
              <input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                autoComplete="current-password"
                className="w-full bg-transparent border-b-2 border-white/20 focus:border-cyan-400 focus:outline-none transition duration-300 py-3 pl-10 pr-4 font-greycliff text-white placeholder-white/50"
                placeholder="Password"
              />
            </div>
            {error && <p className="text-red-400 text-sm font-greycliff text-center flex items-center justify-center gap-2"><i className="ri-error-warning-line"></i>{error}</p>}
            <div>
              <button
                type="submit"
                disabled={isLoading}
                className="w-full mt-4 px-6 py-3 bg-transparent border border-cyan-400 text-cyan-400 font-greycliff !rounded-button hover:bg-cyan-400 hover:text-black login-btn-glow transition-all duration-300 flex justify-center items-center disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isLoading ? <i className="ri-loader-4-line animate-spin"></i> : 'Authenticate'}
              </button>
            </div>
          </form>
          <p className="text-center text-xs font-greycliff text-white/50 pt-4">
          </p>
        </div>
      </div>
    </div>
  );
};
