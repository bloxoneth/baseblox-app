import fs from "node:fs";
import path from "node:path";

const mode = (process.argv[2] || "").toLowerCase();
if (mode !== "anvil" && mode !== "sepolia" && mode !== "sepolia-test") {
  console.error("Usage: node scripts/set-network-env.mjs <anvil|sepolia|sepolia-test>");
  process.exit(1);
}

const envPath = path.resolve(process.cwd(), ".env.local");
if (!fs.existsSync(envPath)) {
  console.error(`Missing ${envPath}`);
  process.exit(1);
}

const presets = {
  anvil: {
    NEXT_PUBLIC_ENABLE_NETWORK_SWITCHER: "true",
    NEXT_PUBLIC_CHAIN_ID: "31337",
    NEXT_PUBLIC_CHAIN_HEX: "0x7a69",
    NEXT_PUBLIC_NETWORK_NAME: "anvil-local",
    NEXT_PUBLIC_RPC_URL: "http://127.0.0.1:8545",
    BASE_SEPOLIA_RPC_URL: "http://127.0.0.1:8545",
    NEXT_PUBLIC_BLOCK_EXPLORER_URL: "http://127.0.0.1:8545",
    NEXT_PUBLIC_BUILDNFT_ADDRESS: "0xdc64a140aa3e981100a9beca4e685f962f0cf6c9",
    NEXT_PUBLIC_LICENSE_REGISTRY_ADDRESS: "0xcf7ed3acca5a467e9e704c703e8d87f634fb0fc9",
    NEXT_PUBLIC_LICENSE_NFT_ADDRESS: "0x9fe46736679d2d9a65f0992f2272de9f3c7fa6e0",
    NEXT_PUBLIC_DISTRIBUTOR_ADDRESS: "0xe7f1725e7734ce288f8367e1bb143e90bb3f0512",
    NEXT_PUBLIC_BLOX_ADDRESS: "0x5FbDB2315678afecb367f032d93F642f64180aa3",
  },
  sepolia: {
    NEXT_PUBLIC_ENABLE_NETWORK_SWITCHER: "true",
    NEXT_PUBLIC_CHAIN_ID: "84532",
    NEXT_PUBLIC_CHAIN_HEX: "0x14a34",
    NEXT_PUBLIC_NETWORK_NAME: "base-sepolia",
    NEXT_PUBLIC_RPC_URL: "https://sepolia.base.org",
    BASE_SEPOLIA_RPC_URL: "https://sepolia.base.org",
    NEXT_PUBLIC_BLOCK_EXPLORER_URL: "https://sepolia.basescan.org",
    NEXT_PUBLIC_BUILDNFT_ADDRESS: "0xf29a22a458c0237fdb5cc26a07df8191d242ae00",
    NEXT_PUBLIC_LICENSE_REGISTRY_ADDRESS: "0x0b9fe09ea3abe8d3a54d53f949c364230edc75b5",
    NEXT_PUBLIC_LICENSE_NFT_ADDRESS: "0x8573c37452982de0d23cbd3c9e98c88853bd4e80",
    NEXT_PUBLIC_DISTRIBUTOR_ADDRESS: "0x2c96057a8774153282592ca5afbf4dd8178954cc",
    NEXT_PUBLIC_BLOX_ADDRESS: "0x6578d53995FEB0e486135b893B8bC16AE1a5Ec52",
  },
  "sepolia-test": {
    NEXT_PUBLIC_ENABLE_NETWORK_SWITCHER: "true",
    NEXT_PUBLIC_CHAIN_ID: "84532",
    NEXT_PUBLIC_CHAIN_HEX: "0x14a34",
    NEXT_PUBLIC_NETWORK_NAME: "base-sepolia-test",
    NEXT_PUBLIC_RPC_URL: "https://sepolia.base.org",
    BASE_SEPOLIA_RPC_URL: "https://sepolia.base.org",
    NEXT_PUBLIC_BLOCK_EXPLORER_URL: "https://sepolia.basescan.org",
    NEXT_PUBLIC_BUILDNFT_ADDRESS: "0x65d577e20dfb8c79b4c7a4a76b64456e3c552a7e",
    NEXT_PUBLIC_LICENSE_REGISTRY_ADDRESS: "0xba629bdc8e234df00e794ab3d37cf94a2a519a87",
    NEXT_PUBLIC_LICENSE_NFT_ADDRESS: "0xceb1ae32c4d361cad286bc70f36d6c6764098204",
    NEXT_PUBLIC_DISTRIBUTOR_ADDRESS: "0x97975da49915291b6cb3bbd6f9041065b5342198",
    NEXT_PUBLIC_BLOX_ADDRESS: "0x6578d53995FEB0e486135b893B8bC16AE1a5Ec52",
  },
};

const anvilManifestPath = path.resolve(
  process.cwd(),
  "../ethblox-contracts/deployments/anvil.contracts.json",
);

function loadAnvilManifest() {
  if (!fs.existsSync(anvilManifestPath)) return null;
  try {
    return JSON.parse(fs.readFileSync(anvilManifestPath, "utf8"));
  } catch {
    return null;
  }
}

if (mode === "anvil") {
  const manifest = loadAnvilManifest();
  if (manifest) {
    presets.anvil.NEXT_PUBLIC_CHAIN_ID = String(manifest.chainId ?? 31337);
    presets.anvil.NEXT_PUBLIC_CHAIN_HEX = `0x${Number(presets.anvil.NEXT_PUBLIC_CHAIN_ID).toString(16)}`;
    presets.anvil.NEXT_PUBLIC_RPC_URL = manifest.rpcUrl || presets.anvil.NEXT_PUBLIC_RPC_URL;
    presets.anvil.BASE_SEPOLIA_RPC_URL = manifest.rpcUrl || presets.anvil.BASE_SEPOLIA_RPC_URL;
    presets.anvil.NEXT_PUBLIC_BUILDNFT_ADDRESS = manifest.buildNFT || presets.anvil.NEXT_PUBLIC_BUILDNFT_ADDRESS;
    presets.anvil.NEXT_PUBLIC_LICENSE_REGISTRY_ADDRESS =
      manifest.licenseRegistry || presets.anvil.NEXT_PUBLIC_LICENSE_REGISTRY_ADDRESS;
    presets.anvil.NEXT_PUBLIC_LICENSE_NFT_ADDRESS = manifest.licenseNFT || presets.anvil.NEXT_PUBLIC_LICENSE_NFT_ADDRESS;
    presets.anvil.NEXT_PUBLIC_DISTRIBUTOR_ADDRESS = manifest.distributor || presets.anvil.NEXT_PUBLIC_DISTRIBUTOR_ADDRESS;
    presets.anvil.NEXT_PUBLIC_BLOX_ADDRESS = manifest.blox || presets.anvil.NEXT_PUBLIC_BLOX_ADDRESS;
  }
}

const current = fs.readFileSync(envPath, "utf8").split(/\r?\n/);
const next = [...current];
const map = presets[mode];

for (const [key, value] of Object.entries(map)) {
  const idx = next.findIndex((line) => line.startsWith(`${key}=`));
  const line = `${key}=${value}`;
  if (idx >= 0) next[idx] = line;
  else next.push(line);
}

if (mode === "anvil") {
  const buildAddress = map.NEXT_PUBLIC_BUILDNFT_ADDRESS;
  const redisPrefix = `ethblox:v1:anvil-local:${buildAddress}:`;
  const idx = next.findIndex((line) => line.startsWith("REDIS_KEY_PREFIX="));
  if (idx >= 0) next[idx] = `REDIS_KEY_PREFIX=${redisPrefix}`;
  else next.push(`REDIS_KEY_PREFIX=${redisPrefix}`);
}

fs.writeFileSync(envPath, `${next.join("\n").replace(/\n+$/g, "")}\n`);
console.log(`Updated .env.local for ${mode}`);
