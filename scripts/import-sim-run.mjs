import fs from "node:fs";
import path from "node:path";
import { Redis } from "@upstash/redis";

function normalizeBrickKey(w, d, density) {
  const minDim = Math.min(Number(w), Number(d));
  const maxDim = Math.max(Number(w), Number(d));
  return `${minDim}x${maxDim}-D${Number(density)}`;
}

function parseArgs() {
  const args = process.argv.slice(2);
  const out = {
    runId: process.env.SIM_RUN_ID || "local-final-8557",
    appRoot: path.resolve(process.cwd()),
    clearExisting: true,
  };
  for (let i = 0; i < args.length; i++) {
    const a = args[i];
    if (a === "--run-id") out.runId = args[++i];
    else if (a === "--no-clear") out.clearExisting = false;
  }
  return out;
}

function loadEnvLocal(appRoot) {
  const envPath = path.join(appRoot, ".env.local");
  if (!fs.existsSync(envPath)) {
    throw new Error(`Missing .env.local at ${envPath}`);
  }
  const lines = fs.readFileSync(envPath, "utf8").split(/\r?\n/);
  for (const lineRaw of lines) {
    const line = lineRaw.trim();
    if (!line || line.startsWith("#")) continue;
    const idx = line.indexOf("=");
    if (idx <= 0) continue;
    const key = line.slice(0, idx).trim();
    let value = line.slice(idx + 1).trim();
    if (
      (value.startsWith('"') && value.endsWith('"'))
      || (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }
    if (!(key in process.env)) process.env[key] = value;
  }
}

function expectEnv(name) {
  const value = process.env[name];
  if (!value) throw new Error(`Missing env var: ${name}`);
  return value;
}

function redisKey(chainId, key) {
  return `ethblox:${chainId}:${key}`;
}

function colorForType(t) {
  const colors = ["#f7c948", "#5bc0eb", "#9bc53d", "#e55934", "#fa7921", "#6b5b95"];
  return colors[Math.abs(Number(t) || 0) % colors.length];
}

async function main() {
  const opts = parseArgs();
  loadEnvLocal(opts.appRoot);

  const runDir = path.join(opts.appRoot, "data", "sim-runs", opts.runId);
  const tokensPath = path.join(runDir, "tokens.json");
  const metadataDir = path.join(runDir, "metadata");

  if (!fs.existsSync(tokensPath)) {
    throw new Error(`Missing sim tokens file: ${tokensPath}`);
  }

  const tokens = JSON.parse(fs.readFileSync(tokensPath, "utf8"));
  const metadataByToken = new Map();

  if (fs.existsSync(metadataDir)) {
    for (const file of fs.readdirSync(metadataDir)) {
      if (!file.endsWith(".json")) continue;
      const p = path.join(metadataDir, file);
      const meta = JSON.parse(fs.readFileSync(p, "utf8"));
      metadataByToken.set(String(meta.tokenId), meta);
    }
  }

  const redis = new Redis({
    url: expectEnv("KV_REST_API_URL"),
    token: expectEnv("KV_REST_API_TOKEN"),
  });
  const chainNs = process.env.NEXT_PUBLIC_CHAIN_ID || "84532";

  const importedSetKey = redisKey(chainNs, "sim:imported:buildIds");
  const mintedBrickSpecsKey = redisKey(chainNs, "minted_brick_specs");
  const mintedBaseBrickMapKey = redisKey(chainNs, "minted_base_brick_tokens_by_density");
  if (opts.clearExisting) {
    let prev = [];
    try {
      prev = (await redis.smembers(importedSetKey)) ?? [];
    } catch {
      prev = [];
    }
    for (const buildId of prev ?? []) {
      await redis.del(redisKey(chainNs, `build:${buildId}`));
    }
    if (prev?.length) {
      for (const buildId of prev) {
        await redis.zrem(redisKey(chainNs, "builds:public"), buildId);
      }
    }
    await redis.del(importedSetKey);
    await redis.del(mintedBrickSpecsKey);
    await redis.del(mintedBaseBrickMapKey);
    const oldSpecKeys = await redis.keys(redisKey(chainNs, "brick:spec:*"));
    for (const key of oldSpecKeys ?? []) {
      await redis.del(key);
    }
  }

  const mintedBrickSpecs = new Set();
  const baseBrickTokensByDensity = {};
  for (const token of tokens) {
    if (Number(token.kind) !== 0) continue;
    const key = normalizeBrickKey(token.width, token.depth, token.density);
    mintedBrickSpecs.add(key);
    await redis.set(redisKey(chainNs, `brick:spec:${key}`), String(token.tokenId));
    if (Number(token.width) === 1 && Number(token.depth) === 1) {
      const dens = String(Number(token.density));
      if (!baseBrickTokensByDensity[dens]) {
        baseBrickTokensByDensity[dens] = String(token.tokenId);
      }
    }
  }
  if (mintedBrickSpecs.size > 0) {
    for (const key of mintedBrickSpecs) {
      await redis.sadd(mintedBrickSpecsKey, key);
    }
  }
  await redis.set(mintedBaseBrickMapKey, baseBrickTokensByDensity);

  let imported = 0;
  for (const token of tokens) {
    const tokenId = String(token.tokenId);
    const buildId = `sim_${opts.runId}_${tokenId}`;
    const meta = metadataByToken.get(tokenId);
    const shape = Array.isArray(meta?.shape) ? meta.shape : [];
    const bricks = shape.map((v) => ({
      color: colorForType(v.t),
      position: [Number(v.x) || 0, Number(v.y) || 0, Number(v.z) || 0],
      width: 1,
      depth: 1,
    }));

    const build = {
      id: buildId,
      name: meta?.name || `SIM Build #${tokenId}`,
      creator: String(token.minter || "0x0000000000000000000000000000000000000000").toLowerCase(),
      bricks,
      mass: Number(token.mass || 0),
      colors: new Set(bricks.map((b) => b.color)).size,
      bw_score: Number((Math.log(1 + Number(token.mass || 0)) * Math.log(2 + Math.max(1, bricks.length))).toFixed(2)),
      created: new Date().toISOString(),
      tokenId,
      kind: Number(token.kind || 1),
      density: Number(token.density || 1),
      geometryHash: token.geometryHash,
      componentBuildIds: (token.components || []).map((c) => String(c.componentId)),
      componentCounts: (token.components || []).map((c) => Number(c.count || 0)),
      metadata: {
        buildWidth: 10,
        buildDepth: 10,
        totalBricks: bricks.length,
        totalInstances: bricks.length,
        nftsUsed: Array.isArray(token.components) ? token.components.length : 0,
      },
      timestamp: Date.now(),
    };

    if (Number(token.kind) === 0 && bricks.length === 0) {
      build.bricks = [{
        color: "#f7c948",
        position: [0, 0.5, 0],
        width: Number(token.width || 1),
        depth: Number(token.depth || 1),
      }];
      build.name = meta?.name || `Brick ${Number(token.width || 1)}x${Number(token.depth || 1)} D${Number(token.density || 1)}`;
      build.metadata = {
        buildWidth: Number(token.width || 1),
        buildDepth: Number(token.depth || 1),
        totalBricks: 1,
        totalInstances: 1,
        nftsUsed: 0,
      };
    }

    await redis.set(redisKey(chainNs, `build:${buildId}`), build);
    await redis.set(redisKey(chainNs, `token:${tokenId}`), buildId);
    await redis.sadd(redisKey(chainNs, "minted_tokens"), tokenId);
    await redis.zadd(redisKey(chainNs, "builds:public"), { score: Date.now(), member: buildId });
    await redis.sadd(importedSetKey, buildId);
    imported += 1;
  }

  console.log(`Imported ${imported} simulated builds from run ${opts.runId}`);
}

main().catch((err) => {
  console.error("Import failed:", err);
  process.exitCode = 1;
});
