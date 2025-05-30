import js from "@eslint/js";
import globals from "globals";
import { defineConfig } from "eslint/config";
import prettier from "eslint-config-prettier";

export default defineConfig([
  {
    files: ["**/*.{js,mjs,cjs}"],
    languageOptions: {
      globals: {
        ...globals.browser,
        d3: "readonly", // ⬅️ Add this line
      },
    },
    plugins: { js },
    extends: ["js/recommended", prettier],
    rules: {
      "camelcase": ["error", { properties: "always" }],
      "id-length": ["warn", { min: 2 }],
      "no-underscore-dangle": "warn",
    },
  },
]);
