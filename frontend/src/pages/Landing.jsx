import React from 'react';
import { ShieldCheck, Vote, Zap, ChevronRight, Lock, Smartphone } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export default function Landing({ connectWallet, account }) {
  const navigate = useNavigate();

  const handleLaunchApp = async () => {
    if (!account) {
      await connectWallet();
    }
    navigate('/app');
  };

  return (
    <div className="flex flex-col min-h-[calc(100vh-80px)]">
      {/* Hero Section */}
      <main className="flex-grow flex flex-col items-center justify-center text-center px-4 pt-16 pb-24">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full glass-card text-sm text-indigo-300 mb-8 blur-0 hover:bg-white/5 transition-all cursor-pointer">
          <span className="w-2 h-2 rounded-full bg-green-400 animate-pulse"></span>
          Sepolia Testnet Live
        </div>
        
        <h1 className="text-5xl md:text-7xl font-bold mb-6 tracking-tight max-w-4xl">
          The Future of <span className="hero-gradient font-extrabold">Secure Voting</span> is Decentralized
        </h1>
        
        <p className="text-gray-400 text-lg md:text-xl max-w-2xl mb-12 font-sans">
          A tamper-proof, transparent, and universally verifiable election system built on Ethereum. Empowering voices with cryptographic certainty.
        </p>

        <div className="flex flex-col sm:flex-row gap-4 items-center">
          <button 
            onClick={handleLaunchApp}
            className="group relative px-8 py-4 bg-indigo-600 hover:bg-indigo-500 rounded-2xl font-semibold text-lg transition-all shadow-[0_0_40px_-10px_rgba(79,70,229,0.5)] hover:shadow-[0_0_60px_-15px_rgba(79,70,229,0.7)] flex items-center gap-2 overflow-hidden"
          >
            <div className="absolute inset-0 bg-white/20 translate-y-full group-hover:translate-y-0 transition-transform duration-300 ease-in-out"></div>
            <span className="relative">{account ? 'Enter Dashboard' : 'Connect Wallet to Start'}</span>
            <ChevronRight className="w-5 h-5 relative group-hover:translate-x-1 transition-transform" />
          </button>
        </div>
      </main>

      {/* Features Grid */}
      <section className="max-w-6xl mx-auto px-6 pb-24 w-full">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="glass-panel p-8 rounded-3xl hover:-translate-y-2 transition-transform duration-300 group">
            <div className="w-14 h-14 rounded-2xl bg-indigo-500/10 flex items-center justify-center mb-6 group-hover:bg-indigo-500/20 transition-colors">
              <Lock className="w-7 h-7 text-indigo-400" />
            </div>
            <h3 className="text-xl font-bold mb-3">Cryptographic Security</h3>
            <p className="text-gray-400 text-sm font-sans leading-relaxed">
              Every vote is cryptographically signed and stored immutably on the Ethereum blockchain, guaranteeing zero tampering.
            </p>
          </div>

          <div className="glass-panel p-8 rounded-3xl hover:-translate-y-2 transition-transform duration-300 group">
            <div className="w-14 h-14 rounded-2xl bg-purple-500/10 flex items-center justify-center mb-6 group-hover:bg-purple-500/20 transition-colors">
              <Smartphone className="w-7 h-7 text-purple-400" />
            </div>
            <h3 className="text-xl font-bold mb-3">Phone OTP Verification</h3>
            <p className="text-gray-400 text-sm font-sans leading-relaxed">
              Multi-factor authentication with SMS OTP and wallet signatures ensures one vote per verified phone number, preventing duplicates.
            </p>
          </div>

          <div className="glass-panel p-8 rounded-3xl hover:-translate-y-2 transition-transform duration-300 group">
            <div className="w-14 h-14 rounded-2xl bg-pink-500/10 flex items-center justify-center mb-6 group-hover:bg-pink-500/20 transition-colors">
              <Zap className="w-7 h-7 text-pink-400" />
            </div>
            <h3 className="text-xl font-bold mb-3">Real-time Tally</h3>
            <p className="text-gray-400 text-sm font-sans leading-relaxed">
              Experience absolute transparency. Watch the decentralized ledger update in real-time as votes are securely cast.
            </p>
          </div>
        </div>
      </section>
    </div>
  );
}
