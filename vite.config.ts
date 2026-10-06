// Copyright (c) 2026 Cloudflare, Inc.
// Licensed under the Apache 2.0 license found in the LICENSE file or at:
//     https://opensource.org/licenses/Apache-2.0

import { reactRouter } from "@react-router/dev/vite";
import { cloudflare, type WorkerConfig } from "@cloudflare/vite-plugin";
import tailwindcss from "@tailwindcss/vite";
import { isIPv4 } from "node:net";
import { defineConfig } from "vite";
import tsconfigPaths from "vite-tsconfig-paths";

function normalizeWorkerDomain(value: string | undefined): string {
  const hostname = value?.trim().toLowerCase();
  const labels = hostname?.split(".") ?? [];
  if (
    hostname === undefined ||
    hostname.length === 0 ||
    hostname.length > 253 ||
    labels.length < 2 ||
    labels.some(
      (label) =>
        label.length < 1 ||
        label.length > 63 ||
        !/^[a-z0-9](?:[a-z0-9-]*[a-z0-9])?$/.test(label),
    ) ||
    isIPv4(hostname)
  ) {
    throw new Error("WORKER_DOMAIN must be a valid DNS hostname with at least two labels");
  }

  return hostname;
}

function applyCiWorkerConfig(current: WorkerConfig) {
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

  const workerDomain = normalizeWorkerDomain(process.env.WORKER_DOMAIN);

  if (current.vars === undefined) {
    throw new Error("DOMAINS and EMAIL_ADDRESSES require a vars configuration");
  }

  current.vars.DOMAINS = domains.trim();
  current.vars.EMAIL_ADDRESSES = emailAddresses;
  current.routes = [{ pattern: workerDomain, custom_domain: true }];
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
