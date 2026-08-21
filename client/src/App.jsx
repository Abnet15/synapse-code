import React, { useState, useCallback, useMemo, useEffect } from 'react';
import Sidebar from './components/Sidebar.jsx';
import EditorWorkspace from './components/EditorWorkspace.jsx';
import ChatPanel from './components/ChatPanel.jsx';
import OutputConsole from './components/OutputConsole.jsx';
import PricingModal from './components/PricingModal.jsx';
import AuthModal from './components/AuthModal.jsx';
import { useSocket } from './hooks/useSocket.js';
import { api } from './utils/api.js';
import { LogIn, Zap, Sparkles, AlertCircle, CheckCircle2, ShieldCheck } from 'lucide-react';

const DEFAULT_SNIPPETS = {
  javascript: `// SynapseCode Real-time Ephemeral Workspace (JavaScript)
console.log("Welcome to SynapseCode Enterprise!");

const users = [
  { name: "Ada", role: "Architect", tier: "Pro" },
  { name: "Grace", role: "Systems Engineer", tier: "Free" }
];

console.log("Active Team Members:", JSON.stringify(users, null, 2));
`,
  python: `# SynapseCode Real-time Ephemeral Workspace (Python)
import sys

def main():
    print("🚀 SynapseCode Python 3.9 Container Sandbox")
    print(f"Python Version: {sys.version.split()[0]}")
    
    matrix = [[i * j for j in range(1, 5)] for i in range(1, 5)]
    print("Generated Matrix:", matrix)

if __name__ == "__main__":
    main()
`,
  cpp: `// SynapseCode Pro Container Workspace (C++)
#include <iostream>
#include <vector>
#include <numeric>

int main() {
    std::cout << "⚡ SynapseCode C++ GCC Ephemeral Sandbox" << std::endl;
    
    std::vector<int> numbers = {10, 20, 30, 40, 50};
    int sum = std::accumulate(numbers.begin(), numbers.end(), 0);
    
    std::cout << "Vector Sum: " << sum << std::endl;
    return 0;
}
`,
};

function generateRoomId() {
  return Math.random().toString(36).slice(2, 8).toUpperCase();
}

function JoinScreen({ onJoin, user, onOpenAuth, onOpenPricing }) {
  const [nameInput, setNameInput] = useState(user?.username || '');
  const [roomInput, setRoomInput] = useState('');

  useEffect(() => {
    if (user?.username) {
      setNameInput(user.username);
    }
  }, [user]);

  const handleSubmit = (event) => {
    event.preventDefault();
    const trimmedName = nameInput.trim() || user?.username || `Guest_${Math.floor(Math.random() * 1000)}`;
    const trimmedRoom = roomInput.trim().toUpperCase() || generateRoomId();
    onJoin(trimmedName, trimmedRoom);
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-surface-950 p-4">
      {/* Brand Header */}
      <div className="w-full max-w-md bg-surface-900 border border-surface-800 rounded-2xl p-8 shadow-2xl">
        <div className="flex items-center gap-3 justify-center mb-6">
          <div className="w-12 h-12 rounded-xl bg-cyan-950 border border-cyan-800 flex items-center justify-center text-cyan-400 shadow-lg shadow-cyan-950">
            <Zap size={28} />
          </div>
          <div>
            <h1 className="font-extrabold text-white text-2xl tracking-tight">SynapseCode</h1>
            <span className="text-xs text-cyan-400 font-semibold tracking-wider uppercase">Enterprise IDE</span>
          </div>
        </div>

        {/* User Status Bar */}
        <div className="mb-6 p-3 bg-surface-950/80 border border-surface-800 rounded-xl flex items-center justify-between text-xs">
          {user ? (
            <div className="flex items-center gap-2">
              <div className="w-6 h-6 rounded-full bg-cyan-900 border border-cyan-700 flex items-center justify-center text-cyan-300 font-bold text-[10px]">
                {user.username.charAt(0).toUpperCase()}
              </div>
              <span className="text-gray-200 font-medium">{user.username}</span>
              {user.isPro ? (
                <span className="px-2 py-0.5 text-[9px] font-extrabold text-cyan-400 bg-cyan-950 border border-cyan-800 rounded">
                  PRO
                </span>
              ) : (
                <span className="px-2 py-0.5 text-[9px] font-semibold text-gray-400 bg-surface-800 rounded">
                  FREE
                </span>
              )}
            </div>
          ) : (
            <span className="text-gray-400">Signed in as Guest</span>
          )}

          {!user ? (
            <button
              onClick={onOpenAuth}
              className="text-cyan-400 hover:text-cyan-300 font-bold hover:underline"
            >
              Sign In
            </button>
          ) : !user.isPro ? (
            <button
              onClick={onOpenPricing}
              className="text-cyan-400 hover:text-cyan-300 font-bold flex items-center gap-1"
            >
              <Sparkles size={12} /> Upgrade
            </button>
          ) : null}
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs uppercase tracking-wider font-semibold text-gray-400 mb-1.5">
              Collaborator Display Name
            </label>
            <input
              type="text"
              value={nameInput}
              onChange={(e) => setNameInput(e.target.value)}
              placeholder="e.g. Ada Lovelace"
              className="w-full bg-surface-800 text-gray-200 placeholder-gray-500 text-sm rounded-lg px-3.5 py-2.5 outline-none border border-surface-700 focus:border-cyan-500 transition-all font-medium"
            />
          </div>

          <div>
            <label className="block text-xs uppercase tracking-wider font-semibold text-gray-400 mb-1.5">
              Room Code (Leave blank to generate)
            </label>
            <input
              type="text"
              value={roomInput}
              onChange={(e) => setRoomInput(e.target.value)}
              placeholder="e.g. SYNAPSE"
              className="w-full bg-surface-800 text-gray-200 placeholder-gray-500 text-sm rounded-lg px-3.5 py-2.5 outline-none border border-surface-700 focus:border-cyan-500 transition-all font-mono font-bold tracking-wider uppercase"
            />
          </div>

          <button
            type="submit"
            className="w-full flex items-center justify-center gap-2 mt-4 bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white font-bold text-sm rounded-lg py-3 shadow-lg shadow-cyan-950 transition-all cursor-pointer"
          >
            <LogIn size={18} />
            Enter Workspace
          </button>
        </form>
      </div>

      <div className="mt-6 text-center text-xs text-gray-500 flex items-center gap-2">
        <ShieldCheck size={14} className="text-cyan-500" />
        <span>Chapa SaaS Gateway & Ephemeral Docker Execution Runtimes</span>
      </div>
    </div>
  );
}

export default function App() {
  const [session, setSession] = useState(null);
  const [user, setUser] = useState(null);
  const [language, setLanguage] = useState('javascript');
  const [codeByLanguage, setCodeByLanguage] = useState(DEFAULT_SNIPPETS);
  const [isPricingOpen, setIsPricingOpen] = useState(false);
  const [isAuthOpen, setIsAuthOpen] = useState(false);
  const [paymentBanner, setPaymentBanner] = useState(null);

  // Load User profile from stored JWT token
  useEffect(() => {
    const token = localStorage.getItem('synapse_token');
    if (token) {
      api
        .getMe()
        .then((res) => {
          if (res.user) setUser(res.user);
        })
        .catch(() => {
          localStorage.removeItem('synapse_token');
        });
    }
  }, []);

  // Handle Chapa Payment Verification on Redirect Callback (?payment=success&tx_ref=...)
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const paymentStatus = params.get('payment');
    const tx_ref = params.get('tx_ref');

    if (paymentStatus === 'success' && tx_ref) {
      api
        .verifyPayment(tx_ref)
        .then((data) => {
          if (data.user) {
            setUser(data.user);
            setPaymentBanner({
              type: 'success',
              message: '🎉 Chapa Payment Verified! SynapseCode Pro Subscription Unlocked!',
            });
          }
        })
        .catch((err) => {
          setPaymentBanner({
            type: 'error',
            message: `Payment verification failed: ${err.message}`,
          });
        })
        .finally(() => {
          // Clean up URL parameters
          window.history.replaceState({}, document.title, window.location.pathname);
        });
    }
  }, []);

  const roomId = session?.roomId ?? null;
  const username = session?.username ?? (user?.username || null);

  const { isConnected, messages, output, isRunning, userCount, tierWarning, sendMessage, runCode } = useSocket(
    roomId,
    username,
    user
  );

  const handleJoin = useCallback((name, room) => {
    setSession({ username: name, roomId: room });
  }, []);

  const handleCodeChange = useCallback(
    (value) => {
      setCodeByLanguage((prev) => ({ ...prev, [language]: value }));
    },
    [language]
  );

  const handleRun = useCallback(() => {
    runCode(codeByLanguage[language], language);
  }, [runCode, codeByLanguage, language]);

  const handleAuthSuccess = (authUser) => {
    setUser(authUser);
    if (session) {
      setSession((prev) => ({ ...prev, username: authUser.username }));
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('synapse_token');
    setUser(null);
  };

  const currentCode = useMemo(() => codeByLanguage[language] ?? '', [codeByLanguage, language]);

  if (!session) {
    return (
      <>
        <JoinScreen
          onJoin={handleJoin}
          user={user}
          onOpenAuth={() => setIsAuthOpen(true)}
          onOpenPricing={() => setIsPricingOpen(true)}
        />
        <PricingModal
          isOpen={isPricingOpen}
          onClose={() => setIsPricingOpen(false)}
          user={user}
        />
        <AuthModal
          isOpen={isAuthOpen}
          onClose={() => setIsAuthOpen(false)}
          onAuthSuccess={handleAuthSuccess}
        />
      </>
    );
  }

  return (
    <div className="flex h-screen w-screen bg-surface-950 text-gray-200 overflow-hidden font-sans">
      {/* Left Navigation Sidebar */}
      <Sidebar
        roomId={roomId}
        language={language}
        onLanguageChange={setLanguage}
        userCount={userCount}
        user={user}
        onOpenPricing={() => setIsPricingOpen(true)}
        onOpenAuth={() => setIsAuthOpen(true)}
        onLogout={handleLogout}
      />

      {/* Main Studio Area */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Payment / Tier Banner Notifications */}
        {paymentBanner && (
          <div
            className={`px-4 py-2 flex items-center justify-between text-xs font-bold ${
              paymentBanner.type === 'success'
                ? 'bg-emerald-950 border-b border-emerald-800 text-emerald-300'
                : 'bg-red-950 border-b border-red-800 text-red-300'
            }`}
          >
            <div className="flex items-center gap-2">
              {paymentBanner.type === 'success' ? (
                <CheckCircle2 size={16} className="text-emerald-400" />
              ) : (
                <AlertCircle size={16} className="text-red-400" />
              )}
              <span>{paymentBanner.message}</span>
            </div>
            <button
              onClick={() => setPaymentBanner(null)}
              className="text-gray-400 hover:text-white underline font-normal"
            >
              Dismiss
            </button>
          </div>
        )}

        {tierWarning && !user?.isPro && (
          <div className="px-4 py-1.5 bg-amber-950/80 border-b border-amber-800 text-amber-300 text-xs flex items-center justify-between font-medium">
            <div className="flex items-center gap-2">
              <AlertCircle size={14} className="text-amber-400 flex-shrink-0" />
              <span>{tierWarning}</span>
            </div>
            <button
              onClick={() => setIsPricingOpen(true)}
              className="underline text-amber-200 hover:text-white font-bold ml-2"
            >
              Upgrade Now
            </button>
          </div>
        )}

        {/* Top Header Workspace Status Bar */}
        <div className="flex items-center justify-between px-4 py-2.5 border-b border-surface-800 bg-surface-900">
          <div className="flex items-center gap-3">
            <span className="text-xs text-gray-400">
              Workspace User: <span className="text-white font-bold">{username}</span>
            </span>
            {user?.isPro ? (
              <span className="px-2 py-0.5 text-[10px] font-extrabold uppercase bg-cyan-950 text-cyan-400 border border-cyan-800 rounded flex items-center gap-1">
                <Sparkles size={10} /> Pro Plan
              </span>
            ) : (
              <button
                onClick={() => setIsPricingOpen(true)}
                className="px-2 py-0.5 text-[10px] font-bold uppercase bg-surface-800 text-cyan-400 hover:bg-surface-700 border border-cyan-900/60 rounded flex items-center gap-1 transition-colors"
              >
                <Sparkles size={10} /> Free Tier (Upgrade)
              </button>
            )}
          </div>

          <div className="flex items-center gap-4 text-xs">
            <div className="flex items-center gap-2">
              <span
                className={`w-2 h-2 rounded-full ${
                  isConnected ? 'bg-emerald-400 shadow-sm shadow-emerald-400' : 'bg-amber-400 animate-ping'
                }`}
              />
              <span className={isConnected ? 'text-emerald-400 font-medium' : 'text-amber-400 font-medium'}>
                {isConnected ? 'Realtime Engine Active' : 'Connecting to Server...'}
              </span>
            </div>
          </div>
        </div>

        {/* Main Content Workspace Layout */}
        <div className="flex-1 flex gap-3 p-3 min-h-0 bg-surface-950">
          <div className="flex-1 flex flex-col gap-3 min-w-0">
            {/* Monaco Editor Component */}
            <div className="flex-[3] min-h-0">
              <EditorWorkspace
                roomId={roomId}
                username={username}
                language={language}
                code={currentCode}
                onCodeChange={handleCodeChange}
              />
            </div>

            {/* Docker Execution Terminal Console */}
            <div className="flex-[2] min-h-0">
              <OutputConsole
                output={output}
                isRunning={isRunning}
                onRun={handleRun}
                language={language}
                isPro={user?.isPro}
                onOpenPricing={() => setIsPricingOpen(true)}
              />
            </div>
          </div>

          {/* Real-time Team Chat Sidebar Panel */}
          <div className="w-80 flex-shrink-0">
            <ChatPanel messages={messages} username={username} onSendMessage={sendMessage} />
          </div>
        </div>
      </div>

      {/* Global Modals */}
      <PricingModal
        isOpen={isPricingOpen}
        onClose={() => setIsPricingOpen(false)}
        user={user}
      />
      <AuthModal
        isOpen={isAuthOpen}
        onClose={() => setIsAuthOpen(false)}
        onAuthSuccess={handleAuthSuccess}
      />
    </div>
  );
}
