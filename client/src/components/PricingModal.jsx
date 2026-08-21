import React, { useState } from 'react';
import { Zap, Check, X, Shield, Cpu, Users, Clock, CreditCard, Sparkles } from 'lucide-react';
import { api } from '../utils/api';

export default function PricingModal({ isOpen, onClose, user, onPaymentSuccess }) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  if (!isOpen) return null;

  const handleChapaCheckout = async () => {
    if (!user) {
      setError('Please log in or register before upgrading to Pro.');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const data = await api.initializePayment();
      if (data.checkout_url) {
        // Redirect user to Chapa secure checkout page
        window.location.href = data.checkout_url;
      } else {
        throw new Error('No checkout URL returned from payment gateway.');
      }
    } catch (err) {
      setError(err.message || 'Payment initialization failed. Please try again.');
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4 overflow-y-auto">
      <div className="relative w-full max-w-4xl bg-surface-900 border border-surface-700 rounded-2xl shadow-2xl overflow-hidden my-8">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-surface-800 bg-surface-950/60">
          <div className="flex items-center gap-2">
            <Zap className="text-cyan-400" size={24} />
            <h2 className="text-xl font-bold text-white tracking-tight">SynapseCode SaaS Subscription</h2>
          </div>
          <button
            onClick={onClose}
            className="p-1 text-gray-400 hover:text-white rounded-lg hover:bg-surface-800 transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        {/* Pricing Cards */}
        <div className="p-6 md:p-8">
          <div className="text-center mb-8">
            <h3 className="text-2xl md:text-3xl font-extrabold text-white">Choose the Plan That Fits Your Workflow</h3>
            <p className="text-gray-400 text-sm mt-2 max-w-xl mx-auto">
              Supercharge your collaborative coding experience with high-performance sandboxes and seamless localized African payment gateway via <span className="text-cyan-400 font-semibold">Chapa</span>.
            </p>
          </div>

          {error && (
            <div className="mb-6 p-3 bg-red-950/60 border border-red-800 text-red-300 text-sm rounded-lg text-center font-medium">
              {error}
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Free Tier */}
            <div className="bg-surface-950/80 border border-surface-800 rounded-xl p-6 flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between mb-4">
                  <h4 className="text-lg font-bold text-gray-300">Free Tier</h4>
                  <span className="px-2.5 py-1 text-xs font-semibold text-gray-400 bg-surface-800 rounded-full">
                    Starter
                  </span>
                </div>
                <div className="flex items-baseline gap-1 mb-6">
                  <span className="text-3xl font-extrabold text-white">$0</span>
                  <span className="text-gray-400 text-sm">/ forever</span>
                </div>

                <ul className="space-y-3.5 mb-6 text-sm text-gray-300">
                  <li className="flex items-center gap-2.5">
                    <Check size={16} className="text-emerald-400 flex-shrink-0" />
                    <span>Up to <strong>2 active collaborators</strong> per room</span>
                  </li>
                  <li className="flex items-center gap-2.5">
                    <Check size={16} className="text-emerald-400 flex-shrink-0" />
                    <span><strong>3-second</strong> execution timeout cap</span>
                  </li>
                  <li className="flex items-center gap-2.5">
                    <Check size={16} className="text-emerald-400 flex-shrink-0" />
                    <span>Python & JavaScript runtime support</span>
                  </li>
                  <li className="flex items-center gap-2.5 opacity-50">
                    <X size={16} className="text-gray-500 flex-shrink-0" />
                    <span className="line-through">C++ container runtime</span>
                  </li>
                  <li className="flex items-center gap-2.5 opacity-50">
                    <X size={16} className="text-gray-500 flex-shrink-0" />
                    <span className="line-through">Priority container queue</span>
                  </li>
                </ul>
              </div>

              <button
                disabled
                className="w-full py-2.5 px-4 rounded-lg bg-surface-800 text-gray-400 font-medium text-sm cursor-default text-center"
              >
                Current Default Plan
              </button>
            </div>

            {/* Pro / Premium Tier */}
            <div className="relative bg-gradient-to-b from-cyan-950/40 via-surface-900 to-surface-950 border-2 border-cyan-500/60 rounded-xl p-6 flex flex-col justify-between shadow-xl shadow-cyan-950/30">
              <div className="absolute -top-3 right-6 px-3 py-1 bg-cyan-500 text-surface-950 font-bold text-xs uppercase tracking-wider rounded-full shadow-lg flex items-center gap-1">
                <Sparkles size={12} />
                Recommended
              </div>

              <div>
                <div className="flex items-center justify-between mb-4">
                  <h4 className="text-lg font-bold text-cyan-300 flex items-center gap-2">
                    Pro Tier
                  </h4>
                  <span className="px-2.5 py-1 text-xs font-semibold text-cyan-400 bg-cyan-950/80 border border-cyan-800 rounded-full">
                    Enterprise
                  </span>
                </div>
                <div className="flex items-baseline gap-1 mb-1">
                  <span className="text-3xl font-extrabold text-white">$15</span>
                  <span className="text-gray-400 text-sm">/ month (~750 ETB)</span>
                </div>
                <p className="text-xs text-cyan-400 mb-6">Instant activation via Telebirr, CBE, Visa & Mastercard</p>

                <ul className="space-y-3.5 mb-6 text-sm text-gray-200">
                  <li className="flex items-center gap-2.5">
                    <Check size={16} className="text-cyan-400 flex-shrink-0" />
                    <span><strong>Unlimited</strong> room collaborators</span>
                  </li>
                  <li className="flex items-center gap-2.5">
                    <Check size={16} className="text-cyan-400 flex-shrink-0" />
                    <span>Extended <strong>10-second</strong> execution timeout</span>
                  </li>
                  <li className="flex items-center gap-2.5">
                    <Check size={16} className="text-cyan-400 flex-shrink-0" />
                    <span>Multi-runtime: <strong>Python, Node.js & C++</strong></span>
                  </li>
                  <li className="flex items-center gap-2.5">
                    <Check size={16} className="text-cyan-400 flex-shrink-0" />
                    <span>Priority ephemeral container queue</span>
                  </li>
                  <li className="flex items-center gap-2.5">
                    <Check size={16} className="text-cyan-400 flex-shrink-0" />
                    <span>Advanced AI code refactoring & speedups</span>
                  </li>
                </ul>
              </div>

              <button
                onClick={handleChapaCheckout}
                disabled={loading}
                className="w-full flex items-center justify-center gap-2 py-3 px-4 rounded-lg bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white font-bold text-sm shadow-lg shadow-cyan-500/20 transition-all duration-200 disabled:opacity-50 cursor-pointer"
              >
                <CreditCard size={18} />
                {loading ? 'Connecting to Chapa...' : 'Upgrade with Chapa Gateway'}
              </button>
            </div>
          </div>

          <div className="mt-8 text-center text-xs text-gray-500 flex items-center justify-center gap-2">
            <Shield size={14} className="text-cyan-500" />
            <span>256-Bit Encrypted Payment Processing Powered by Chapa Pay Gateway</span>
          </div>
        </div>
      </div>
    </div>
  );
}
