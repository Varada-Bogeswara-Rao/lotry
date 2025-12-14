// src/lib/contract.ts

// ===============================================
// CONTRACT ADDRESS
// ===============================================
export const LOTTERY_ADDRESS = "0x9E8C9d5d8C27A0D3b9Ad96889E64d0eb0722Bd64";

// ===============================================
// CONSTANTS
// ===============================================
export const ENTRY_FEE = 10000000000000000n; // 0.01 ETH

// ===============================================
// LOTTERY ABI (CORRECTED & UPDATED)
// ===============================================
export const LOTTERY_ABI = [
    {
        "type": "constructor",
        "inputs": [
            { "name": "_minPlayers", "type": "uint256", "internalType": "uint256" },
            { "name": "_maxPlayers", "type": "uint256", "internalType": "uint256" }
        ],
        "stateMutability": "nonpayable"
    },
    {
        "type": "function",
        "name": "startLottery",
        "inputs": [],
        "outputs": [],
        "stateMutability": "nonpayable"
    },
    {
        "type": "function",
        "name": "enter",
        "inputs": [],
        "outputs": [],
        "stateMutability": "payable"
    },
    {
        "type": "function",
        "name": "endLottery",
        "inputs": [],
        "outputs": [],
        "stateMutability": "nonpayable"
    },
    {
        "type": "function",
        "name": "currentRound",
        "inputs": [],
        "outputs": [{ "name": "", "type": "uint256", "internalType": "uint256" }],
        "stateMutability": "view"
    },
    {
        "type": "function",
        "name": "getPlayers",
        "inputs": [],
        "outputs": [{ "name": "", "type": "address[]", "internalType": "address payable[]" }],
        "stateMutability": "view"
    },
    {
        "type": "function",
        "name": "getPlayersCount",
        "inputs": [],
        "outputs": [{ "name": "", "type": "uint256", "internalType": "uint256" }],
        "stateMutability": "view"
    },
    // --------------------------------------------------------
    // CRITICAL UPDATE: This is the NEW hasEntered signature
    // --------------------------------------------------------
    {
        "type": "function",
        "name": "hasEntered",
        "inputs": [
            { "name": "_user", "type": "address", "internalType": "address" }
        ],
        "outputs": [{ "name": "", "type": "bool", "internalType": "bool" }],
        "stateMutability": "view"
    },
    {
        "type": "function",
        "name": "lastEnteredRound",
        "inputs": [{ "name": "", "type": "address", "internalType": "address" }],
        "outputs": [{ "name": "", "type": "uint256", "internalType": "uint256" }],
        "stateMutability": "view"
    },
    {
        "type": "function",
        "name": "lotteryState",
        "inputs": [],
        "outputs": [{ "name": "", "type": "uint8", "internalType": "enum LotteryProtocol.LOTTERY_STATE" }],
        "stateMutability": "view"
    },
    {
        "type": "function",
        "name": "owner",
        "inputs": [],
        "outputs": [{ "name": "", "type": "address", "internalType": "address" }],
        "stateMutability": "view"
    },
    {
        "type": "function",
        "name": "recentWinner",
        "inputs": [],
        "outputs": [{ "name": "", "type": "address", "internalType": "address payable" }],
        "stateMutability": "view"
    },
    {
        "type": "event",
        "name": "LotteryStarted",
        "inputs": [{ "name": "roundId", "type": "uint256", "indexed": true, "internalType": "uint256" }],
        "anonymous": false
    },
    {
        "type": "event",
        "name": "PlayerEntered",
        "inputs": [
            { "name": "roundId", "type": "uint256", "indexed": true, "internalType": "uint256" },
            { "name": "player", "type": "address", "indexed": true, "internalType": "address" }
        ],
        "anonymous": false
    },
    {
        "type": "event",
        "name": "WinnerPicked",
        "inputs": [
            { "name": "roundId", "type": "uint256", "indexed": true, "internalType": "uint256" },
            { "name": "winner", "type": "address", "indexed": true, "internalType": "address" },
            { "name": "prize", "type": "uint256", "indexed": false, "internalType": "uint256" }
        ],
        "anonymous": false
    }
] as const;