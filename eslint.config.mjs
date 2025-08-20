import { dirname } from "path";
import { fileURLToPath } from "url";
import { FlatCompat } from "@eslint/eslintrc";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const compat = new FlatCompat({
  baseDirectory: __dirname,
});

const eslintConfig = [
  ...compat.extends("next/core-web-vitals", "next/typescript"),
  {
    rules: {
      // Make unused vars warnings instead of errors, with practical patterns
      "@typescript-eslint/no-unused-vars": ["warn", { 
        "argsIgnorePattern": "^_",
        "varsIgnorePattern": "^_",
        "caughtErrorsIgnorePattern": "^_",
        "destructuredArrayIgnorePattern": "^_"
      }],
      
      // Allow 'any' type in specific cases (external libraries, rapid prototyping)
      "@typescript-eslint/no-explicit-any": ["warn", {
        "ignoreRestArgs": true
      }],
      
      // Don't force explicit return types - let TypeScript infer
      "@typescript-eslint/explicit-function-return-type": "off",
      "@typescript-eslint/explicit-module-boundary-types": "off",
      
      // Allow empty catch blocks with underscore (common pattern)
      "no-empty": ["error", { "allowEmptyCatch": true }],
      
      // Don't enforce prefer-const for destructuring (can be noisy)
      "prefer-const": ["error", { "destructuring": "all" }],
      
      // Allow console.log in development
      "no-console": process.env.NODE_ENV === "production" ? "warn" : "off",
      
      // React specific rules - be more lenient
      "react-hooks/exhaustive-deps": "warn",
      
      // Next.js specific
      "@next/next/no-html-link-for-pages": "off"
    }
  }
];

export default eslintConfig;
