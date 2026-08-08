import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    // The pure-function suite must run without network access — see the plan's
    // Verification Contract. Everything it needs lives in lib/listings/fixtures.
    include: ["lib/**/*.test.ts"],
    environment: "node",
  },
});
