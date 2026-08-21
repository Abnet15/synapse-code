import React, { useState } from 'react';
import { Zap, X, LogIn, UserPlus } from 'lucide-react';
import { api } from '../utils/api';

export default function AuthModal({ isOpen, onClose, onAuthSuccess }) {
  const [isLogin, setIsLogin] = useState(true);
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  if (!isOpen) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      let data;
      if (isLogin) {
        data = await api.login(email || username, password);
      } else {
        data = await api.register(username, email, password);
      }

      if (data.token && data.user) {
        localStorage.setItem('synapse_token', data.token);
        onAuthSuccess(data.user, data.token);
        onClose();
      }
    } catch (err) {
      setError(err.message || 'Authentication error.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
      <div className="relative w-full max-w-md bg-surface-900 border border-surface-700 rounded-2xl shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-surface-800 bg-surface-950/60">
          <div className="flex items-center gap-2">
            <Zap className="text-cyan-400" size={22} />
            <span className="font-bold text-white text-lg">SynapseCode Account</span>
          </div>
          <button
            onClick={onClose}
            className="p-1 text-gray-400 hover:text-white rounded-lg hover:bg-surface-800 transition-colors"
          >
            <X size={18} />
          </button>
        </div>

        {/* Tab Selector */}
        <div className="flex border-b border-surface-800 bg-surface-950/40">
          <button
            onClick={() => {
              setIsLogin(true);
              setError('');
            }}
            className={`flex-1 py-3 text-sm font-semibold transition-colors ${
              isLogin
                ? 'text-cyan-400 border-b-2 border-cyan-400 bg-surface-900/50'
                : 'text-gray-400 hover:text-gray-200'
            }`}
          >
            Sign In
          </button>
          <button
            onClick={() => {
              setIsLogin(false);
              setError('');
            }}
            className={`flex-1 py-3 text-sm font-semibold transition-colors ${
              !isLogin
                ? 'text-cyan-400 border-b-2 border-cyan-400 bg-surface-900/50'
                : 'text-gray-400 hover:text-gray-200'
            }`}
          >
            Create Account
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {error && (
            <div className="p-3 bg-red-950/60 border border-red-800 text-red-300 text-xs rounded-lg">
              {error}
            </div>
          )}

          {!isLogin && (
            <div>
              <label className="block text-xs uppercase tracking-wider text-gray-400 mb-1">
                Username
              </label>
              <input
                type="text"
                required
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="e.g. adalovelace"
                className="w-full bg-surface-800 text-gray-200 placeholder-gray-500 text-sm rounded-lg px-3.5 py-2.5 outline-none border border-surface-700 focus:border-cyan-500 transition-all"
              />
            </div>
          )}

          <div>
            <label className="block text-xs uppercase tracking-wider text-gray-400 mb-1">
              {isLogin ? 'Email or Username' : 'Email Address'}
            </label>
            <input
              type={isLogin ? 'text' : 'email'}
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder={isLogin ? 'ada@example.com or adalovelace' : 'ada@example.com'}
              className="w-full bg-surface-800 text-gray-200 placeholder-gray-500 text-sm rounded-lg px-3.5 py-2.5 outline-none border border-surface-700 focus:border-cyan-500 transition-all"
            />
          </div>

          <div>
            <label className="block text-xs uppercase tracking-wider text-gray-400 mb-1">
              Password
            </label>
            <input
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              className="w-full bg-surface-800 text-gray-200 placeholder-gray-500 text-sm rounded-lg px-3.5 py-2.5 outline-none border border-surface-700 focus:border-cyan-500 transition-all"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full flex items-center justify-center gap-2 mt-6 py-2.5 px-4 bg-cyan-600 hover:bg-cyan-500 text-white font-semibold text-sm rounded-lg shadow-lg shadow-cyan-600/20 transition-all disabled:opacity-50 cursor-pointer"
          >
            {isLogin ? <LogIn size={16} /> : <UserPlus size={16} />}
            {loading ? 'Processing...' : isLogin ? 'Sign In' : 'Create Account'}
          </button>
        </form>
      </div>
    </div>
  );
}
