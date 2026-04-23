import React, { useState, useEffect } from 'react';
import { ethers } from 'ethers';
import { Vote, ShieldCheck, Wallet } from 'lucide-react';
import { BrowserRouter, Routes, Route, Link, useLocation } from 'react-router-dom';

import Landing from './pages/Landing';
import Dashboard from './pages/Dashboard';

const CONTRACT_ADDRESS = import.meta.env.VITE_CONTRACT_ADDRESS || "0xLoadingContractAddress";
const BACKEND_URL = import.meta.env.VITE_BACKEND_URL || "http://localhost:3001";

const ABI = [
  "function admin() public view returns (address)",
  "function backendSigner() public view returns (address)",
  "function votingOpen() public view returns (bool)",
  "function currentElectionId() public view returns (uint256)",
  "function candidatesCount() public view returns (uint256)",
  "function hasVoted(bytes32) public view returns (bool)",
  "function getCandidate(uint256 _candidateId) public view returns (uint256, string memory, uint256)",
  "function castVote(uint256 _candidateId, bytes32 _phoneHash, bytes calldata _signature) public",
  "function setVotingStatus(bool _isOpen) public",
  "function addCandidate(string memory _name) public",
  "function resetElection() public"
];

function AppContent() {
  const [account, setAccount] = useState("");
  const [provider, setProvider] = useState(null);
  const [contract, setContract] = useState(null);
  
  const [candidates, setCandidates] = useState([]);
  const [votingOpen, setVotingOpen] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  const [electionId, setElectionId] = useState(1);
  
  const location = useLocation();

  const initializeEthers = async () => {
    if (window.ethereum) {
      try {
        const _provider = new ethers.BrowserProvider(window.ethereum);
        
        try {
          await window.ethereum.request({
            method: 'wallet_switchEthereumChain',
            params: [{ chainId: '0xaa36a7' }], // Sepolia
          });
        } catch (switchError) {
          if (switchError.code === 4902) {
             console.error("Sepolia network is not added to MetaMask");
          }
        }

        setProvider(_provider);
        const navAccounts = await _provider.send("eth_requestAccounts", []);
        setAccount(navAccounts[0]);
        
        const signer = await _provider.getSigner();
        const _contract = new ethers.Contract(CONTRACT_ADDRESS, ABI, signer);
        setContract(_contract);
        
        await fetchData(_contract, navAccounts[0]);
      } catch (err) {
        console.error(err);
      }
    } else {
      alert("Please install MetaMask to use this app.");
    }
  };

  const fetchData = async (contractInstance, userAccount) => {
    try {
      const adminAddress = await contractInstance.admin();
      setIsAdmin(adminAddress.toLowerCase() === userAccount.toLowerCase());
      
      const isOpen = await contractInstance.votingOpen();
      setVotingOpen(isOpen);

      const currentId = await contractInstance.currentElectionId();
      setElectionId(Number(currentId));

      const count = await contractInstance.candidatesCount();
      const loadedCandidates = [];
      for (let i = 1; i <= Number(count); i++) {
        const c = await contractInstance.getCandidate(i);
        loadedCandidates.push({
          id: Number(c[0]),
          name: c[1],
          voteCount: Number(c[2])
        });
      }
      setCandidates(loadedCandidates);
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    if (window.ethereum) {
      window.ethereum.on('accountsChanged', () => window.location.reload());
      window.ethereum.on('chainChanged', () => window.location.reload());
    }
  }, []);

  return (
    <div className="min-h-screen flex flex-col relative selection:bg-indigo-500/30 selection:text-indigo-200">
      {/* Background blobs for depth */}
      <div className="fixed top-[-20%] left-[-10%] w-[50%] h-[50%] rounded-full bg-indigo-600/10 blur-[120px] pointer-events-none z-[-1]"></div>
      <div className="fixed bottom-[-20%] right-[-10%] w-[50%] h-[50%] rounded-full bg-purple-600/10 blur-[120px] pointer-events-none z-[-1]"></div>

      {/* Navigation */}
      <nav className="glass-panel border-x-0 border-t-0 border-b border-white/5 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-6 h-20 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-3 group">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center shadow-lg shadow-indigo-500/20 group-hover:shadow-indigo-500/40 transition-shadow duration-300">
              <Vote className="w-6 h-6 text-white" />
            </div>
            <span className="text-xl font-bold tracking-tight text-white group-hover:text-indigo-300 transition-colors">
              TrustVote
            </span>
          </Link>

          <div className="flex items-center gap-6">
            <div className="hidden md:flex items-center gap-6 text-sm font-medium font-sans">
              <Link to="/" className={`${location.pathname === '/' ? 'text-white' : 'text-gray-400 hover:text-white'} transition-colors`}>Home</Link>
              <Link to="/app" className={`${location.pathname === '/app' ? 'text-white' : 'text-gray-400 hover:text-white'} transition-colors`}>Dashboard</Link>
            </div>
            
            <div className="w-px h-6 bg-white/10 hidden md:block"></div>

            {!account ? (
              <button 
                onClick={initializeEthers}
                className="px-5 py-2.5 bg-white/5 hover:bg-white/10 border border-white/10 rounded-xl font-semibold text-sm transition-all flex items-center gap-2 hover:border-indigo-500/50 group"
              >
                <Wallet className="w-4 h-4 text-indigo-400 group-hover:scale-110 transition-transform" />
                Connect Wallet
              </button>
            ) : (
              <div className="flex items-center gap-3">
                {isAdmin && (
                  <span className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-purple-500/10 text-purple-400 text-xs font-bold border border-purple-500/20">
                    <ShieldCheck className="w-3.5 h-3.5" />
                    ADMIN
                  </span>
                )}
                <div className="px-4 py-2.5 bg-black/40 border border-white/10 rounded-xl text-sm font-mono text-gray-300 flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full bg-green-500 shadow-[0_0_8px_rgba(34,197,94,0.8)]"></div>
                  {account.substring(0, 6)}...{account.substring(account.length - 4)}
                </div>
              </div>
            )}
          </div>
        </div>
      </nav>

      {/* Main Content */}
      <div className="flex-grow pt-8">
        <Routes>
          <Route path="/" element={<Landing connectWallet={initializeEthers} account={account} />} />
          <Route 
            path="/app" 
            element={
              <Dashboard 
                account={account}
                contract={contract}
                candidates={candidates}
                votingOpen={votingOpen}
                isAdmin={isAdmin}
                electionId={electionId}
                fetchData={fetchData}
                BACKEND_URL={BACKEND_URL}
              />
            } 
          />
        </Routes>
      </div>
      
      {/* Footer */}
      <footer className="border-t border-white/5 py-8 mt-auto">
        <div className="max-w-7xl mx-auto px-6 flex flex-col md:flex-row justify-between items-center gap-4 text-sm text-gray-500 font-sans">
          <p>© {new Date().getFullYear()} TrustVote Protocol. All rights reserved.</p>
          <div className="flex gap-6">
            <a href="#" className="hover:text-white transition-colors">Terms</a>
            <a href="#" className="hover:text-white transition-colors">Privacy</a>
            <a href="#" className="hover:text-white transition-colors">Smart Contract</a>
          </div>
        </div>
      </footer>
    </div>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <AppContent />
    </BrowserRouter>
  );
}
