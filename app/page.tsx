"use client";

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import type { NextPage } from 'next';
// Import only necessary Ethers v6 components, including InterfaceAbi
import { ethers, Contract, BrowserProvider, Signer, formatEther, BigNumberish, InterfaceAbi, JsonRpcProvider } from 'ethers';

// Define contract details 
import { LOTTERY_ABI, LOTTERY_ADDRESS, ENTRY_FEE } from "./lib/contract";


// ======================================================================
// 1. TYPE DEFINITIONS & HELPERS
// ======================================================================

type ContractData = {
  currentRound: bigint;
  playersCount: bigint;
  owner: string;
  lotteryState: number;
  recentWinner: string;
  hasEntered: boolean;
};

const displayBigInt = (value: bigint | undefined | BigNumberish): string => {
  return value !== undefined ? value.toString() : "—";
};

const getLotteryStateString = (stateValue: number | undefined): string => {
  if (stateValue === 0) return "✅ OPEN";
  if (stateValue === 1) return "⛔ CLOSED";
  return "— Loading State —";
};

// ======================================================================
// 2. UI COMPONENTS (Moved to the file scope to resolve Error 2304)
// ======================================================================

// Note: These components require props to function (e.g., connectWallet, isConnected, etc.)
// They MUST be defined outside the Home component and accept props.

// --- 2.1. LotteryStatusCard ---
const LotteryStatusCard = ({ title, value, isLoading }: { title: string, value: string, isLoading: boolean }) => (
  <div className="bg-white/10 p-6 rounded-xl shadow-lg border border-gray-700 backdrop-blur-sm transition-all hover:border-blue-500/50">
    <p className="text-sm font-medium text-gray-400 uppercase">{title}</p>
    <h3 className={`mt-1 text-3xl font-bold ${isLoading ? 'animate-pulse' : 'text-white'}`}>
      {isLoading ? '...' : value}
    </h3>
  </div>
);


// --- 2.2. ConnectButton ---
const ConnectButton = ({ isConnected, address, isLoadingTx, connectWallet, disconnectWallet }: {
  isConnected: boolean,
  address: string | null,
  isLoadingTx: boolean,
  connectWallet: () => Promise<void>,
  disconnectWallet: () => void
}) => (
  <button
    onClick={isConnected ? disconnectWallet : connectWallet}
    disabled={isLoadingTx}
    className={`
            px-4 py-2 font-semibold text-sm rounded-lg transition-colors
            ${isConnected
        ? 'bg-gray-800 text-green-400 border border-green-400 hover:bg-gray-700'
        : 'bg-blue-600 text-white hover:bg-blue-700'
      }
        `}
  >
    {isLoadingTx ? 'Pending Tx...' : isConnected ? `Wallet: ${address?.slice(0, 6)}...` : 'Connect Wallet'}
  </button>
);


// --- 2.3. LotteryActionCard ---
const LotteryActionCard = ({ isLotteryOpen, isConnected, hasEntered, isLoadingTx, isLoadingData, enterLottery }: {
  isLotteryOpen: boolean,
  isConnected: boolean,
  hasEntered: boolean | undefined,
  isLoadingTx: boolean,
  isLoadingData: boolean,
  enterLottery: () => void
}) => {

  let buttonText;
  let isDisabled = isLoadingTx || isLoadingData || !isLotteryOpen || !isConnected;
  let backgroundColor = 'bg-gray-600 text-gray-400 cursor-not-allowed';

  if (!isConnected) {
    buttonText = "Connect Wallet to Enter";
    isDisabled = false;
    backgroundColor = 'bg-blue-600 hover:bg-blue-700 text-white';
  } else if (hasEntered) {
    buttonText = "Ticket Purchased (Max 1 Per Round)";
    isDisabled = true;
  } else if (isLotteryOpen) {
    buttonText = "Enter Lottery (0.01 ETH)";
    isDisabled = false;
    backgroundColor = 'bg-green-600 hover:bg-green-700 hover:scale-[1.01] text-white';
  } else {
    buttonText = "Lottery is CLOSED";
    isDisabled = true;
  }

  return (
    <div className="bg-gray-800 p-8 rounded-2xl shadow-2xl border border-gray-700 mt-12">
      <h2 className="text-2xl font-bold text-white mb-6 flex items-center">
        <span className="text-4xl mr-3">💰</span>
        {isLotteryOpen ? 'Join the Draw' : 'Waiting for Next Round'}
      </h2>
      <div className="flex items-center justify-between p-4 bg-gray-900 rounded-lg mb-6">
        <p className="text-sm text-gray-400">Entry Fee Required</p>
        <p className="text-xl font-mono text-yellow-300">{formatEther(ENTRY_FEE)} ETH</p>
      </div>

      <button
        onClick={enterLottery}
        disabled={isDisabled}
        className={`
                    w-full py-4 font-extrabold text-lg rounded-xl transition-all duration-200 shadow-md
                    ${backgroundColor}
                `}
      >
        {isLoadingTx || isLoadingData ? "Loading..." : buttonText}
      </button>
    </div>
  );
};


// --- 2.4. OwnerControlsCard ---
const OwnerControlsCard = ({ isOwner, isLoadingTx, isLotteryOpen, isLotteryClosed, startLottery, endLottery }: {
  isOwner: boolean,
  isLoadingTx: boolean,
  isLotteryOpen: boolean,
  isLotteryClosed: boolean,
  startLottery: () => void,
  endLottery: () => void
}) => (
  <div className="bg-red-900/20 border border-red-700/50 p-6 rounded-xl mt-8">
    <h3 className="text-lg font-semibold text-red-400 mb-4">👑 Owner Controls</h3>
    <div className="flex space-x-4">
      <button
        onClick={startLottery}
        disabled={isLoadingTx || !isLotteryClosed}
        className={`
                    flex-1 py-3 text-white font-medium rounded-lg transition-colors
                    ${isLotteryClosed
            ? 'bg-blue-600 hover:bg-blue-700'
            : 'bg-gray-600 cursor-not-allowed'
          }
                `}
      >
        {isLotteryClosed ? "Start New Lottery" : "Lottery is OPEN"}
      </button>
      <button
        onClick={endLottery}
        disabled={isLoadingTx || !isLotteryOpen}
        className={`
                    flex-1 py-3 text-white font-medium rounded-lg transition-colors
                    ${isLotteryOpen
            ? 'bg-orange-600 hover:bg-orange-700'
            : 'bg-gray-600 cursor-not-allowed'
          }
                `}
      >
        {isLotteryOpen ? "End Lottery & Pick Winner" : "Lottery is CLOSED"}
      </button>
    </div>
  </div>
);


// ======================================================================
// 3. MAIN COMPONENT: Home
// ======================================================================

const Home: NextPage = () => {
  // --- ETHERS STATE MANAGEMENT ---
  const [provider, setProvider] = useState<BrowserProvider | null>(null);
  const [signer, setSigner] = useState<Signer | null>(null);
  const [address, setAddress] = useState<string | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [isLoadingTx, setIsLoadingTx] = useState(false);
  const [isLoadingData, setIsLoadingData] = useState(true);

  const [contractState, setContractState] = useState<Partial<ContractData>>({});

  // --- CONNECTION & DISCONNECT LOGIC ---
  const disconnectWallet = () => {
    setProvider(null);
    setSigner(null);
    setAddress(null);
    setIsConnected(false);
  };

  const fetchContractData = useCallback(async () => {
    // Defined here for the contract logic section below
    // ... (full fetchContractData logic using lotteryContractRead) ...
    // Note: Full logic included below for completeness of the final file structure
    if (!lotteryContractRead || !address) return;

    setIsLoadingData(true);
    try {
      const [round, playersCount, owner, lotteryState, recentWinner, hasEntered] = await Promise.all([
        lotteryContractRead.currentRound(),
        lotteryContractRead.getPlayersCount(),
        lotteryContractRead.owner(),
        lotteryContractRead.lotteryState(),
        lotteryContractRead.recentWinner(),
        lotteryContractRead.hasEntered({ from: address }),
      ]);

      setContractState({
        currentRound: round as bigint,
        playersCount: playersCount as bigint,
        owner: owner as string,
        lotteryState: Number(lotteryState),
        recentWinner: recentWinner as string,
        hasEntered: hasEntered as boolean,
      });
    } catch (e) {
      console.error("Failed to fetch contract data:", e);
    } finally {
      setIsLoadingData(false);
    }
  }, [address, provider]); // Updated dependencies

  const connectWallet = useCallback(async () => {
    if (!(window as any).ethereum) {
      alert("MetaMask or a similar wallet is not installed.");
      return;
    }

    try {
      const browserProvider = new BrowserProvider((window as any).ethereum);
      const walletSigner = await browserProvider.getSigner();
      const walletAddress = await walletSigner.getAddress();

      setProvider(browserProvider);
      setSigner(walletSigner);
      setAddress(walletAddress);
      setIsConnected(true);

      (window as any).ethereum.on('accountsChanged', (accounts: string[]) => {
        if (accounts.length === 0) {
          disconnectWallet();
        } else {
          // Call the connect logic again to refresh the Signer object
          connectWallet();
        }
      });
      (window as any).ethereum.on('chainChanged', () => window.location.reload());

    } catch (error) {
      console.error("Wallet connection failed:", error);
      alert("Connection failed. Did you reject the request?");
    }
  }, []);

  useEffect(() => {
    const autoConnect = async () => {
      if ((window as any).ethereum) {
        const accounts = await (window as any).ethereum.request({ method: 'eth_accounts' });
        if (accounts.length > 0) {
          connectWallet();
        }
      }
    };
    autoConnect();

    return () => {
      if ((window as any).ethereum && (window as any).ethereum.removeListener) {
        (window as any).ethereum.removeListener('accountsChanged', disconnectWallet);
        (window as any).ethereum.removeListener('chainChanged', () => window.location.reload());
      }
    };
  }, [connectWallet]);


  // --- CONTRACT INSTANCE & READ LOGIC ---

  const lotteryContractRead = useMemo(() => {
    const readProvider = provider || new JsonRpcProvider('YOUR_STATIC_RPC_URL');
    // FIX for ABI type conflict
    return new Contract(LOTTERY_ADDRESS, LOTTERY_ABI as InterfaceAbi, readProvider);
  }, [provider]);

  const lotteryContractWrite = useMemo(() => {
    if (!signer) return null;
    // FIX for ABI type conflict
    return new Contract(LOTTERY_ADDRESS, LOTTERY_ABI as InterfaceAbi, signer);
  }, [signer]);

  useEffect(() => {
    if (address) {
      fetchContractData();
      const intervalId = setInterval(fetchContractData, 5000);
      return () => clearInterval(intervalId);
    }
  }, [address, fetchContractData]);


  const isOwner =
    isConnected &&
    contractState.owner &&
    address?.toLowerCase() === contractState.owner.toLowerCase();

  const isLotteryOpen = contractState.lotteryState === 0;
  const isLotteryClosed = contractState.lotteryState === 1;

  // --- WRITE LOGIC ---
  const executeWrite = useCallback(async (functionName: string, value?: bigint) => {
    // ... (execution logic remains the same) ...
    if (!lotteryContractWrite) {
      alert("Please connect your wallet to perform this action.");
      return;
    }

    setIsLoadingTx(true);
    try {
      let tx;
      if (functionName === 'enter') {
        tx = await lotteryContractWrite.enter({ value: value || 0n });
      } else {
        tx = await lotteryContractWrite[functionName]();
      }

      alert(`Transaction sent! Hash: ${tx.hash}`);
      await tx.wait();
      alert(`${functionName} successful!`);
      fetchContractData();

    } catch (error: any) {
      console.error(`Failed to execute ${functionName}:`, error);
      const reason = error.reason || error.data?.message || error.message;
      alert(`Transaction failed: ${reason}`);
    } finally {
      setIsLoadingTx(false);
    }
  }, [lotteryContractWrite, fetchContractData]);


  const enterLottery = () => executeWrite('enter', ENTRY_FEE);
  const startLottery = () => executeWrite('startLottery');
  const endLottery = () => executeWrite('endLottery');


  // -----------------------------------------------------
  // 4. FINAL RETURN (Layout)
  // -----------------------------------------------------

  return (
    <div className="min-h-screen bg-gray-900 text-white font-sans">
      {/* --- NAVBAR --- */}
      <nav className="flex items-center justify-between p-4 border-b border-gray-800 backdrop-blur-md bg-gray-900/90 sticky top-0 z-10">
        <h1 className="text-2xl font-extrabold text-blue-400">
          🎟️ Lottery DApp
        </h1>
        <ConnectButton
          isConnected={isConnected}
          address={address}
          isLoadingTx={isLoadingTx}
          connectWallet={connectWallet}
          disconnectWallet={disconnectWallet}
        />
      </nav>

      {/* --- MAIN CONTENT LAYOUT --- */}
      <main className="container mx-auto p-4 md:p-8 lg:max-w-4xl">

        {/* Debugging Info */}
        <div className="bg-gray-800/50 p-4 rounded-lg border border-gray-700 mb-6 text-sm">
          <p className="text-gray-400 mb-2"><strong>Debugging Info:</strong></p>
          <p>Wallet: <code className="text-yellow-400">{address || 'Not Connected'}</code></p>
          <p>Owner: <code className="text-yellow-400">{contractState.owner || 'Loading...'}</code></p>
          <p>Is Owner: <strong className={isOwner ? 'text-green-500' : 'text-red-500'}>{isOwner ? 'TRUE' : 'FALSE'}</strong></p>
        </div>


        {/* Header Section */}
        <div className="text-center my-12">
          <h1 className="text-4xl md:text-5xl font-extrabold text-white">
            The Decentralized Prize Draw
          </h1>
          <p className={`mt-3 text-lg font-semibold ${isLotteryOpen ? 'text-green-400' : 'text-red-400'}`}>
            {getLotteryStateString(contractState.lotteryState)}
          </p>
        </div>

        {/* Status Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <LotteryStatusCard
            title="Current Round"
            value={displayBigInt(contractState.currentRound)}
            isLoading={isLoadingData}
          />
          <LotteryStatusCard
            title="Players"
            value={displayBigInt(contractState.playersCount)}
            isLoading={isLoadingData}
          />
          <LotteryStatusCard
            title="Recent Winner"
            value={contractState.recentWinner ? `${(contractState.recentWinner as string).slice(0, 6)}...` : 'N/A'}
            isLoading={isLoadingData}
          />
        </div>

        {/* Main Action / Entry */}
        <LotteryActionCard
          isLotteryOpen={isLotteryOpen}
          isConnected={isConnected}
          hasEntered={contractState.hasEntered}
          isLoadingTx={isLoadingTx}
          isLoadingData={isLoadingData}
          enterLottery={enterLottery}
        />

        {/* Owner Info */}
        <div className="mt-8 pt-6 border-t border-gray-800 text-gray-500 text-sm">
          {isOwner ? (
            <OwnerControlsCard
              isOwner={isOwner}
              isLoadingTx={isLoadingTx}
              isLotteryOpen={isLotteryOpen}
              isLotteryClosed={isLotteryClosed}
              startLottery={startLottery}
              endLottery={endLottery}
            />
          ) : (
            <p className="text-center">Only the contract owner can start/end the lottery.</p>
          )}
        </div>

      </main>
    </div>
  );
}

export default Home;