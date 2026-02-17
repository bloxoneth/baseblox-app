#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";
import process from "node:process";
import { Redis } from "@upstash/redis";
import { ethers } from "ethers";

function loadDotEnvLocal() {
  const envPath = path.join(process.cwd(), ".env.local");
  if (!fs.existsSync(envPath)) return;
  const lines = fs.readFileSync(envPath, "utf8").split(/\r?\n/);
  for (const line of lines) {
    if (!line || line.trim().startsWith("#")) continue;
    const idx = line.indexOf("=");
    if (idx < 1) continue;
    const key = line.slice(0, idx).trim();
    let val = line.slice(idx + 1).trim();
    if (
      (val.startsWith('"') && val.endsWith('"')) ||
      (val.startsWith("'") && val.endsWith("'"))
    ) {
      val = val.slice(1, -1);
    }
    if (!process.env[key]) process.env[key] = val;
  }
}

function parseArgs(argv) {
  const out = {
    from: 1,
    to: null,
    setBase: false,
    dryRun: false,
    outDir: null,
  };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === "--from" && argv[i + 1]) out.from = Number(argv[++i]);
    else if (a === "--to" && argv[i + 1]) out.to = Number(argv[++i]);
    else if (a === "--set-base") out.setBase = true;
    else if (a === "--dry-run") out.dryRun = true;
    else if (a === "--out-dir" && argv[i + 1]) out.outDir = argv[++i];
  }
  return out;
}

function jsonAttr(trait_type, value) {
  return { trait_type, value };
}

function buildMetadata(build, tokenId, appBaseUrl, imageBaseUri) {
  const kind = Number(build?.kind ?? 0);
  const kindLabel = kind === 0 ? "Brick" : kind === 2 ? "Collectors Edition" : "Build";
  const w = Number(build?.brickWidth ?? build?.baseWidth ?? 1);
  const d = Number(build?.brickDepth ?? build?.baseDepth ?? 1);
  const density = Number(build?.density ?? 1);
  const mass = Number(build?.mass ?? w * d * density);
  const name =
    build?.name && String(build.name).trim().length > 0
      ? String(build.name).trim()
      : kind === 0
        ? `Brick ${Math.min(w, d)}x${Math.max(w, d)} D${density}`
        : `ETHBLOX ${kindLabel} #${tokenId}`;

  const attributes = [
    jsonAttr("kind", kindLabel),
    jsonAttr("kindId", kind),
    jsonAttr("mass", mass),
    jsonAttr("density", density),
    jsonAttr("width", w),
    jsonAttr("depth", d),
  ];

  if (build?.geometryHash) attributes.push(jsonAttr("geometryHash", String(build.geometryHash)));
  if (build?.specKey) attributes.push(jsonAttr("specKey", String(build.specKey)));
  if (build?.bw_score !== undefined && build?.bw_score !== null) {
    attributes.push(jsonAttr("bw_score", Number(build.bw_score)));
  }

  const composition = build?.composition && typeof build.composition === "object" ? build.composition : {};
  const componentIds = [];
  const componentCounts = [];
  for (const [tid, info] of Object.entries(composition)) {
    const count = Number(info?.count ?? 0);
    if (!tid || !Number.isFinite(count) || count <= 0) continue;
    componentIds.push(String(tid));
    componentCounts.push(count);
  }
  if (componentIds.length > 0) {
    attributes.push(jsonAttr("componentBuildIds", componentIds.join(",")));
    attributes.push(jsonAttr("componentCounts", componentCounts.join(",")));
  }

  return {
    name,
    description: `ETHBLOX ${kindLabel} - ${w}x${d} density ${density}`,
    image: `${imageBaseUri}/${tokenId}.png`,
    animation_url: `${appBaseUrl}/viewer/${tokenId}`,
    external_url: `${appBaseUrl}/explore/${tokenId}`,
    attributes,
  };
}

function parseLighthouseAddResponse(text) {
  const lines = text
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter(Boolean);
  const rows = [];
  for (const line of lines) {
    try {
      rows.push(JSON.parse(line));
    } catch {
      // ignore non-json lines
    }
  }
  const finalRow = rows[rows.length - 1] || null;
  const folderCid = finalRow?.Hash || null;
  return { rows, folderCid };
}

async function main() {
  loadDotEnvLocal();
  const args = parseArgs(process.argv.slice(2));

  const chainId = String(process.env.NEXT_PUBLIC_CHAIN_ID || "84532");
  const redisPrefix = process.env.REDIS_KEY_PREFIX || "";
  const appBaseUrl = (process.env.NEXT_PUBLIC_APP_URL || process.env.NEXT_PUBLIC_APP_ORIGIN || "https://ethblox.art").replace(/\/+$/, "");
  const imageBaseUri = process.env.IMAGE_BASE_URI || process.env.NEXT_PUBLIC_IMAGE_BASE_URI || "ipfs://bafybeibnk4kq7mesrs7wtwi2ypwlnxhazoqkwgoycol55n64tqseox2q2a";

  const buildNft = process.env.NEXT_PUBLIC_BUILDNFT_ADDRESS;
  const rpcUrl = process.env.BASE_SEPOLIA_RPC_URL || process.env.NEXT_PUBLIC_RPC_URL;
  const ownerPk = process.env.PRIVATE_KEY || process.env.BASE_TOKEN_URI_OWNER_KEY;
  const lighthouseKey = process.env.LIGHTHOUSE_API_KEY;
  const kvUrl = process.env.KV_REST_API_URL;
  const kvToken = process.env.KV_REST_API_TOKEN;

  if (!kvUrl || !kvToken) throw new Error("Missing KV_REST_API_URL / KV_REST_API_TOKEN");
  if (!buildNft) throw new Error("Missing NEXT_PUBLIC_BUILDNFT_ADDRESS");
  if (!rpcUrl) throw new Error("Missing BASE_SEPOLIA_RPC_URL / NEXT_PUBLIC_RPC_URL");
  if (!lighthouseKey && !args.dryRun) throw new Error("Missing LIGHTHOUSE_API_KEY");

  const redis = new Redis({ url: kvUrl, token: kvToken });
  const keyStyleA = {
    minted: `ethblox:${chainId}:minted_tokens`,
    token: (id) => `ethblox:${chainId}:token:${id}`,
    build: (id) => `ethblox:${chainId}:build:${id}`,
  };
  const keyStyleB = {
    minted: `${redisPrefix}minted_tokens`,
    token: (id) => `${redisPrefix}token:${id}`,
    build: (id) => `${redisPrefix}build:${id}`,
  };

  let minted = await redis.smembers(keyStyleA.minted);
  let style = keyStyleA;
  if (!minted || minted.length === 0) {
    minted = await redis.smembers(keyStyleB.minted);
    style = keyStyleB;
  }
  const tokenIds = (minted || [])
    .map(String)
    .filter((v) => /^\d+$/.test(v))
    .map((v) => Number(v))
    .filter((v) => v >= args.from && (args.to == null || v <= args.to))
    .sort((a, b) => a - b);

  if (tokenIds.length === 0) throw new Error("No minted tokens found in selected range");

  const runLabel = new Date().toISOString().replace(/[:.]/g, "-");
  const outDir = args.outDir || path.join(process.cwd(), "data", "metadata-batch", runLabel);
  fs.mkdirSync(outDir, { recursive: true });

  let written = 0;
  for (const tokenId of tokenIds) {
    const buildId = await redis.get(style.token(String(tokenId)));
    if (!buildId) continue;
    const build = await redis.get(style.build(String(buildId)));
    if (!build || typeof build !== "object") continue;
    const metadata = buildMetadata(build, String(tokenId), appBaseUrl, imageBaseUri);
    fs.writeFileSync(path.join(outDir, `${tokenId}.json`), JSON.stringify(metadata, null, 2));
    written++;
  }

  if (written === 0) throw new Error("No metadata files were generated from Redis records");
  console.log(`Generated ${written} metadata files in: ${outDir}`);

  if (args.dryRun) {
    console.log("Dry run complete. No IPFS upload and no base URI update.");
    return;
  }

  const formData = new FormData();
  const fileNames = fs.readdirSync(outDir).filter((f) => f.endsWith(".json")).sort((a, b) => Number(a.split(".")[0]) - Number(b.split(".")[0]));
  for (const fileName of fileNames) {
    const fullPath = path.join(outDir, fileName);
    const body = fs.readFileSync(fullPath);
    formData.append("file", new Blob([body], { type: "application/json" }), fileName);
  }

  const uploadRes = await fetch("https://node.lighthouse.storage/api/v0/add?wrap-with-directory=true", {
    method: "POST",
    headers: { Authorization: `Bearer ${lighthouseKey}` },
    body: formData,
  });
  if (!uploadRes.ok) {
    const errText = await uploadRes.text();
    throw new Error(`Lighthouse upload failed: ${uploadRes.status} ${errText}`);
  }
  const rawText = await uploadRes.text();
  const parsed = parseLighthouseAddResponse(rawText);
  if (!parsed.folderCid) throw new Error(`Could not parse folder CID from Lighthouse response: ${rawText}`);
  const folderCid = parsed.folderCid;
  const baseUri = `ipfs://${folderCid}`;
  console.log(`Uploaded metadata folder CID: ${folderCid}`);
  console.log(`Base URI candidate: ${baseUri}`);

  if (!args.setBase) {
    console.log("Skipping on-chain base URI update (use --set-base to enable).");
    return;
  }

  if (!ownerPk) throw new Error("Missing PRIVATE_KEY (or BASE_TOKEN_URI_OWNER_KEY) for --set-base");
  const provider = new ethers.JsonRpcProvider(rpcUrl);
  const wallet = new ethers.Wallet(ownerPk, provider);
  const contract = new ethers.Contract(buildNft, ["function owner() view returns (address)", "function setBaseTokenURI(string)"], wallet);
  const owner = String(await contract.owner());
  if (owner.toLowerCase() !== wallet.address.toLowerCase()) {
    throw new Error(`Signer ${wallet.address} is not BuildNFT owner ${owner}`);
  }
  const tx = await contract.setBaseTokenURI(baseUri);
  const rc = await tx.wait();
  console.log(`setBaseTokenURI tx: ${tx.hash}`);
  console.log(`setBaseTokenURI block: ${rc?.blockNumber ?? "n/a"}`);
}

main().catch((err) => {
  console.error(`publish-metadata-batch failed: ${err?.message || err}`);
  process.exit(1);
});

