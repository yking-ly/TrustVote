import React, { useState } from 'react';
import { Users, ShieldCheck, Mail, AlertCircle, RefreshCw, Lock } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export default function Dashboard({ 
  account, 
  contract, 
  candidates, 
  votingOpen, 
  isAdmin, 
  hasVoted, 
  fetchData,
  BACKEND_URL 
}) {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('vote'); // 'vote' or 'admin'
  const [selectedCandidate, setSelectedCandidate] = useState(null);
  
  // OTP State
  const [email, setEmail] = useState("");
  const [otp, setOtp] = useState("");
  const [otpSent, setOtpSent] = useState(false);
  const [otpVerified, setOtpVerified] = useState(false);
  
  // Admin State
  const [newCandidateName, setNewCandidateName] = useState("");
  
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  // Determine winner(s) if voting is closed and there are votes
  const maxVotes = candidates.length > 0 ? Math.max(...candidates.map(c => c.voteCount)) : 0;
  const winners = (!votingOpen && maxVotes > 0) ? candidates.filter(c => c.voteCount === maxVotes) : [];

  if (!account) {
    return (
      <div className="flex flex-col items-center justify-center py-32 text-center">
        <div className="w-20 h-20 bg-gray-800 rounded-full flex items-center justify-center mb-6">
          <ShieldCheck className="w-10 h-10 text-gray-500" />
        </div>
        <h2 className="text-2xl font-bold mb-4">Wallet Not Connected</h2>
        <p className="text-gray-400 mb-8 max-w-md font-sans">You need to connect your Web3 wallet to access the voting dashboard. Please return to the landing page and connect.</p>
        <button 
          onClick={() => navigate('/')}
          className="px-6 py-3 bg-indigo-600 rounded-xl font-medium hover:bg-indigo-500 transition-colors"
        >
          Go Back
        </button>
      </div>
    );
  }

  // --- Actions ---

  const sendOtp = async () => {
    setLoading(true); setError(""); setSuccess("");
    try {
      const res = await fetch(`${BACKEND_URL}/api/send-otp`, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email })
      });
      const data = await res.json();
      if (data.success) {
        setOtpSent(true); setSuccess("OTP Sent! Check your email.");
      } else setError(data.message || "Failed to send OTP.");
    } catch (err) { setError("Network error while sending OTP."); }
    setLoading(false);
  };

  const verifyOtp = async () => {
    setLoading(true); setError(""); setSuccess("");
    try {
      const res = await fetch(`${BACKEND_URL}/api/verify-otp`, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, otp })
      });
      const data = await res.json();
      if (data.success) {
        setOtpVerified(true); setSuccess("Verified! You can now cast your vote.");
      } else setError(data.message || "Invalid OTP.");
    } catch (err) { setError("Network error verifying OTP."); }
    setLoading(false);
  };

  const castVote = async () => {
    if (!selectedCandidate) return setError("Please select a candidate.");
    setLoading(true); setError(""); setSuccess("");
    try {
      const tx = await contract.castVote(selectedCandidate);
      setSuccess("Transaction sent! Waiting for confirmation...");
      await tx.wait();
      setSuccess("Vote cast successfully!");
      await fetchData(contract, account);
    } catch (err) {
      console.error(err); setError("Failed to cast vote. See console.");
    }
    setLoading(false);
  };

  const toggleVoting = async () => {
    if (!votingOpen && candidates.length < 2) {
      return setError("You must register at least 2 candidates before starting the election.");
    }
    setLoading(true); setError(""); setSuccess("");
    try {
      const tx = await contract.setVotingStatus(!votingOpen);
      setSuccess("Waiting for confirmation...");
      await tx.wait();
      setSuccess(`Voting has been ${!votingOpen ? 'Opened' : 'Closed'}.`);
      await fetchData(contract, account);
    } catch (err) { console.error(err); setError("Failed to toggle status."); }
    setLoading(false);
  };

  const resetElection = async () => {
    if (votingOpen) return setError("Please halt voting before resetting the election.");
    setLoading(true); setError(""); setSuccess("");
    try {
      const tx = await contract.resetElection();
      setSuccess("Resetting election... please wait.");
      await tx.wait();
      setSuccess("Election reset successfully! A new voting list has been started.");
      await fetchData(contract, account);
    } catch (err) { console.error(err); setError("Failed to reset election. Ensure voting is closed."); }
    setLoading(false);
  };

  const addCandidate = async () => {
    if (!newCandidateName) return;
    setLoading(true); setError(""); setSuccess("");
    try {
      const tx = await contract.addCandidate(newCandidateName);
      setSuccess("Adding candidate... please wait.");
      await tx.wait();
      setSuccess("Candidate added via blockchain!");
      setNewCandidateName("");
      await fetchData(contract, account);
    } catch (err) { console.error(err); setError("Failed to add candidate."); }
    setLoading(false);
  };

  // --- Views ---

  return (
    <div className="max-w-6xl mx-auto px-4 pb-24 fade-in">
      
      <div className="flex flex-col md:flex-row justify-between items-end mb-8 border-b border-white/10 pb-6 gap-6">
        <div>
          <h1 className="text-3xl font-bold mb-2">Voting Portal</h1>
          <p className="text-gray-400 font-sans text-sm">Welcome back. {isAdmin ? 'You have administrator privileges on this contract.' : 'Participate in the active election.'}</p>
        </div>
        
        {isAdmin && (
          <div className="flex bg-gray-800/50 p-1 rounded-xl glass-panel">
            <button 
              onClick={() => setActiveTab('vote')}
              className={`px-6 py-2 rounded-lg text-sm font-medium transition-all ${activeTab === 'vote' ? 'bg-indigo-600 text-white shadow-lg' : 'text-gray-400 hover:text-white'}`}
            >
              Voter View
            </button>
            <button 
              onClick={() => setActiveTab('admin')}
              className={`px-6 py-2 rounded-lg text-sm font-medium transition-all ${activeTab === 'admin' ? 'bg-purple-600 text-white shadow-lg' : 'text-gray-400 hover:text-white'}`}
            >
              Admin Console
            </button>
          </div>
        )}
      </div>

      {error && (
        <div className="bg-red-500/10 border border-red-500/30 text-red-400 p-4 rounded-xl mb-8 flex items-center gap-3 backdrop-blur-md animate-in fade-in slide-in-from-top-4">
          <AlertCircle className="w-5 h-5 flex-shrink-0" />
          <p className="font-sans text-sm">{error}</p>
        </div>
      )}
      
      {success && (
        <div className="bg-green-500/10 border border-green-500/30 text-green-400 p-4 rounded-xl mb-8 flex items-center gap-3 backdrop-blur-md animate-in fade-in slide-in-from-top-4">
          <ShieldCheck className="w-5 h-5 flex-shrink-0" />
          <p className="font-sans text-sm">{success}</p>
        </div>
      )}

      {/* Winner Announcement Block */}
      {winners.length > 0 && (
        <div className="bg-gradient-to-r from-yellow-500/20 via-orange-500/20 to-red-500/20 border border-yellow-500/50 p-6 rounded-3xl mb-8 backdrop-blur-md animate-in fade-in zoom-in shadow-[0_0_40px_-10px_rgba(234,179,8,0.3)]">
          <div className="flex flex-col items-center justify-center text-center">
            <div className="text-4xl mb-4">🏆</div>
            <h2 className="text-2xl font-bold text-yellow-400 mb-2">
              {winners.length === 1 ? 'Election Winner Announced!' : 'Election Tied!'}
            </h2>
            <div className="flex flex-wrap justify-center gap-4 mt-4">
              {winners.map(w => (
                <div key={w.id} className="bg-black/40 px-6 py-3 rounded-xl border border-yellow-500/30">
                  <span className="font-bold text-xl text-white">{w.name}</span>
                  <span className="ml-3 px-2 py-0.5 bg-yellow-500/20 rounded text-yellow-300 text-sm font-mono">{w.voteCount} Votes</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {activeTab === 'vote' ? (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          
          <div className="lg:col-span-7 space-y-6">
            <div className="glass-panel p-8 rounded-3xl relative overflow-hidden">
              <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-indigo-500 to-purple-500"></div>
              <div className="flex justify-between items-center mb-8">
                <h2 className="text-2xl font-bold flex items-center gap-3">
                  <Users className="w-6 h-6 text-indigo-400" />
                  Candidates
                </h2>
                <div className="flex items-center gap-4">
                  <button onClick={() => fetchData(contract, account)} className="text-gray-400 hover:text-white transition-colors" title="Refresh">
                    <RefreshCw className="w-5 h-5" />
                  </button>
                  <div className={`px-4 py-1.5 rounded-full text-xs font-bold uppercase tracking-wider backdrop-blur-md shadow-inner ${votingOpen ? 'bg-green-500/10 text-green-400 border border-green-500/20' : 'bg-red-500/10 text-red-400 border border-red-500/20'}`}>
                    {votingOpen ? '● LIVE' : 'CLOSED'}
                  </div>
                </div>
              </div>

              {candidates.length === 0 ? (
                <div className="py-12 text-center border border-dashed border-gray-700 rounded-2xl bg-gray-800/20">
                  <p className="text-gray-500 font-sans">No candidates registered yet.</p>
                </div>
              ) : (
                <div className="grid gap-4">
                  {candidates.map(c => (
                    <div 
                      key={c.id}
                      onClick={() => !hasVoted && votingOpen && setSelectedCandidate(c.id)}
                      className={`p-5 rounded-2xl transition-all duration-300 relative overflow-hidden ${
                        selectedCandidate === c.id 
                        ? 'border-indigo-500 bg-indigo-500/10 shadow-[0_0_30px_-10px_rgba(79,70,229,0.3)] border' 
                        : 'border border-white/5 bg-white/5 hover:bg-white/10 cursor-pointer'
                      } ${hasVoted || !votingOpen ? 'opacity-50 cursor-not-allowed grayscale' : ''}`}
                    >
                      {selectedCandidate === c.id && (
                        <div className="absolute left-0 top-0 bottom-0 w-1 bg-indigo-500 shadow-[0_0_10px_rgba(79,70,229,0.8)]"></div>
                      )}
                      <div className="flex justify-between items-center pl-2">
                        <div>
                          <p className="font-bold text-xl mb-1">{c.name}</p>
                          <p className="text-xs text-gray-400 font-sans font-medium tracking-wider">CANDIDATE #{c.id}</p>
                        </div>
                        <div className="text-right bg-black/40 px-4 py-2 rounded-xl border border-white/5">
                          <span className="block text-2xl font-black text-white">{c.voteCount}</span>
                          <span className="text-[10px] text-gray-500 uppercase tracking-widest font-bold">Votes</span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          <div className="lg:col-span-5">
            <div className="glass-panel p-8 rounded-3xl sticky top-24 border border-white/10">
              <h2 className="text-xl font-bold mb-6 pb-4 border-b border-white/5">Digital Ballot</h2>
              
              {!votingOpen ? (
                <div className="py-12 text-center flex flex-col items-center">
                  <div className="w-16 h-16 rounded-full bg-red-500/10 flex items-center justify-center mb-4">
                    <Lock className="w-8 h-8 text-red-500" />
                  </div>
                  <h3 className="text-xl font-bold text-red-400 mb-2">Voting is Closed</h3>
                  <p className="text-gray-400 font-sans text-sm">The administrator has paused or ended the election.</p>
                </div>
              ) : isAdmin ? (
                <div className="py-12 text-center flex flex-col items-center">
                  <div className="w-16 h-16 rounded-full bg-purple-500/10 flex items-center justify-center mb-4">
                    <ShieldCheck className="w-8 h-8 text-purple-500" />
                  </div>
                  <h3 className="text-xl font-bold text-purple-400 mb-2">Admin Account</h3>
                  <p className="text-gray-400 font-sans text-sm">Administrators cannot participate in the vote.</p>
                </div>
              ) : hasVoted ? (
                <div className="py-12 text-center flex flex-col items-center animate-in zoom-in">
                  <div className="w-20 h-20 bg-green-500/10 rounded-full flex items-center justify-center mb-6 shadow-[0_0_30px_-5px_rgba(34,197,94,0.3)] border border-green-500/30">
                    <ShieldCheck className="w-10 h-10 text-green-400" />
                  </div>
                  <h3 className="text-2xl font-bold text-green-400 mb-2">Vote Recorded</h3>
                  <p className="text-gray-400 font-sans text-sm">Your vote was successfully inscribed on the blockchain.</p>
                </div>
              ) : (
                <div className="space-y-6">
                  {!otpVerified ? (
                    <div className="space-y-5 animate-in fade-in">
                      <div>
                        <label className="block text-sm font-semibold text-gray-300 mb-3 tracking-wide">1. Identity Verification</label>
                        <div className="relative">
                          <Mail className="absolute left-4 top-3.5 w-5 h-5 text-gray-500" />
                          <input 
                            type="email" 
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            disabled={otpSent}
                            placeholder="Enter your registered email"
                            className="w-full bg-black/40 border border-white/10 rounded-xl pl-12 pr-4 py-3.5 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-all shadow-inner disabled:opacity-50 font-sans"
                          />
                        </div>
                      </div>
                      
                      {!otpSent ? (
                        <button 
                          onClick={sendOtp}
                          disabled={loading || !email}
                          className="w-full py-3.5 bg-white/5 hover:bg-white/10 border border-white/10 hover:border-indigo-500/50 rounded-xl font-semibold transition-all disabled:opacity-50 flex justify-center items-center gap-2 group"
                        >
                          {loading ? <RefreshCw className="w-5 h-5 animate-spin" /> : 'Request Authenticator Code'}
                        </button>
                      ) : (
                        <div className="space-y-4 pt-5 pb-2 animate-in slide-in-from-top-2">
                          <p className="text-xs text-indigo-400 font-medium tracking-wide">Enter the 6-digit code sent to your email.</p>
                          <input 
                            type="text" 
                            value={otp}
                            onChange={(e) => setOtp(e.target.value)}
                            placeholder="• • • • • •"
                            className="w-full bg-black/40 border border-white/10 rounded-xl text-center tracking-[1em] text-2xl px-4 py-4 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-all font-mono"
                            maxLength={6}
                          />
                          <button 
                            onClick={verifyOtp}
                            disabled={loading || otp.length !== 6}
                            className="w-full py-4 bg-indigo-600 hover:bg-indigo-500 rounded-xl font-bold text-lg transition-all shadow-[0_0_20px_-5px_rgba(79,70,229,0.4)] disabled:opacity-50"
                          >
                            Verify Identity
                          </button>
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="space-y-6 animate-in zoom-in-95">
                      <div className="bg-green-500/10 border border-green-500/30 rounded-xl p-4 flex items-start gap-3">
                        <ShieldCheck className="w-5 h-5 text-green-400 mt-0.5" />
                        <div>
                          <p className="text-green-400 font-bold mb-1">Identity Verified</p>
                          <p className="text-green-500/70 text-xs font-sans">Your cryptographic signature is ready to be applied.</p>
                        </div>
                      </div>
                      
                      <div className="pt-2">
                        <label className="block text-sm font-semibold text-gray-300 mb-4 tracking-wide">2. Commit Vote</label>
                        <button 
                          onClick={castVote}
                          disabled={loading || !selectedCandidate}
                          className="relative w-full overflow-hidden group py-4 rounded-xl font-bold text-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed bg-white/5 border border-white/10"
                        >
                          <div className={`absolute inset-0 transition-opacity duration-300 ${selectedCandidate ? 'opacity-100' : 'opacity-0'} bg-gradient-to-r from-indigo-600 to-purple-600`}></div>
                          <span className="relative z-10 block font-sans">
                            {selectedCandidate ? 'Sign & Cast Ballot' : 'Waiting for Selection...'}
                          </span>
                        </button>
                        {!selectedCandidate && <p className="text-center text-xs text-gray-500 mt-4 font-sans">Please select a candidate from the list to proceed.</p>}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
          
        </div>
      ) : (
        <div className="max-w-3xl mx-auto space-y-6 animate-in slide-in-from-right-8">
          <div className="glass-panel p-8 rounded-3xl relative overflow-hidden border border-purple-500/20">
            <div className="absolute top-0 right-0 w-64 h-64 bg-purple-500/10 blur-3xl rounded-full translate-x-1/2 -translate-y-1/2"></div>
            
            <h2 className="text-2xl font-bold mb-8 flex items-center gap-3">
              <ShieldCheck className="w-6 h-6 text-purple-400" />
              Contract Administration
            </h2>
            
            <div className="space-y-8 relative z-10">
              <div className="bg-black/30 p-6 rounded-2xl border border-white/5">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div>
                    <h3 className="text-lg font-bold mb-1">Election Status</h3>
                    <p className="text-sm text-gray-400 font-sans">Control whether the contract accepts new votes.</p>
                  </div>
                  <button 
                    onClick={toggleVoting}
                    disabled={loading || (!votingOpen && candidates.length < 2)}
                    className={`px-8 py-3 rounded-xl font-bold transition-all shadow-lg flex items-center gap-2 ${
                      votingOpen 
                        ? 'bg-red-500/20 text-red-400 hover:bg-red-500/30 border border-red-500/50 hover:shadow-red-500/20' 
                        : 'bg-green-500/20 text-green-400 hover:bg-green-500/30 border border-green-500/50 hover:shadow-green-500/20 disabled:opacity-50 disabled:cursor-not-allowed'
                    }`}
                  >
                    {loading && <RefreshCw className="w-4 h-4 animate-spin" />}
                    {votingOpen ? 'Halt Voting' : 'Start Voting'}
                  </button>
                </div>
              </div>
              
              <div className="bg-black/30 p-6 rounded-2xl border border-white/5">
                <h3 className="text-lg font-bold mb-1">Register Candidate</h3>
                <p className="text-sm text-gray-400 font-sans mb-5">Append a new candidate entity directly to the blockchain ledger. This action incurs gas fees.</p>
                
                <div className="flex flex-col sm:flex-row gap-3">
                  <input 
                    type="text" 
                    value={newCandidateName}
                    onChange={e => setNewCandidateName(e.target.value)}
                    placeholder="Candidate Official Name"
                    className="flex-1 bg-black/50 border border-white/10 rounded-xl px-5 py-3.5 focus:outline-none focus:border-purple-500 focus:ring-1 focus:ring-purple-500 transition-all font-sans"
                  />
                  <button 
                    onClick={addCandidate}
                    disabled={loading || !newCandidateName}
                    className="px-8 py-3.5 bg-purple-600 hover:bg-purple-500 rounded-xl font-bold transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-[0_0_20px_-5px_rgba(168,85,247,0.4)] whitespace-nowrap"
                  >
                    Deploy Entity
                  </button>
                </div>
              </div>

              <div className="bg-red-500/10 p-6 rounded-2xl border border-red-500/20">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div>
                    <h3 className="text-lg font-bold mb-1 text-red-500">Danger Zone</h3>
                    <p className="text-sm text-gray-400 font-sans">Erase all candidates and votes to start a completely new election instance.</p>
                  </div>
                  <button 
                    onClick={resetElection}
                    disabled={loading || votingOpen}
                    className="px-8 py-3 rounded-xl font-bold transition-all shadow-lg flex items-center gap-2 bg-red-600/80 text-white hover:bg-red-500 border border-red-500/50 disabled:opacity-50 disabled:cursor-not-allowed whitespace-nowrap"
                  >
                    Reset Election
                  </button>
                </div>
              </div>

              <div className="pt-6 border-t border-white/5">
                <div className="flex justify-between items-center text-xs text-gray-500 font-mono tracking-wider">
                  <span>NETWORK: SEPOLIA TESTNET</span>
                  <span>ADMIN BOUND: {account.substring(0, 6)}...{account.substring(account.length - 4)}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
      
    </div>
  );
}
