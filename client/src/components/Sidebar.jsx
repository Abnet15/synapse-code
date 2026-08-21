import React from 'react';
import { FileCode2, FolderOpen, Zap, Lock, Sparkles, LogOut, User as UserIcon } from 'lucide-react';

const LANGUAGES = [
  { id: 'javascript', label: 'JavaScript', file: 'main.js', requiresPro: false },
  { id: 'python', label: 'Python', file: 'main.py', requiresPro: false },
  { id: 'cpp', label: 'C++', file: 'main.cpp', requiresPro: true },
];

export default function Sidebar({
  roomId,
  language,
  onLanguageChange,
  userCount,
  user,
  onOpenPricing,
  onOpenAuth,
  onLogout,
}) {
  const isPro = user?.isPro || false;

  return (
    <div className="flex flex-col h-full bg-surface-900 border-r border-surface-800 w-64 flex-shrink-0">
      {/* App Brand Header */}
      <div className="flex items-center justify-between px-4 py-4 border-b border-surface-800 bg-surface-950/40">
        <div className="flex items-center gap-2">
          <Zap size={22} className="text-cyan-400" />
          <span className="font-bold text-white text-lg tracking-tight">SynapseCode</span>
        </div>
        {isPro ? (
          <span className="px-2 py-0.5 text-[10px] font-extrabold uppercase tracking-wider bg-cyan-500/20 text-cyan-400 border border-cyan-500/40 rounded flex items-center gap-1">
            <Sparkles size={10} /> Pro
          </span>
        ) : (
          <span className="px-2 py-0.5 text-[10px] font-extrabold uppercase tracking-wider bg-surface-800 text-gray-400 border border-surface-700 rounded">
            Free
          </span>
        )}
      </div>

      {/* Room Information */}
      <div className="px-4 py-3.5 border-b border-surface-800 bg-surface-950/20">
        <div className="text-[11px] uppercase tracking-wider font-semibold text-gray-400 mb-1">
          Room Session
        </div>
        <div className="text-sm font-mono font-bold text-cyan-300 truncate bg-surface-950 px-2.5 py-1 rounded border border-surface-800">
          {roomId || 'LOBBY'}
        </div>
        <div className="flex items-center justify-between mt-2 text-xs text-gray-400">
          <span>
            {userCount} active user{userCount !== 1 ? 's' : ''}
          </span>
          {!isPro && <span className="text-[11px] text-amber-400/90 font-medium">Max 2 free</span>}
        </div>
      </div>

      {/* Language / File Selector */}
      <div className="px-4 py-4 flex-1 overflow-y-auto">
        <div className="flex items-center gap-1.5 text-[11px] uppercase tracking-wider font-semibold text-gray-400 mb-2">
          <FolderOpen size={13} />
          <span>Active Runtimes</span>
        </div>

        <div className="space-y-1">
          {LANGUAGES.map((lang) => {
            const isLocked = lang.requiresPro && !isPro;
            const isSelected = language === lang.id;

            return (
              <button
                key={lang.id}
                onClick={() => {
                  if (isLocked) {
                    onOpenPricing();
                  } else {
                    onLanguageChange(lang.id);
                  }
                }}
                className={`w-full flex items-center justify-between px-3 py-2 rounded-lg text-sm transition-all duration-150 ${
                  isSelected
                    ? 'bg-surface-800 text-white font-medium shadow-sm border border-surface-700'
                    : 'text-gray-400 hover:bg-surface-800/60 hover:text-gray-200'
                }`}
              >
                <div className="flex items-center gap-2.5 font-mono text-xs">
                  <FileCode2
                    size={15}
                    className={isSelected ? 'text-cyan-400' : 'text-gray-500'}
                  />
                  <span>{lang.file}</span>
                </div>

                {isLocked && (
                  <span className="flex items-center gap-1 text-[10px] text-amber-400 bg-amber-950/60 border border-amber-800/60 px-1.5 py-0.5 rounded font-semibold">
                    <Lock size={10} /> Pro
                  </span>
                )}
              </button>
            );
          })}
        </div>

        {/* Upgrade Banner for Free Users */}
        {!isPro && (
          <div className="mt-6 p-3.5 bg-gradient-to-b from-cyan-950/40 to-surface-900 border border-cyan-800/60 rounded-xl">
            <div className="flex items-center gap-1.5 text-xs font-bold text-cyan-300 mb-1">
              <Sparkles size={14} />
              <span>Unlock Synapse Pro</span>
            </div>
            <p className="text-[11px] text-gray-400 mb-3 leading-relaxed">
              Unlock C++ Docker containers, 10s timeouts, and Chapa Ethiopian payment gateway integration.
            </p>
            <button
              onClick={onOpenPricing}
              className="w-full py-1.5 px-3 bg-cyan-600 hover:bg-cyan-500 text-white text-xs font-bold rounded-md transition-colors shadow-md shadow-cyan-900/40"
            >
              Upgrade for $15 / Mo
            </button>
          </div>
        )}
      </div>

      {/* User Footer Profile */}
      <div className="mt-auto px-4 py-3 border-t border-surface-800 bg-surface-950/60">
        {user ? (
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 min-w-0">
              <div className="w-7 h-7 rounded-full bg-cyan-950 border border-cyan-700 flex items-center justify-center text-cyan-300 text-xs font-bold flex-shrink-0">
                {user.username.charAt(0).toUpperCase()}
              </div>
              <div className="min-w-0">
                <div className="text-xs font-medium text-gray-200 truncate">{user.username}</div>
                <div className="text-[10px] text-gray-400 truncate">{user.email}</div>
              </div>
            </div>
            <button
              onClick={onLogout}
              title="Sign Out"
              className="p-1 text-gray-400 hover:text-red-400 transition-colors"
            >
              <LogOut size={15} />
            </button>
          </div>
        ) : (
          <button
            onClick={onOpenAuth}
            className="w-full flex items-center justify-center gap-2 py-2 px-3 bg-surface-800 hover:bg-surface-700 text-gray-200 text-xs font-medium rounded-lg transition-colors border border-surface-700"
          >
            <UserIcon size={14} />
            <span>Sign In / Register</span>
          </button>
        )}
      </div>
    </div>
  );
}
