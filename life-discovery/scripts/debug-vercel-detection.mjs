import { readFileSync, existsSync, appendFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const repoRoot = join(__dirname, "..");
const logPath = join(repoRoot, "..", "debug-9f9d11.log");
const simulatedRootDirectory = process.argv[2] ?? "life-discovery";
const runId = process.argv[3] ?? "pre-fix";

function log(hypothesisId, location, message, data) {
  const entry = {
    sessionId: "9f9d11",
    runId,
    hypothesisId,
    location,
    message,
    data,
    timestamp: Date.now(),
  };
  appendFileSync(logPath, `${JSON.stringify(entry)}\n`);
}

function readPkg(relativePath) {
  const fullPath = join(repoRoot, relativePath);
  if (!existsSync(fullPath)) return null;
  return JSON.parse(readFileSync(fullPath, "utf8"));
}

function hasNextDependency(pkg) {
  if (!pkg) return false;
  return Boolean(pkg.dependencies?.next || pkg.devDependencies?.next);
}

function readVercelConfig(relativePath) {
  const fullPath = join(repoRoot, relativePath);
  if (!existsSync(fullPath)) return null;
  return JSON.parse(readFileSync(fullPath, "utf8"));
}

const rootPkg = readPkg("package.json");
const webPkg = readPkg("apps/web/package.json");
const rootVercel = readVercelConfig("vercel.json");
const webVercel = readVercelConfig("apps/web/vercel.json");

// #region agent log
log("H1", "debug-vercel-detection.mjs:45", "Root package.json next detection", {
  path: "life-discovery/package.json",
  hasNext: hasNextDependency(rootPkg),
  packageManager: rootPkg?.packageManager ?? null,
});
// #endregion

// #region agent log
log("H2", "debug-vercel-detection.mjs:53", "Web package.json next detection", {
  path: "life-discovery/apps/web/package.json",
  hasNext: hasNextDependency(webPkg),
  nextVersion: webPkg?.dependencies?.next ?? webPkg?.devDependencies?.next ?? null,
});
// #endregion

// #region agent log
log("H3", "debug-vercel-detection.mjs:61", "Root vercel.json framework config", {
  exists: Boolean(rootVercel),
  framework: rootVercel?.framework ?? null,
  outputDirectory: rootVercel?.outputDirectory ?? null,
  buildCommand: rootVercel?.buildCommand ?? null,
});
// #endregion

// #region agent log
log("H4", "debug-vercel-detection.mjs:70", "Web vercel.json presence", {
  exists: Boolean(webVercel),
  framework: webVercel?.framework ?? null,
  installCommand: webVercel?.installCommand ?? null,
});
// #endregion

const simulatedEffectivePkg =
  simulatedRootDirectory.endsWith("apps/web") ? webPkg : rootPkg;

const effectiveVercel =
  simulatedRootDirectory.endsWith("apps/web") ? webVercel : rootVercel;
const effectiveFramework = effectiveVercel?.framework ?? "nextjs-auto";

// #region agent log
log("H5", "debug-vercel-detection.mjs:82", "Simulated Vercel Root Directory detection", {
  assumedRootDirectory: simulatedRootDirectory,
  effectivePackageJson: simulatedRootDirectory.endsWith("apps/web")
    ? "apps/web/package.json"
    : "package.json",
  effectiveVercelConfig: simulatedRootDirectory.endsWith("apps/web")
    ? "apps/web/vercel.json"
    : "vercel.json",
  effectiveFramework,
  wouldDetectNext: hasNextDependency(simulatedEffectivePkg),
  expectedFailure:
    effectiveFramework === "nextjs" && !hasNextDependency(simulatedEffectivePkg),
});
// #endregion

console.log(JSON.stringify({
  simulatedRootDirectory,
  rootHasNext: hasNextDependency(rootPkg),
  webHasNext: hasNextDependency(webPkg),
  effectiveFramework,
  wouldDetectNext: hasNextDependency(simulatedEffectivePkg),
  expectedFailure:
    effectiveFramework === "nextjs" && !hasNextDependency(simulatedEffectivePkg),
}, null, 2));
