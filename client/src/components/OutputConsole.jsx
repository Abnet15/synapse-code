import React from 'react';
import { Terminal, Play, Loader2, AlertTriangle, CheckCircle2, Shield, Sparkles } from 'lucide-react';

export default function OutputConsole({ output, isRunning, onRun, language, isPro, onOpenPricing }) {
  const hasStderr = Boolean(output.stderr && output.stderr.trim().length > 0);
  const hasStdout = Boolean(output.stdout && output.stdout.trim().length > 0);
  const hasRun = output.exitCode !== null && output.exitCode !== undefined;
  const isLockedForPro = output.exitCode === 403 || (output.stderr && output.stderr.includes('requires a SynapseCode Pro'));

  return (
    <div className="flex flex-col h-full bg-surface-950 rounded-xl border border-surface-800 overflow-hidden shadow-xl">
      {/* Console Toolbar Header */}
      <div className="flex items-center justify-between px-4 py-2.5 bg-surface-900 border-b border-surface-800">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <Terminal size={16} className="text-cyan-400" />
            <span className="text-xs font-bold uppercase tracking-wider text-gray-200">Terminal Output</span>
          </div>

          <span className="text-[11px] text-gray-400 border-l border-surface-700 pl-3">
            Sandbox Limit: <span className="text-cyan-300 font-mono">{isPro ? '10s Timeout (Pro)' : '3s Timeout (Free)'}</span>
          </span>
        </div>

        <button
          onClick={onRun}
          disabled={isRunning}
          className="flex items-center gap-2 px-3.5 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 disabled:bg-surface-800 disabled:text-gray-500 text-white text-xs font-bold transition-all shadow-md shadow-emerald-950/40 cursor-pointer"
        >
          {isRunning ? (
            <>
              <Loader2 size={14} className="animate-spin" />
              <span>Running...</span>
            </>
          ) : (
            <>
              <Play size={14} className="fill-current" />
              <span>Run Code</span>
            </>
          )}
        </button>
      </div>

      {/* Output Console Body */}
      <div className="flex-1 overflow-y-auto p-4 font-mono text-xs leading-relaxed bg-[#0c1017]">
        {!hasRun && !isRunning && (
          <div className="text-gray-500 flex items-center gap-2 py-2">
            <span>Press </span>
            <span className="bg-surface-800 text-emerald-400 px-2 py-0.5 rounded border border-surface-700 font-bold">
              Run Code
            </span>
            <span> to execute {language} inside an isolated Docker sandbox.</span>
          </div>
        )}

        {isRunning && (
          <div className="flex items-center gap-2 text-cyan-400 animate-pulse py-2">
            <Loader2 size={15} className="animate-spin" />
            <span>Spawning ephemeral container ({language})...</span>
          </div>
        )}

        {!isRunning && hasRun && (
          <div className="space-y-3">
            {output.timedOut && (
              <div className="flex items-center gap-2 p-2.5 bg-amber-950/50 border border-amber-800/80 rounded-lg text-amber-300">
                <AlertTriangle size={15} className="flex-shrink-0" />
                <span>Execution limit reached. {output.stderr}</span>
              </div>
            )}

            {isLockedForPro && (
              <div className="p-4 bg-cyan-950/40 border border-cyan-800/80 rounded-xl space-y-3">
                <div className="flex items-center gap-2 text-cyan-300 font-bold text-sm">
                  <Sparkles size={16} />
                  <span>Pro Tier Feature Locked</span>
                </div>
                <p className="text-gray-300 text-xs leading-relaxed">
                  C++ container execution and extended 10s execution timeouts are reserved for SynapseCode Pro Tier subscribers.
                </p>
                <button
                  onClick={onOpenPricing}
                  className="px-4 py-2 bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white font-bold text-xs rounded-lg transition-all shadow-md shadow-cyan-950/50 cursor-pointer"
                >
                  Upgrade to Pro with Chapa Gateway ($15/mo)
                </button>
              </div>
            )}

            {hasStdout && (
              <div className="space-y-1">
                <div className="text-[10px] uppercase font-bold text-emerald-400">STDOUT</div>
                <pre className="whitespace-pre-wrap text-emerald-200 bg-emerald-950/20 p-3 rounded-lg border border-emerald-900/40">
                  {output.stdout}
                </pre>
              </div>
            )}

            {hasStderr && !isLockedForPro && (
              <div className="space-y-1">
                <div className="text-[10px] uppercase font-bold text-red-400">STDERR</div>
                <pre className="whitespace-pre-wrap text-red-300 bg-red-950/20 p-3 rounded-lg border border-red-900/40">
                  {output.stderr}
                </pre>
              </div>
            )}

            {!hasStdout && !hasStderr && !output.timedOut && (
              <div className="flex items-center gap-2 text-gray-400 py-1">
                <CheckCircle2 size={15} className="text-emerald-400" />
                <span>Process completed with no output (Exit Code {output.exitCode}).</span>
              </div>
            )}

            <div className="pt-2 border-t border-surface-800/80 flex items-center justify-between text-[11px] text-gray-500">
              <span>Status: Exit Code {output.exitCode}</span>
              <span className="flex items-center gap-1">
                <Shield size={12} className="text-cyan-500" /> Docker Security Sandbox: Active
              </span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
