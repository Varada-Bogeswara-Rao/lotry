"use client";

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import type { NextPage } from 'next';
import { Contract, BrowserProvider, Signer, formatEther, BigNumberish, InterfaceAbi, JsonRpcProvider } from 'ethers';
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";
import { Circle, Wallet } from "lucide-react";

// Define contract details 
import { LOTTERY_ABI, LOTTERY_ADDRESS, ENTRY_FEE } from "./lib/contract";
import { BackgroundPaths } from "@/components/ui/background-paths";
import { ElegantShape } from "@/components/ui/shape-landing-hero";

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
  if (stateValue === 0) return "OPEN";
  if (stateValue === 1) return "CLOSED";
  return "LOADING";
};

// ======================================================================
// 2. UI COMPONENTS
// ======================================================================

// --- 2.1. LotteryStatusCard ---
const LotteryStatusCard = ({ title, value, isLoading }: { title: string, value: string, isLoading: boolean }) => (
  <motion.div
    whileHover={{ y: -5 }}
    className="relative p-6 rounded-3xl bg-white/[0.03] border border-white/[0.08] backdrop-blur-sm overflow-hidden"
  >
    <div className="absolute inset-0 bg-gradient-to-br from-indigo-500/[0.05] via-transparent to-rose-500/[0.05] opacity-50" />
    <div className="relative z-10">
      <p className="text-sm font-medium text-white/60 uppercase tracking-widest mb-2">{title}</p>
      <h3 className={`text-3xl font-light tracking-tight ${isLoading ? 'animate-pulse text-white/40' : 'text-white'}`}>
        {isLoading ? '...' : value}
      </h3>
    </div>
  </motion.div>
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
    className={cn(
      "relative px-6 py-2.5 rounded-full text-sm font-medium transition-all duration-300 border",
      isConnected
        ? "bg-emerald-500/10 border-emerald-500/20 text-emerald-400 hover:bg-emerald-500/20"
        : "bg-white/[0.05] border-white/[0.1] text-white hover:bg-white/[0.1] hover:border-white/[0.2]"
    )}
  >
    <span className="flex items-center gap-2">
      {isLoadingTx ? (
        <span className="animate-pulse">Connecting...</span>
      ) : isConnected ? (
        <>
          <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
          {address?.slice(0, 6)}...{address?.slice(-4)}
        </>
      ) : (
        <>
          <Wallet className="w-4 h-4" />
          Connect Wallet
        </>
      )}
    </span>
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
  let buttonClass = 'from-gray-700 to-gray-600 text-gray-400 cursor-not-allowed';

  if (!isConnected) {
    buttonText = "Connect Wallet to Enter";
    isDisabled = false; // Allow click to trigger connect instruction or we could just disable
    // Actually, usually we want them to click connect button in navbar, but let's keep it disabled or instructive
    buttonClass = 'from-indigo-600 to-violet-600 text-white hover:shadow-indigo-500/25';
  } else if (hasEntered) {
    buttonText = "Ticket Purchased";
    isDisabled = true;
    buttonClass = 'from-emerald-600 to-teal-600 text-white opacity-80 cursor-default';
  } else if (isLotteryOpen) {
    buttonText = "Enter Draw (0.01 ETH)";
    isDisabled = false;
    buttonClass = 'from-rose-500 via-purple-500 to-indigo-500 text-white hover:shadow-rose-500/25 animate-gradient';
  } else {
    buttonText = "Round Closed";
    isDisabled = true;
    buttonClass = 'from-gray-800 to-gray-700 text-gray-500 cursor-not-allowed';
  }

  return (
    <div className="relative mt-16 p-1 rounded-3xl bg-gradient-to-b from-white/[0.1] to-white/[0.02]">
      <div className="relative bg-[#0a0a0a] rounded-[22px] p-8 overflow-hidden">
        <div className="absolute top-0 right-0 w-64 h-64 bg-indigo-500/10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2" />
        <div className="absolute bottom-0 left-0 w-64 h-64 bg-rose-500/10 rounded-full blur-3xl translate-y-1/2 -translate-x-1/2" />

        <div className="relative z-10 flex flex-col md:flex-row items-center justify-between gap-8">
          <div className="text-left">
            <h2 className="text-3xl font-light text-white mb-2">
              {isLotteryOpen ? 'Join the Flow' : 'Awaiting Next Cycle'}
            </h2>
            <div className="flex items-center gap-3 text-white/50">
              <span className="px-3 py-1 rounded-full bg-white/[0.05] border border-white/[0.1] text-xs uppercase tracking-widest">
                Entry Fee
              </span>
              <span className="text-xl font-light text-white">
                {formatEther(ENTRY_FEE)} <span className="text-sm text-white/40">ETH</span>
              </span>
            </div>
          </div>

          <button
            onClick={enterLottery}
            disabled={isDisabled}
            className={cn(
              "relative group px-10 py-4 rounded-2xl font-medium tracking-wide transition-all duration-300 shadow-lg hover:custom-shadow bg-gradient-to-r",
              buttonClass,
              "min-w-[240px]"
            )}
          >
            <span className={cn(
              "relative z-10 flex items-center justify-center gap-2",
              (isLoadingTx || isLoadingData) ? "animate-pulse" : ""
            )}>
              {isLoadingTx || isLoadingData ? "Processing..." : buttonText}
            </span>
          </button>
        </div>
      </div>
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
  <div className="mt-12 p-8 rounded-3xl bg-rose-950/[0.1] border border-rose-500/10 backdrop-blur-md">
    <div className="flex items-center gap-3 mb-6">
      <div className="w-2 h-2 rounded-full bg-rose-500 animate-pulse" />
      <h3 className="text-sm font-medium text-rose-200/60 uppercase tracking-widest">Administrative Controls</h3>
    </div>

    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      <button
        onClick={startLottery}
        disabled={isLoadingTx || !isLotteryClosed}
        className={cn(
          "py-4 rounded-xl text-sm font-medium transition-all duration-300 border",
          isLotteryClosed
            ? "bg-rose-500/10 border-rose-500/20 text-rose-200 hover:bg-rose-500/20 hover:border-rose-500/30"
            : "bg-white/[0.02] border-white/[0.05] text-white/20 cursor-not-allowed"
        )}
      >
        Start New Cycle
      </button>
      <button
        onClick={endLottery}
        disabled={isLoadingTx || !isLotteryOpen}
        className={cn(
          "py-4 rounded-xl text-sm font-medium transition-all duration-300 border",
          isLotteryOpen
            ? "bg-indigo-500/10 border-indigo-500/20 text-indigo-200 hover:bg-indigo-500/20 hover:border-indigo-500/30"
            : "bg-white/[0.02] border-white/[0.05] text-white/20 cursor-not-allowed"
        )}
      >
        End Cycle & Pick Winner
      </button>
    </div>
  </div>
);


// ======================================================================
// 3. MAIN COMPONENT: Home
// ======================================================================

const Home: NextPage = () => {
  // --- STATE ---
  const [provider, setProvider] = useState<BrowserProvider | null>(null);
  const [signer, setSigner] = useState<Signer | null>(null);
  const [address, setAddress] = useState<string | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [isLoadingTx, setIsLoadingTx] = useState(false);
  const [isLoadingData, setIsLoadingData] = useState(true);
  const [showLanding, setShowLanding] = useState(true);
  const [contractState, setContractState] = useState<Partial<ContractData>>({});

  // --- WALLET HELPERS ---
  const disconnectWallet = () => {
    setProvider(null);
    setSigner(null);
    setAddress(null);
    setIsConnected(false);
  };

  const fetchContractData = useCallback(async () => {
    if (!lotteryContractRead || !address) return;
    setIsLoadingData(true);
    try {
      const [round, playersCount, owner, lotteryState, recentWinner, hasEntered] = await Promise.all([
        lotteryContractRead.currentRound(),
        lotteryContractRead.getPlayersCount(),
        lotteryContractRead.owner(),
        lotteryContractRead.lotteryState(),
        lotteryContractRead.recentWinner(),
        lotteryContractRead.hasEntered(address),
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
  }, [address, provider]);

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
        if (accounts.length === 0) disconnectWallet();
        else connectWallet();
      });
      (window as any).ethereum.on('chainChanged', () => window.location.reload());
    } catch (error) {
      console.error("Wallet connection failed:", error);
    }
  }, []);

  useEffect(() => {
    const autoConnect = async () => {
      if ((window as any).ethereum) {
        const accounts = await (window as any).ethereum.request({ method: 'eth_accounts' });
        if (accounts.length > 0) connectWallet();
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

  // --- CONTRACT ---
  const lotteryContractRead = useMemo(() => {
    const readProvider = provider || new JsonRpcProvider('https://rpc.sepolia.org');
    return new Contract(LOTTERY_ADDRESS, LOTTERY_ABI as InterfaceAbi, readProvider);
  }, [provider]);

  const lotteryContractWrite = useMemo(() => {
    if (!signer) return null;
    return new Contract(LOTTERY_ADDRESS, LOTTERY_ABI as InterfaceAbi, signer);
  }, [signer]);

  useEffect(() => {
    if (address) {
      fetchContractData();
      const intervalId = setInterval(fetchContractData, 5000);
      return () => clearInterval(intervalId);
    }
  }, [address, fetchContractData]);

  const isOwner = isConnected && contractState.owner && address?.toLowerCase() === contractState.owner.toLowerCase();
  const isLotteryOpen = contractState.lotteryState === 0;
  const isLotteryClosed = contractState.lotteryState === 1;

  const executeWrite = useCallback(async (functionName: string, value?: bigint) => {
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
      await tx.wait();
      fetchContractData();
    } catch (error: any) {
      console.error(`Failed to execute ${functionName}:`, error);
    } finally {
      setIsLoadingTx(false);
    }
  }, [lotteryContractWrite, fetchContractData]);

  const enterLottery = () => executeWrite('enter', ENTRY_FEE);
  const startLottery = () => executeWrite('startLottery');
  const endLottery = () => executeWrite('endLottery');


  // --- RENDER ---
  if (showLanding) {
    return <BackgroundPaths title="Lottery DApp" onStart={() => setShowLanding(false)} />
  }

  return (
    <div className="relative min-h-screen w-full bg-[#030303] text-white selection:bg-rose-500/30">
      {/* --- BACKGROUND SHAPES --- */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute inset-0 bg-gradient-to-br from-indigo-500/[0.05] via-transparent to-rose-500/[0.05] blur-3xl opacity-50" />
        <ElegantShape delay={0.3} width={600} height={140} rotate={12} gradient="from-indigo-500/[0.15]" className="left-[-10%] top-[15%] opacity-30" />
        <ElegantShape delay={0.5} width={500} height={120} rotate={-15} gradient="from-rose-500/[0.15]" className="right-[-5%] top-[70%] opacity-30" />
        <ElegantShape delay={0.4} width={300} height={80} rotate={-8} gradient="from-violet-500/[0.15]" className="left-[5%] bottom-[5%] opacity-30" />
      </div>

      {/* --- NAVBAR --- */}
      <nav className="fixed top-0 left-0 right-0 z-50 border-b border-white/[0.08] backdrop-blur-xl bg-[#030303]/50">
        <div className="container mx-auto px-6 h-20 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-indigo-500 to-rose-500 flex items-center justify-center">
              <Circle className="w-4 h-4 text-white fill-white" />
            </div>
            <span className="font-bold text-lg tracking-tight text-white/90">Lotry</span>
          </div>
          <ConnectButton
            isConnected={isConnected}
            address={address}
            isLoadingTx={isLoadingTx}
            connectWallet={connectWallet}
            disconnectWallet={disconnectWallet}
          />
        </div>
      </nav>

      {/* --- MAIN CONTENT --- */}
      <main className="relative z-10 container mx-auto px-4 pt-32 pb-20 md:px-8 max-w-5xl">

        {/* Header */}
        <div className="text-center mb-16">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/[0.03] border border-white/[0.08] mb-6"
          >
            <Circle className={cn("h-2 w-2", isLotteryOpen ? "fill-emerald-500" : "fill-rose-500")} />
            <span className="text-sm text-white/60 tracking-wide uppercase">
              Lottery State: {getLotteryStateString(contractState.lotteryState)}
            </span>
          </motion.div>

          <motion.h1
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="text-5xl md:text-7xl font-bold tracking-tight mb-4"
          >
            <span className="bg-clip-text text-transparent bg-gradient-to-b from-white to-white/70">
              Decentralized
            </span>
            <br />
            <span className="bg-clip-text text-transparent bg-gradient-to-r from-indigo-300 via-white/80 to-rose-300">
              Prize Draw
            </span>
          </motion.h1>

          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="text-lg text-white/40 max-w-xl mx-auto font-light leading-relaxed"
          >
            Participate in a transparent, blockchain-verified lottery system. Fair play guaranteed by smart contracts.
          </motion.p>
        </div>

        {/* Status Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <LotteryStatusCard
            title="Prize Pool / Round"
            value={displayBigInt(contractState.currentRound)}
            isLoading={isLoadingData}
          />
          <LotteryStatusCard
            title="Active Players"
            value={displayBigInt(contractState.playersCount)}
            isLoading={isLoadingData}
          />
          <LotteryStatusCard
            title="Recent Winner"
            value={contractState.recentWinner ? `${(contractState.recentWinner as string).slice(0, 6)}...` : 'None'}
            isLoading={isLoadingData}
          />
        </div>

        {/* Action Section */}
        <LotteryActionCard
          isLotteryOpen={isLotteryOpen}
          isConnected={isConnected}
          hasEntered={contractState.hasEntered}
          isLoadingTx={isLoadingTx}
          isLoadingData={isLoadingData}
          enterLottery={enterLottery}
        />

        {/* Owner Controls */}
        {isOwner && (
          <OwnerControlsCard
            isOwner={isOwner}
            isLoadingTx={isLoadingTx}
            isLotteryOpen={isLotteryOpen}
            isLotteryClosed={isLotteryClosed}
            startLottery={startLottery}
            endLottery={endLottery}
          />
        )}

      </main>
    </div>
  );
}

export default Home;