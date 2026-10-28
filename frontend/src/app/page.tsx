'use client';

import React, { useState, useEffect } from 'react';
import { Sparkles, Globe, Copy, Check, ShoppingBag, ArrowRight, RefreshCw, Layers, CreditCard, Zap, ShieldCheck, LogIn, LogOut, UserCheck } from 'lucide-react';
import { supabase } from '@/lib/supabaseClient';

interface LocalizedResult {
  localizedTitle: string;
  localizedDescription: string;
  culturalNotes: string;
}

export default function Dashboard() {
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    targetLanguage: 'Bengali',
    targetMarket: 'Bangladesh',
  });

  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<LocalizedResult | null>(null);
  const [copiedField, setCopiedField] = useState<string | null>(null);
  const [showPricing, setShowPricing] = useState(false);

  // start add new
  // User & Credit States
  const [userEmail, setUserEmail] = useState<string | null>(null);
  const [isPro, setIsPro] = useState<boolean>(false);
  const [creditsUsed, setCreditsUsed] = useState<number>(0);

  // Other Auth States
  const [authInputEmail, setAuthInputEmail] = useState('');
  const [authInputPassword, setAuthInputPassword] = useState('');
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [isSignUp, setIsSignUp] = useState(false);
  const [authLoading, setAuthLoading] = useState(false);

  // Load Lemon Squeezy Script
  useEffect(() => {
    const script = document.createElement('script');
    script.src = 'https://assets.lemonsqueezy.com/lemon.js';
    script.defer = true;
    document.body.appendChild(script);

    // Fetch initial user session
    checkUserSession();

    return () => {
      document.body.removeChild(script);
    };
  }, []);

  const checkUserSession = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (session?.user?.email) {
      setUserEmail(session.user.email);
      fetchUserProfile(session.user.email);
    }
  }

  const fetchUserProfile = async (email: string) => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('is_pro, credits_used')
        .eq('email', email)
        .single();

      if (data) {
        setIsPro(data.is_pro);
        setCreditsUsed(data.credits_used || 0);
      }
    } catch (err) {
      console.error('Error fetching profile:', err);
    }
  };

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthLoading(true);

    try {
      if (isSignUp) {
        const { data, error } = await supabase.auth.signUp({
          email: authInputEmail,
          password: authInputPassword,
        });
        if (error) throw error;
        alert('Registration successful! You are now logged in.');
      } else {
        const { data, error } = await supabase.auth.signInWithPassword({
          email: authInputEmail,
          password: authInputPassword,
        });
        if (error) throw error;
      }

      setUserEmail(authInputEmail);
      await fetchUserProfile(authInputEmail);
      setShowAuthModal(false);
      setAuthInputEmail('');
      setAuthInputPassword('');
    } catch (err: any) {
      alert('Authentication error: ' + err.message);
    } finally {
      setAuthLoading(false);
    }
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    setUserEmail(null);
    setIsPro(false);
    setCreditsUsed(0);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.title || !formData.description) return;

    // Prompt user to login if not authenticated
    if (!userEmail) {
      alert('Please Login or Sign Up to use the AI Localizer.');
      setShowAuthModal(true);
      return;
    }

    // Free credit limit check before request
if (!isPro && creditsUsed >= 3) {
  setShowPricing(true);
  return;
}

setLoading(true);
setResult(null);

try {
  // Render live backend URL ba fallback hishebe localhost use kora
  const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:5000';

  const response = await fetch(`${API_BASE_URL}/api/v1/localize`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      ...formData,
      userEmail: userEmail,
    }),
  });
  // end new add

      const resData = await response.json();

      if (resData.status === 'limit_exceeded') {
        alert('Free limit reached (3/3). Upgrade to Pro for unlimited access.');
        setShowPricing(true);
        return;
      }

      if (resData.status === 'success' && resData.data) {
        setResult({
          localizedTitle: resData.data.localizedTitle,
          localizedDescription: resData.data.localizedDescription,
          culturalNotes: resData.data.culturalNotes,
        });
        setIsPro(resData.isPro);
        if (!resData.isPro) {
          setCreditsUsed((prev) => prev + 1);
        }
      } else {
        alert('Localization failed: ' + (resData.message || 'Unknown error'));
      }
    } catch (err) {
      alert('Error connecting to backend server.');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const copyToClipboard = (text: string, field: string) => {
    if (!text) return;
    navigator.clipboard.writeText(text);
    setCopiedField(field);
    setTimeout(() => setCopiedField(null), 2000);
  };

  const handleCheckout = (checkoutUrl: string) => {
    if ((window as any).createLemonSqueezy) {
      (window as any).createLemonSqueezy();
    }
    window.location.href = checkoutUrl;
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 font-sans">
      {/* Header / Navbar */}
      <header className="border-b border-slate-800 bg-slate-900/50 backdrop-blur-md sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="p-2 bg-indigo-600 rounded-xl text-white shadow-lg shadow-indigo-500/30">
              <Globe className="w-6 h-6" />
            </div>
            <span className="font-bold text-xl tracking-tight bg-gradient-to-r from-white via-slate-200 to-indigo-400 bg-clip-text text-transparent">
              GlobalCraft AI
            </span>
          </div>

          <div className="flex items-center space-x-4">
            {/* User Profile / Status */}
            {userEmail ? (
              <div className="flex items-center gap-3 bg-slate-950/60 border border-slate-800 px-3 py-1.5 rounded-xl text-xs">
                <span className="text-slate-300 font-medium flex items-center gap-1.5">
                  <UserCheck className="w-3.5 h-3.5 text-indigo-400" />
                  {userEmail}
                </span>

                {isPro ? (
                  <span className="bg-amber-500/10 text-amber-400 border border-amber-500/20 px-2 py-0.5 rounded-full font-bold flex items-center gap-1">
                    <Zap className="w-3 h-3 fill-amber-400" /> Pro Unlimited
                  </span>
                ) : (
                  <span className="bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 px-2 py-0.5 rounded-full font-semibold">
                    Free Credits: {Math.max(0, 3 - creditsUsed)}/3
                  </span>
                )}

                <button
                  onClick={handleLogout}
                  title="Logout"
                  className="text-slate-400 hover:text-red-400 ml-1 transition"
                >
                  <LogOut className="w-3.5 h-3.5" />
                </button>
              </div>
            ) : (
              <button
                onClick={() => setShowAuthModal(true)}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-indigo-600/10 text-indigo-400 hover:bg-indigo-600/20 border border-indigo-500/30 transition text-xs font-semibold"
              >
                <LogIn className="w-3.5 h-3.5" /> Login / Sign Up
              </button>
            )}

            <button
              onClick={() => setShowPricing(!showPricing)}
              className="flex items-center gap-2 px-4 py-2 rounded-xl bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-500 hover:to-violet-500 text-white transition text-xs font-semibold shadow-lg shadow-indigo-600/20"
            >
              <CreditCard className="w-4 h-4" />
              Upgrade / Pricing
            </button>
          </div>
        </div>
      </header>

      {/* Auth Modal */}
      {showAuthModal && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 md:p-8 max-w-md w-full relative shadow-2xl">
            <button
              onClick={() => setShowAuthModal(false)}
              className="absolute top-4 right-4 text-slate-400 hover:text-white"
            >
              ✕
            </button>
            <div className="text-center mb-6">
              <h2 className="text-2xl font-bold text-white">
                {isSignUp ? 'Create SaaS Account' : 'Welcome Back'}
              </h2>
              <p className="text-slate-400 text-xs mt-1">
                {isSignUp ? 'Sign up to get 3 Free AI Localizations.' : 'Login to access your Dashboard.'}
              </p>
            </div>

            <form onSubmit={handleAuth} className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">Email Address</label>
                <input
                  type="email"
                  required
                  placeholder="yourname@example.com"
                  value={authInputEmail}
                  onChange={(e) => setAuthInputEmail(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">Password</label>
                <input
                  type="password"
                  required
                  placeholder="••••••••"
                  value={authInputPassword}
                  onChange={(e) => setAuthInputPassword(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-indigo-500"
                />
              </div>

              <button
                type="submit"
                disabled={authLoading}
                className="w-full py-3 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-medium transition shadow-lg shadow-indigo-600/30 flex items-center justify-center gap-2"
              >
                {authLoading ? <RefreshCw className="w-4 h-4 animate-spin" /> : (isSignUp ? 'Sign Up' : 'Login')}
              </button>
            </form>

            <div className="mt-4 text-center">
              <button
                onClick={() => setIsSignUp(!isSignUp)}
                className="text-xs text-indigo-400 hover:underline"
              >
                {isSignUp ? 'Already have an account? Login' : "Don't have an account? Sign Up"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Pricing Modal */}
      {showPricing && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 md:p-8 max-w-2xl w-full relative shadow-2xl">
            <button
              onClick={() => setShowPricing(false)}
              className="absolute top-4 right-4 text-slate-400 hover:text-white"
            >
              ✕
            </button>
            <div className="text-center mb-8">
              <span className="text-xs font-semibold px-3 py-1 rounded-full bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
                Unlock Unlimited Access
              </span>
              <h2 className="text-2xl md:text-3xl font-bold text-white mt-3">Choose Your SaaS Plan</h2>
              <p className="text-slate-400 text-xs md:text-sm mt-1">Scale your e-commerce store with high-converting localized copy.</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Starter Plan */}
              <div className="bg-slate-950 border border-slate-800 rounded-xl p-5 flex flex-col justify-between">
                <div>
                  <h3 className="text-lg font-bold text-white mb-1">Starter Tier</h3>
                  <p className="text-slate-400 text-xs mb-4">For testing global markets with limited products.</p>
                  <div className="text-2xl font-extrabold text-white mb-4">$0 <span className="text-xs font-normal text-slate-400">/ forever</span></div>
                  <ul className="space-y-2 text-xs text-slate-300 mb-6">
                    <li className="flex items-center gap-2"><Check className="w-4 h-4 text-emerald-400" /> 3 Free AI Localizations</li>
                    <li className="flex items-center gap-2"><Check className="w-4 h-4 text-emerald-400" /> Standard Claude AI Engine</li>
                    <li className="flex items-center gap-2"><Check className="w-4 h-4 text-emerald-400" /> Supabase Storage Sync</li>
                  </ul>
                </div>
                <button
                  onClick={() => setShowPricing(false)}
                  className="w-full py-2.5 bg-slate-800 hover:bg-slate-700 text-white rounded-xl text-xs font-medium transition"
                >
                  Current Active Plan
                </button>
              </div>

              {/* Pro Unlimited Plan */}
              <div className="bg-gradient-to-b from-indigo-950/40 to-slate-950 border border-indigo-500/50 rounded-xl p-5 flex flex-col justify-between relative overflow-hidden">
                <div className="absolute top-3 right-3 bg-indigo-600 text-white text-[10px] font-bold uppercase px-2 py-0.5 rounded-full">
                  Popular
                </div>
                <div>
                  <h3 className="text-lg font-bold text-white mb-1 flex items-center gap-2">
                    <Zap className="w-4 h-4 text-amber-400 fill-amber-400" /> Pro Unlimited
                  </h3>
                  <p className="text-slate-400 text-xs mb-4">For growing brands scaling sales internationally.</p>
                  <div className="text-2xl font-extrabold text-white mb-4">$29 <span className="text-xs font-normal text-slate-400">/ month</span></div>
                  <ul className="space-y-2 text-xs text-slate-300 mb-6">
                    <li className="flex items-center gap-2"><Check className="w-4 h-4 text-emerald-400" /> Unlimited AI Localizations</li>
                    <li className="flex items-center gap-2"><Check className="w-4 h-4 text-emerald-400" /> High-Priority Claude 3.5 Sonnet</li>
                    <li className="flex items-center gap-2"><Check className="w-4 h-4 text-emerald-400" /> Full Cultural Market Insights</li>
                    <li className="flex items-center gap-2"><Check className="w-4 h-4 text-emerald-400" /> API Access & Shopify Export</li>
                  </ul>
                </div>
                <button
                  onClick={() => handleCheckout('https://salmankhan.lemonsqueezy.com/checkout/buy/14440eeb-8d46-40fb-9def-32640137988b')}
                  className="w-full py-2.5 bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-500 hover:to-violet-500 text-white rounded-xl text-xs font-medium transition shadow-lg shadow-indigo-600/30 flex items-center justify-center gap-2" 
                >
                  <ShieldCheck className="w-4 h-4" /> Subscribe via Lemon Squeezy
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-6 py-10">
        <div className="mb-10 text-center md:text-left">
          <h1 className="text-3xl md:text-4xl font-extrabold text-white mb-2">
            E-commerce AI Localizer
          </h1>
          <p className="text-slate-400 text-sm md:text-base">
            Instantly adapt product copy and cultural nuances for global e-commerce markets.
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          {/* Form Section */}
          <div className="lg:col-span-5 bg-slate-900/80 border border-slate-800 rounded-2xl p-6 shadow-xl">
            <h2 className="text-lg font-semibold text-white mb-6 flex items-center gap-2">
              <ShoppingBag className="w-5 h-5 text-indigo-400" />
              Original Product Details
            </h2>

            <form onSubmit={handleSubmit} className="space-y-5">
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-2">
                  Product Title *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Ergonomic Office Chair"
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-2">
                    Target Language *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Bengali, Spanish"
                    value={formData.targetLanguage}
                    onChange={(e) => setFormData({ ...formData, targetLanguage: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500 transition"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-2">
                    Target Market
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. Bangladesh, Spain"
                    value={formData.targetMarket}
                    onChange={(e) => setFormData({ ...formData, targetMarket: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500 transition"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-300 mb-2">
                  Product Description *
                </label>
                <textarea
                  rows={5}
                  required
                  placeholder="Enter feature list or original description..."
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500 transition resize-none"
                ></textarea>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full py-3.5 px-4 bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-500 hover:to-violet-500 text-white font-medium text-sm rounded-xl transition shadow-lg shadow-indigo-600/25 flex items-center justify-center gap-2 disabled:opacity-50"
              >
                {loading ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    Localizing with Claude AI...
                  </>
                ) : (
                  <>
                    <Sparkles className="w-4 h-4" />
                    Generate Localized Copy
                  </>
                )}
              </button>
            </form>
          </div>

          {/* Result Output Section */}
          <div className="lg:col-span-7 bg-slate-900/80 border border-slate-800 rounded-2xl p-6 shadow-xl flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between mb-6 border-b border-slate-800 pb-4">
                <h2 className="text-lg font-semibold text-white flex items-center gap-2">
                  <Layers className="w-5 h-5 text-emerald-400" />
                  Localized Result ({formData.targetLanguage})
                </h2>
                {result && (
                  <span className="text-xs bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 px-3 py-1 rounded-full">
                    Saved to Supabase
                  </span>
                )}
              </div>

              {!result && !loading && (
                <div className="h-64 flex flex-col items-center justify-center text-slate-500 border-2 border-dashed border-slate-800/80 rounded-xl">
                  <Sparkles className="w-10 h-10 mb-3 text-slate-600" />
                  <p className="text-sm">Enter details and click generate to see localized content.</p>
                </div>
              )}

              {loading && (
                <div className="h-64 flex flex-col items-center justify-center text-slate-400 space-y-4">
                  <RefreshCw className="w-8 h-8 animate-spin text-indigo-500" />
                  <p className="text-sm">Adapting content for local sales conversion...</p>
                </div>
              )}

              {result && (
                <div className="space-y-6">
                  {/* Localized Title */}
                  <div className="bg-slate-950 border border-slate-800/80 rounded-xl p-4 relative group">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-xs font-semibold text-indigo-400 uppercase tracking-wider">
                        Localized Title
                      </span>
                      <button
                        onClick={() => copyToClipboard(result.localizedTitle, 'title')}
                        className="text-slate-400 hover:text-white transition flex items-center gap-1 text-xs"
                      >
                        {copiedField === 'title' ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                        {copiedField === 'title' ? 'Copied' : 'Copy'}
                      </button>
                    </div>
                    <p className="text-base font-medium text-slate-100">{result.localizedTitle}</p>
                  </div>

                  {/* Localized Description */}
                  <div className="bg-slate-950 border border-slate-800/80 rounded-xl p-4 relative group">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-xs font-semibold text-emerald-400 uppercase tracking-wider">
                        High-Converting Description
                      </span>
                      <button
                        onClick={() => copyToClipboard(result.localizedDescription, 'desc')}
                        className="text-slate-400 hover:text-white transition flex items-center gap-1 text-xs"
                      >
                        {copiedField === 'desc' ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                        {copiedField === 'desc' ? 'Copied' : 'Copy'}
                      </button>
                    </div>
                    <p className="text-sm text-slate-300 leading-relaxed whitespace-pre-line">
                      {result.localizedDescription}
                    </p>
                  </div>

                  {/* Cultural Notes */}
                  <div className="bg-indigo-950/20 border border-indigo-900/30 rounded-xl p-4">
                    <span className="text-xs font-semibold text-amber-400 uppercase tracking-wider block mb-2">
                      Cultural Market Adaptation Notes
                    </span>
                    <p className="text-xs text-slate-400 leading-relaxed">
                      {result.culturalNotes}
                    </p>
                  </div>
                </div>
              )}
            </div>

            <div className="mt-8 pt-4 border-t border-slate-800/60 text-xs text-slate-500 flex justify-between items-center">
              <span>Powered by Claude AI & Supabase</span>
              <span className="flex items-center gap-1 text-indigo-400">
                Ready for Production <ArrowRight className="w-3 h-3" />
              </span>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
