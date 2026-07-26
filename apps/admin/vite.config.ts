import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { fileURLToPath, URL } from "node:url";
import tailwindcss from "@tailwindcss/vite";
import { devtools } from "@tanstack/devtools-vite";
import { tanstackRouter } from "@tanstack/router-plugin/vite";
import viteReact from "@vitejs/plugin-react";
import { defineConfig, loadEnv, type Plugin } from "vite";

// Plugin to generate version.lock file after build
function versionLockPlugin(): Plugin {
  return {
    name: "version-lock",
    apply: "build",
    closeBundle() {
      const distDir = fileURLToPath(new URL("./dist", import.meta.url));
      const rootPkgPath = fileURLToPath(
        new URL("../../package.json", import.meta.url)
      );
      const rootPkg = JSON.parse(readFileSync(rootPkgPath, "utf-8"));
      const version = rootPkg.version || "0.0.0";

      mkdirSync(distDir, { recursive: true });
      writeFileSync(`${distDir}/version.lock`, version);
    },
  };
}

// Names stable vendor chunks for the foundations that load on every route, so
// they stay cached across deploys while app code churns.
//
// Deliberately limited to dependencies that are *already* eager. Naming a chunk
// for a lazy-only library (charts, markdown, zod, ...) backfires: Rollup drops
// small shared helpers into whichever chunk first needs them, an eager chunk
// then imports the helper, and the entire lazy chunk gets promoted onto the
// critical path. Everything unlisted falls through to Rollup's own splitting,
// which cannot make that mistake.
function vendorChunks(id: string) {
  // Rollup's CommonJS interop helpers are a few shared lines with no home of
  // their own; give them a dedicated chunk so they never anchor a large one.
  if (id.includes("commonjsHelpers")) return "vendor-interop";

  if (!id.includes("node_modules")) return;

  if (
    /[\\/]node_modules[\\/](react|react-dom|scheduler|use-sync-external-store)[\\/]/.test(
      id
    )
  ) {
    return "vendor-react";
  }
  if (id.includes("/node_modules/@tanstack/")) return "vendor-tanstack";
  if (
    /[\\/]node_modules[\\/](i18next|react-i18next|i18next-.+?)[\\/]/.test(id)
  ) {
    return "vendor-i18n";
  }
}

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), "");
  const rootPkgPath = fileURLToPath(
    new URL("../../package.json", import.meta.url)
  );
  const rootPkg = JSON.parse(readFileSync(rootPkgPath, "utf-8"));
  const appBuildId = `${rootPkg.version || "0.0.0"}-${Date.now()}`;

  return {
    base: "./",
    define: {
      "import.meta.env.VITE_APP_BUILD_ID": JSON.stringify(appBuildId),
    },
    plugins: [
      mode === "production"
        ? null
        : devtools({ eventBusConfig: { port: 42_070 } }),
      tanstackRouter({
        target: "react",
        autoCodeSplitting: true,
      }),
      viteReact(),
      tailwindcss(),
      versionLockPlugin(),
    ],
    resolve: {
      alias: {
        "@": fileURLToPath(new URL("./src", import.meta.url)),
      },
    },
    server: {
      proxy: {
        "/api/protocol-config": {
          target: env.VITE_PROTOCOL_CONFIG_BASE_URL || "http://localhost:3002",
          changeOrigin: true,
          secure: false,
        },
        "/api": {
          target: env.VITE_API_BASE_URL || "https://api.ppanel.dev",
          changeOrigin: true,
          secure: false,
        },
      },
    },
    build: {
      assetsDir: "static",
      chunkSizeWarningLimit: 800,
      rollupOptions: {
        output: {
          manualChunks: vendorChunks,
        },
      },
    },
  };
});
