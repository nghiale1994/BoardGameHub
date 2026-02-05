import { spawn } from "node:child_process";
import { fileURLToPath } from "node:url";

const DEFAULT_LOCAL_SIGNALING = {
  host: "localhost",
  port: 9000,
  path: "/peerjs",
  secure: false
};

const DEFAULT_PEERJS_KEY = "peerjs";

const parseSignalingUrl = (rawUrl, { defaultPath }) => {
  const url = new URL(rawUrl);
  const secure = url.protocol === "https:";
  const port = url.port ? Number(url.port) : secure ? 443 : 80;
  const path = url.pathname && url.pathname !== "/" ? url.pathname : defaultPath;
  return { host: url.hostname, port, path, secure };
};

const hasProjectArg = (args) => {
  return args.some((arg) => arg === "--project" || arg.startsWith("--project="));
};

const startLocalPeerJsServer = async () => {
  // When this script is invoked via `npm run ...`, `npm_execpath` points at
  // npm's JS entrypoint (e.g. .../node_modules/npm/bin/npm-cli.js). Spawning
  // via `node <npm_execpath>` avoids PATH resolution issues that can occur in
  // Git Bash/MSYS shells on Windows.
  const npmCli = process.env.npm_execpath;
  const cmd = npmCli ? process.execPath : process.platform === "win32" ? "npm.cmd" : "npm";
  const args = npmCli ? [npmCli, "run", "peerjs:server"] : ["run", "peerjs:server"];

  const server = spawn(cmd, args, {
    stdio: "inherit",
    env: process.env,
    shell: false
  });

  // The peerjs CLI doesn't provide a stable machine-readable ready signal.
  // A short delay is sufficient for local runs.
  await new Promise((resolve) => setTimeout(resolve, 800));

  return server;
};

const killProcessTree = async (childProcess) => {
  if (!childProcess?.pid) return;

  if (process.platform === "win32") {
    const systemRoot = process.env.SystemRoot ?? process.env.SYSTEMROOT;
    const taskkill = systemRoot ? `${systemRoot}\\System32\\taskkill.exe` : "taskkill";

    await new Promise((resolve) => {
      const killer = spawn(taskkill, ["/pid", String(childProcess.pid), "/t", "/f"], {
        stdio: "ignore",
        shell: false,
        env: process.env
      });

      killer.on("exit", () => resolve());
      killer.on("error", () => resolve());
    });

    return;
  }

  try {
    childProcess.kill("SIGTERM");
  } catch {
    // ignore
  }
};

const run = async () => {
  const signalingUrlRaw = process.env.PEERJS_SIGNALING_URL;
  const overridePathRaw = process.env.PEERJS_SIGNALING_PATH;

  // Default behavior: always use a local signaling server for e2e runs.
  // Hosted signaling can be enabled explicitly via PEERJS_SIGNALING_URL.
  const defaultPath = overridePathRaw ?? "/peerjs";
  const signaling = signalingUrlRaw
    ? parseSignalingUrl(signalingUrlRaw, { defaultPath })
    : DEFAULT_LOCAL_SIGNALING;

  const peerJsServer = signalingUrlRaw ? null : await startLocalPeerJsServer();
  const peerJsKey = process.env.VITE_PEERJS_KEY ?? DEFAULT_PEERJS_KEY;

  // Run Playwright with PeerJS enabled + hosted signaling config.
  // These env vars are forwarded to the Vite dev server via playwright.config.ts.
  const env = {
    ...process.env,
    // Force Playwright to start a fresh webServer process so Vite picks up the
    // dynamic PeerJS env vars (reuseExistingServer is disabled when CI is truthy).
    CI: "1",
    VITE_E2E_DISABLE_PEERJS: "0",
    VITE_PEERJS_HOST: signaling.host,
    VITE_PEERJS_PORT: String(signaling.port),
    VITE_PEERJS_PATH: signaling.path,
    VITE_PEERJS_SECURE: String(signaling.secure),
    VITE_PEERJS_KEY: peerJsKey
  };

  const pwCmd = process.execPath;
  const extraArgs = process.argv.slice(2);
  // Run only PeerJS-specific specs by default; deterministic E2E assumes PeerJS is disabled.
  const defaultProjectArgs = hasProjectArg(extraArgs) ? [] : ["--project=chromium"];

  const playwrightCli = fileURLToPath(new URL("../node_modules/@playwright/test/cli.js", import.meta.url));
  const pwArgs = [
    playwrightCli,
    "test",
    "--reporter=list",
    "e2e/host-migration.peerjs.spec.ts",
    "e2e/host-migration.pair.peerjs.spec.ts",
    "e2e/host-migration.matrix.peerjs.spec.ts",
    "e2e/chat-panel.peerjs.spec.ts",
    ...defaultProjectArgs,
    ...extraArgs
  ];

  const pw = spawn(pwCmd, pwArgs, {
    stdio: "inherit",
    env,
    shell: false
  });

  const exitCode = await new Promise((resolve) => {
    pw.on("exit", (code) => resolve(code ?? 1));
  });

  await killProcessTree(peerJsServer);

  process.exit(exitCode);
};

run().catch((err) => {
  // eslint-disable-next-line no-console
  console.error(err);
  process.exit(1);
});
