import { defineConfig } from "vitest/config";
import path from "path";

export default defineConfig({
  test: {
    globals: true,
    environment: "node",
    include: ["__tests__/**/*.test.ts"],
    env: {
      RESEND_API_KEY: "re_test",
      EMAIL_FROM: "ReplyHalo <login@tests.replyhalo.test>",
    },
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "."),
    },
  },
});
