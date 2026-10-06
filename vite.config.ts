// Copyright (c) 2026 Cloudflare, Inc.
// Licensed under the Apache 2.0 license found in the LICENSE file or at:
//     https://opensource.org/licenses/Apache-2.0

import { reactRouter } from "@react-router/dev/vite";
import { cloudflare } from "@cloudflare/vite-plugin";
import tailwindcss from "@tailwindcss/vite";
import { defineConfig } from "vite";
import tsconfigPaths from "vite-tsconfig-paths";

function applyCiWorkerConfig(current: { vars?: Record<string, unknown> }) {
  if (process.env.CI_WORKER_CONFIG !== "true") {
    return;
  }

  const domains = process.env.DOMAINS;
  if (domains === undefined || domains.trim() === "") {
    throw new Error("DOMAINS must be a nonblank string");
  }

  const emailAddressesJson = process.env.EMAIL_ADDRESSES;
  if (emailAddressesJson === undefined || emailAddressesJson.trim() === "") {
    throw new Error("EMAIL_ADDRESSES must be a nonblank JSON string array");
  }

  let emailAddresses: unknown;
  try {
    emailAddresses = JSON.parse(emailAddressesJson);
  } catch {
    throw new Error("EMAIL_ADDRESSES must be valid JSON");
  }

  if (
    !Array.isArray(emailAddresses) ||
    !emailAddresses.every(
      (address) => typeof address === "string" && address.trim() !== "",
    )
  ) {
    throw new Error("EMAIL_ADDRESSES must be a JSON string array with no blank elements");
  }

  if (current.vars === undefined) {
    throw new Error("DOMAINS and EMAIL_ADDRESSES require a vars configuration");
  }

  current.vars.DOMAINS = domains.trim();
  current.vars.EMAIL_ADDRESSES = emailAddresses;
}

export default defineConfig({
  plugins: [
    cloudflare({
      viteEnvironment: { name: "ssr" },
      config: applyCiWorkerConfig,
    }),
    tailwindcss(),
    reactRouter(),
    tsconfigPaths(),
  ],
});
