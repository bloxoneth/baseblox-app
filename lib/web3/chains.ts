const CHAIN_ID_DEC = Number(process.env.NEXT_PUBLIC_CHAIN_ID ?? "84532")
const CHAIN_ID_HEX = process.env.NEXT_PUBLIC_CHAIN_HEX ?? `0x${CHAIN_ID_DEC.toString(16)}`
const CHAIN_NAME = process.env.NEXT_PUBLIC_NETWORK_NAME ?? "Base Sepolia"
const CHAIN_RPC_URL = process.env.NEXT_PUBLIC_RPC_URL ?? process.env.BASE_SEPOLIA_RPC_URL ?? "https://sepolia.base.org"
const CHAIN_EXPLORER_URL =
  process.env.NEXT_PUBLIC_BLOCK_EXPLORER_URL ?? "https://sepolia.basescan.org"

export const BASE_SEPOLIA = {
  chainId: CHAIN_ID_HEX,
  chainIdDecimal: CHAIN_ID_DEC,
  chainName: CHAIN_NAME,
  nativeCurrency: {
    name: "Ethereum",
    symbol: "ETH",
    decimals: 18,
  },
  rpcUrls: [CHAIN_RPC_URL],
  blockExplorerUrls: [CHAIN_EXPLORER_URL],
}

export const ANVIL_LOCAL = {
  chainId: "0x7a69",
  chainIdDecimal: 31337,
  chainName: "Anvil Local",
  nativeCurrency: {
    name: "Ethereum",
    symbol: "ETH",
    decimals: 18,
  },
  rpcUrls: ["http://127.0.0.1:8545"],
  blockExplorerUrls: ["http://127.0.0.1:8545"],
}

export const MOCKBLOX_CONTRACT = {
  address: (process.env.NEXT_PUBLIC_BLOX_ADDRESS ??
    "0x6578d53995FEB0e486135b893B8bC16AE1a5Ec52") as `0x${string}`,
  abi: [
    {
      inputs: [{ internalType: "address", name: "account", type: "address" }],
      name: "balanceOf",
      outputs: [{ internalType: "uint256", name: "", type: "uint256" }],
      stateMutability: "view",
      type: "function",
    },
    {
      inputs: [],
      name: "decimals",
      outputs: [{ internalType: "uint8", name: "", type: "uint8" }],
      stateMutability: "view",
      type: "function",
    },
    {
      inputs: [],
      name: "symbol",
      outputs: [{ internalType: "string", name: "", type: "string" }],
      stateMutability: "view",
      type: "function",
    },
  ] as const,
}
