import React, { useState } from 'react';
import {
  Terminal,
  Play,
  Loader2,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  Shield,
  Sparkles,
  FlaskConical,
  Globe,
  Bot,
} from 'lucide-react';
import { api } from '../utils/api';

const DEFAULT_TEST_CASES = [
  {
    id: 'tc-1',
    name: 'Exit Code 0 & Non-Empty Output',
    expectedOutput: '',
    harness: '',
  },
];

export default function OutputConsole({
  output,
  isRunning,
  onRun,
  language,
  code,
  isPro,
  onOpenPricing,
  testResults,
  isTesting,
  onRunTests,
}) {
  const [activeTab, setActiveTab] = useState('terminal');
  const [expectedStdout, setExpectedStdout] = useState('');
  const [aiAction, setAiAction] = useState('explain');
  const [aiLoading, setAiLoading] = useState(false);
  const [aiResponse, setAiResponse] = useState('');

  const hasStderr = Boolean(output.stderr && output.stderr.trim().length > 0);
  const hasStdout = Boolean(output.stdout && output.stdout.trim().length > 0);
  const hasRun = output.exitCode !== null && output.exitCode !== undefined;
  const isLockedForPro =
    output.exitCode === 403 || (output.stderr && output.stderr.includes('requires a SynapseCode Pro'));

  const handleTriggerTests = () => {
    const cases = [
      {
        ...DEFAULT_TEST_CASES[0],
        name: 'Expected STDOUT Verification',
        expectedOutput: expectedStdout.trim() || (output.stdout || '').trim(),
      },
    ];
    onRunTests?.(cases);
  };

  const handleAskAi = async (selectedAction) => {
    setAiAction(selectedAction);
    setAiLoading(true);
    setAiResponse('');
    try {
      const data = await api.assistCode(selectedAction, language, code);
      setAiResponse(data.result);
    } catch (err) {
      setAiResponse(`Error: ${err.message}`);
    } finally {
      setAiLoading(false);
    }
  };

  const buildPreviewHtml = () => {
    if (language === 'javascript' || language === 'typescript') {
      return `<!doctype html><html><body style="background:#0f172a;color:#e2e8f0;font-family:sans-serif;padding:16px;"><h3>Live JS Sandbox Preview</h3><pre id="out" style="background:#1e293b;padding:12px;border-radius:8px;"></pre><script>const out=document.getElementById('out');const orig=console.log;console.log=(...a)=>{out.textContent+=a.map(x=>typeof x==='object'?JSON.stringify(x,null,2):String(x)).join(' ')+'\\n';orig(...a);};try{${code}}catch(e){out.textContent+='Error: '+e.message;}</script></body></html>`;
    }
    return `<!doctype html><html><body style="background:#0f172a;color:#94a3b8;font-family:sans-serif;padding:16px;"><h3>Web Preview (${language})</h3><p>Switch to JavaScript for live browser DOM/console execution, or use Terminal Output for ${language} Docker execution.</p></body></html>`;
  };

  return (
    <div className="flex flex-col h-full bg-surface-950 rounded-xl border border-surface-800 overflow-hidden shadow-xl">
      {/* Console Toolbar Header */}
      <div className="flex items-center justify-between px-3 py-2 bg-surface-900 border-b border-surface-800 gap-2 flex-wrap">
        <div className="flex items-center gap-1.5">
          {[
            { id: 'terminal', label: 'Terminal', icon: Terminal },
            { id: 'tests', label: 'Test Runner', icon: FlaskConical },
            { id: 'preview', label: 'Web Preview', icon: Globe },
            { id: 'ai', label: 'Gemini AI', icon: Bot },
          ].map((tab) => {
            const Icon = tab.icon;
            const isSelected = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-semibold transition-colors ${
                  isSelected
                    ? 'bg-cyan-950 text-cyan-300 border border-cyan-800'
                    : 'text-gray-400 hover:text-gray-200 hover:bg-surface-800'
                }`}
              >
                <Icon size={13} />
                <span>{tab.label}</span>
              </button>
            );
          })}

          <span className="hidden xl:inline text-[11px] text-gray-400 border-l border-surface-700 pl-2.5 ml-1">
            <span className="text-cyan-300 font-mono">{isPro ? '10s / 256MB Pro' : '3s / 128MB Free'}</span>
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

      {/* Tab 1: Terminal Output */}
      {activeTab === 'terminal' && (
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
                    TypeScript, C++, Java, Go, Rust execution and extended 10s timeouts are reserved for SynapseCode Pro Tier subscribers.
                  </p>
                  <button
                    onClick={onOpenPricing}
                    className="px-4 py-2 bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white font-bold text-xs rounded-lg transition-all shadow-md shadow-cyan-950/50 cursor-pointer"
                  >
                    Upgrade with Chapa ($15/mo)
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
      )}

      {/* Tab 2: Automated Test-Case Runner */}
      {activeTab === 'tests' && (
        <div className="flex-1 overflow-y-auto p-4 bg-[#0c1017] space-y-3 text-xs">
          <div className="flex items-center gap-2">
            <input
              type="text"
              value={expectedStdout}
              onChange={(e) => setExpectedStdout(e.target.value)}
              placeholder="Expected exact STDOUT (optional, defaults to current output)"
              className="flex-1 bg-surface-900 text-gray-200 placeholder-gray-500 px-3 py-1.5 rounded-md border border-surface-700 outline-none focus:border-cyan-500 font-mono"
            />
            <button
              onClick={handleTriggerTests}
              disabled={isTesting}
              className="px-3 py-1.5 rounded-md bg-cyan-600 hover:bg-cyan-500 text-white font-bold flex items-center gap-1.5 cursor-pointer"
            >
              {isTesting ? <Loader2 size={13} className="animate-spin" /> : <FlaskConical size={13} />}
              <span>Run Assertions</span>
            </button>
          </div>

          <div className="space-y-2">
            {(testResults || []).map((tc) => (
              <div
                key={tc.id}
                className={`p-3 rounded-lg border flex items-start justify-between ${
                  tc.passed
                    ? 'bg-emerald-950/20 border-emerald-800/60 text-emerald-200'
                    : 'bg-red-950/20 border-red-800/60 text-red-200'
                }`}
              >
                <div className="space-y-1 font-mono">
                  <div className="font-bold flex items-center gap-1.5">
                    {tc.passed ? (
                      <CheckCircle2 size={14} className="text-emerald-400" />
                    ) : (
                      <XCircle size={14} className="text-red-400" />
                    )}
                    <span>{tc.name}</span>
                  </div>
                  <div className="text-[11px] opacity-80">Expected: {tc.expectedOutput || '(any)'}</div>
                  <div className="text-[11px] opacity-80">Actual: {tc.actualOutput || '(empty)'}</div>
                </div>
                <span className="text-[10px] font-bold uppercase px-2 py-0.5 rounded bg-black/40">
                  {tc.passed ? 'PASS' : 'FAIL'}
                </span>
              </div>
            ))}
            {(!testResults || testResults.length === 0) && (
              <div className="text-gray-500 text-center py-6">
                Enter an expected output and click Run Assertions to verify candidate code.
              </div>
            )}
          </div>
        </div>
      )}

      {/* Tab 3: Live Web Preview Iframe */}
      {activeTab === 'preview' && (
        <div className="flex-1 bg-surface-950 min-h-0">
          <iframe
            title="SynapseCode Live Preview"
            sandbox="allow-scripts"
            srcDoc={buildPreviewHtml()}
            className="w-full h-full border-0 bg-[#0f172a]"
          />
        </div>
      )}

      {/* Tab 4: Gemini AI Assistant */}
      {activeTab === 'ai' && (
        <div className="flex-1 overflow-y-auto p-4 bg-[#0c1017] space-y-3 text-xs">
          <div className="flex flex-wrap gap-2">
            {[
              { id: 'explain', label: 'Explain Code' },
              { id: 'fix', label: 'Fix Bug' },
              { id: 'refactor', label: 'Refactor' },
              { id: 'tests', label: 'Generate Tests' },
            ].map((item) => (
              <button
                key={item.id}
                disabled={aiLoading}
                onClick={() => handleAskAi(item.id)}
                className={`px-3 py-1.5 rounded-md font-bold border transition-colors cursor-pointer ${
                  aiAction === item.id && aiResponse
                    ? 'bg-cyan-950 border-cyan-600 text-cyan-300'
                    : 'bg-surface-900 border-surface-700 text-gray-200 hover:bg-surface-800'
                }`}
              >
                {item.label}
              </button>
            ))}
          </div>

          {aiLoading && (
            <div className="flex items-center gap-2 text-cyan-400 py-3">
              <Loader2 size={15} className="animate-spin" />
              <span>Analyzing {language} code with Gemini AI...</span>
            </div>
          )}

          {!aiLoading && aiResponse && (
            <pre className="whitespace-pre-wrap font-sans text-gray-200 bg-surface-900 p-3.5 rounded-lg border border-surface-800 leading-relaxed">
              {aiResponse}
            </pre>
          )}

          {!aiLoading && !aiResponse && (
            <div className="text-gray-500 py-4">
              Choose an AI action above to analyze, debug, refactor, or generate tests for your active code.
            </div>
          )}
        </div>
      )}
    </div>
  );
}
