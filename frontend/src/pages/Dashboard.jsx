import React, { useState } from 'react';
import { ethers } from 'ethers';
import { Users, ShieldCheck, Smartphone, AlertCircle, RefreshCw, Lock, SendHorizonal, KeyRound, CheckCircle2 } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export default function Dashboard({ 
  account, 
  contract, 
  candidates, 
  votingOpen, 
  isAdmin, 
  electionId,
  fetchData,
  BACKEND_URL 
}) {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('vote'); // 'vote' or 'admin'
  const [selectedCandidate, setSelectedCandidate] = useState(null);
  
  // Phone OTP State
  const [phoneNumber, setPhoneNumber] = useState('');
  const [otp, setOtp] = useState('');
  const [otpSent, setOtpSent] = useState(false);
  
  // Admin State
  const [newCandidateName, setNewCandidateName] = useState("");
  
  // UI State
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [localHasVoted, setLocalHasVoted] = useState(false);
  const [step, setStep] = useState(1); // 1: phone, 2: otp, 3: vote

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
    if (!phoneNumber) return setError("Please enter your phone number.");
    setLoading(true); setError(""); setSuccess("");
    try {
      const res = await fetch(`${BACKEND_URL}/api/send-otp`, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phoneNumber })
      });
      const data = await res.json();
      if (data.success) {
        setOtpSent(true);
        setStep(2);
        setSuccess("OTP sent! Check your phone for the verification code.");

        // Check if this phone already voted
        try {
          const phoneHash = ethers.keccak256(ethers.toUtf8Bytes(phoneNumber));
          const voted = await contract.hasVoted(phoneHash);
          if (voted) {
            setLocalHasVoted(true);
            setError("This phone number has already been used to vote in this election.");
            setSuccess("");
          }
        } catch (err) {
          console.error("Failed to check vote status:", err);
        }
      } else {
        setError(data.message || "Failed to send OTP.");
      }
    } catch (err) {
      setError("Network error while sending OTP. Is the backend running?");
    }
    setLoading(false);
  };

  const castVote = async () => {
    if (!selectedCandidate) return setError("Please select a candidate.");
    if (!otp) return setError("Please enter the OTP code.");
    if (!phoneNumber) return setError("Phone number is missing.");

    setLoading(true); setError(""); setSuccess("");
    try {
      // Step 1: Verify OTP + get backend signature
      setSuccess("Verifying OTP...");
      const res = await fetch(`${BACKEND_URL}/api/verify-and-sign`, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          phoneNumber,
          otp,
          candidateId: selectedCandidate,
          electionId
        })
      });
      const data = await res.json();
      
      if (!data.success) {
        setSuccess("");
        return setError(data.message || "OTP verification failed.");
      }

      // Step 2: Call smart contract with the signed authorization
      setSuccess("OTP verified! Submitting vote to blockchain...");
      const tx = await contract.castVote(
        selectedCandidate,
        data.phoneHash,
        data.signature
      );
      
      setSuccess("Transaction submitted! Waiting for confirmation...");
      await tx.wait();
      
      setLocalHasVoted(true);
      setSuccess("🎉 Vote cast successfully! Your vote is permanently recorded on the blockchain.");
      await fetchData(contract, account);
    } catch (err) {
      console.error(err);
      if (err.reason) {
        setError(err.reason);
      } else if (err.message?.includes("already voted")) {
        setError("This phone number has already voted in this election.");
        setLocalHasVoted(true);
      } else {
        setError("Failed to cast vote. Check the console for details.");
      }
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

  const resetPhoneFlow = () => {
    setPhoneNumber('');
    setOtp('');
    setOtpSent(false);
    setStep(1);
    setError('');
    setSuccess('');
  };

  // --- Views ---

  return (
    <div className="max-w-6xl mx-auto px-4 pb-24">
      
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
                      onClick={() => !localHasVoted && votingOpen && setSelectedCandidate(c.id)}
                      className={`p-5 rounded-2xl transition-all duration-300 relative overflow-hidden ${
                        selectedCandidate === c.id 
                        ? 'border-indigo-500 bg-indigo-500/10 shadow-[0_0_30px_-10px_rgba(79,70,229,0.3)] border' 
                        : 'border border-white/5 bg-white/5 hover:bg-white/10 cursor-pointer'
                      } ${localHasVoted || !votingOpen ? 'opacity-50 cursor-not-allowed grayscale' : ''}`}
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
                          {!votingOpen || isAdmin ? (
                            <>
                              <span className="block text-2xl font-black text-white">{c.voteCount}</span>
                              <span className="text-[10px] text-gray-500 uppercase tracking-widest font-bold">Votes</span>
                            </>
                          ) : (
                            <>
                              <Lock className="w-5 h-5 text-gray-600 mx-auto mb-0.5" />
                              <span className="text-[10px] text-gray-600 uppercase tracking-widest font-bold">Hidden</span>
                            </>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          <div className="lg:col-span-5 relative z-[60]">
            <div className="bg-[#0b0f19]/95 p-8 rounded-3xl sticky top-24 border border-white/10 shadow-[0_0_50px_rgba(0,0,0,0.5)]">
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
              ) : localHasVoted ? (
                <div className="py-12 text-center flex flex-col items-center animate-in zoom-in">
                  <div className="w-20 h-20 bg-green-500/10 rounded-full flex items-center justify-center mb-6 shadow-[0_0_30px_-5px_rgba(34,197,94,0.3)] border border-green-500/30">
                    <ShieldCheck className="w-10 h-10 text-green-400" />
                  </div>
                  <h3 className="text-2xl font-bold text-green-400 mb-2">Vote Recorded</h3>
                  <p className="text-gray-400 font-sans text-sm">Your vote was successfully inscribed on the blockchain.</p>
                </div>
              ) : (
                <div className="space-y-6">
                  {/* Step Progress Indicator */}
                  <div className="flex items-center justify-between mb-2">
                    {[1, 2, 3].map(s => (
                      <div key={s} className="flex items-center gap-2 flex-1">
                        <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold transition-all duration-300 ${
                          step >= s 
                            ? 'bg-indigo-600 text-white shadow-[0_0_15px_rgba(79,70,229,0.4)]' 
                            : 'bg-white/5 text-gray-500 border border-white/10'
                        }`}>
                          {step > s ? <CheckCircle2 className="w-4 h-4" /> : s}
                        </div>
                        {s < 3 && (
                          <div className={`flex-1 h-0.5 rounded transition-all duration-300 ${step > s ? 'bg-indigo-500' : 'bg-white/10'}`}></div>
                        )}
                      </div>
                    ))}
                  </div>
                  <div className="flex justify-between text-[10px] text-gray-500 uppercase tracking-widest font-bold mb-4 px-1">
                    <span>Phone</span>
                    <span>Verify</span>
                    <span>Vote</span>
                  </div>

                  {/* Step 1: Phone Number */}
                  {step === 1 && (
                    <div className="space-y-4 animate-in fade-in slide-in-from-bottom-4">
                      <label className="block text-sm font-semibold text-gray-300 tracking-wide">
                        <Smartphone className="w-4 h-4 inline mr-2 text-indigo-400" />
                        Phone Verification
                      </label>
                      <p className="text-xs text-gray-500 font-sans">Enter your phone number in international format to receive a verification code via SMS.</p>
                      <input
                        type="tel"
                        value={phoneNumber}
                        onChange={e => setPhoneNumber(e.target.value)}
                        placeholder="+919876543210"
                        className="w-full bg-black/50 border border-white/10 rounded-xl px-5 py-3.5 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-all font-mono text-lg tracking-wider placeholder:text-gray-600"
                      />
                      <button
                        onClick={sendOtp}
                        disabled={loading || !phoneNumber}
                        className="w-full py-3.5 rounded-xl font-bold transition-all flex items-center justify-center gap-2 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed shadow-[0_0_20px_-5px_rgba(79,70,229,0.4)]"
                      >
                        {loading ? <RefreshCw className="w-4 h-4 animate-spin" /> : <SendHorizonal className="w-4 h-4" />}
                        Send OTP
                      </button>
                    </div>
                  )}

                  {/* Step 2: OTP Entry */}
                  {step === 2 && !localHasVoted && (
                    <div className="space-y-4 animate-in fade-in slide-in-from-bottom-4">
                      <div className="bg-indigo-500/10 border border-indigo-500/20 rounded-xl p-3 flex items-start gap-3">
                        <Smartphone className="w-4 h-4 text-indigo-400 mt-0.5 flex-shrink-0" />
                        <div>
                          <p className="text-indigo-300 text-sm font-semibold">OTP sent to {phoneNumber}</p>
                          <button onClick={resetPhoneFlow} className="text-xs text-indigo-400/60 hover:text-indigo-300 transition-colors mt-1 underline">Change number</button>
                        </div>
                      </div>

                      <label className="block text-sm font-semibold text-gray-300 tracking-wide">
                        <KeyRound className="w-4 h-4 inline mr-2 text-indigo-400" />
                        Enter 6-Digit Code
                      </label>
                      <input
                        type="text"
                        value={otp}
                        onChange={e => setOtp(e.target.value.replace(/\D/g, '').slice(0, 6))}
                        placeholder="● ● ● ● ● ●"
                        maxLength={6}
                        className="w-full bg-black/50 border border-white/10 rounded-xl px-5 py-4 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-all font-mono text-2xl tracking-[0.5em] text-center placeholder:text-gray-600 placeholder:tracking-[0.3em] placeholder:text-lg"
                      />
                      
                      {otp.length === 6 && (
                        <button
                          onClick={() => setStep(3)}
                          className="w-full py-3.5 rounded-xl font-bold transition-all flex items-center justify-center gap-2 bg-indigo-600 hover:bg-indigo-500"
                        >
                          <CheckCircle2 className="w-4 h-4" />
                          Continue to Vote
                        </button>
                      )}

                      <button
                        onClick={sendOtp}
                        disabled={loading}
                        className="w-full text-center text-xs text-gray-500 hover:text-indigo-400 transition-colors py-2 font-sans"
                      >
                        Didn't receive it? Resend OTP
                      </button>
                    </div>
                  )}

                  {/* Step 3: Cast Vote */}
                  {step === 3 && (
                    <div className="space-y-5 animate-in fade-in slide-in-from-bottom-4">
                      <div className="bg-green-500/10 border border-green-500/30 rounded-xl p-4 flex items-start gap-3">
                        <CheckCircle2 className="w-5 h-5 text-green-400 mt-0.5" />
                        <div>
                          <p className="text-green-400 font-bold text-sm">Phone verified: {phoneNumber}</p>
                          <p className="text-green-500/70 text-xs font-sans">OTP ready. Select a candidate and cast your vote.</p>
                        </div>
                      </div>
                      
                      <div className="pt-2">
                        <label className="block text-sm font-semibold text-gray-300 mb-4 tracking-wide">Cast Your Ballot</label>
                        <button 
                          onClick={castVote}
                          disabled={loading || !selectedCandidate}
                          className="relative w-full overflow-hidden group py-4 rounded-xl font-bold text-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed bg-white/5 border border-white/10"
                        >
                          <div className={`absolute inset-0 transition-opacity duration-300 ${selectedCandidate ? 'opacity-100' : 'opacity-0'} bg-gradient-to-r from-indigo-600 to-purple-600`}></div>
                          <span className="relative z-10 block font-sans flex items-center justify-center gap-2">
                            {loading ? (
                              <><RefreshCw className="w-5 h-5 animate-spin" /> Processing...</>
                            ) : selectedCandidate ? (
                              'Sign & Cast Ballot'
                            ) : (
                              'Waiting for Selection...'
                            )}
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
