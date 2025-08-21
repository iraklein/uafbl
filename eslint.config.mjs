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
      
      // Allow 'any' type - often needed with external APIs and rapid development
      "@typescript-eslint/no-explicit-any": "off",
      
      // Don't force explicit return types - let TypeScript infer
      "@typescript-eslint/explicit-function-return-type": "off",
      "@typescript-eslint/explicit-module-boundary-types": "off",
      
      // Allow empty catch blocks with underscore (common pattern)
      "no-empty": ["error", { "allowEmptyCatch": true }],
      
      // Don't enforce prefer-const for destructuring (can be noisy)
      "prefer-const": ["error", { "destructuring": "all" }],
      
      // Allow console.log everywhere - useful for debugging
      "no-console": "off",
      
      // React specific rules - be more lenient for development
      "react-hooks/exhaustive-deps": "warn",
      "react/no-unescaped-entities": "warn",
      "react/display-name": "off",
      
      // Next.js specific - turn off strict rules that cause issues
      "@next/next/no-html-link-for-pages": "off",
      "@next/next/no-img-element": "warn",
      
      // TypeScript specific - be more permissive
      "@typescript-eslint/ban-ts-comment": "warn",
      "@typescript-eslint/no-non-null-assertion": "warn",
      "@typescript-eslint/no-empty-function": "off",
      "@typescript-eslint/no-inferrable-types": "off",
      
      // General JavaScript - reduce noise
      "no-var": "warn",
      "prefer-const": "warn",
      "no-prototype-builtins": "off",
      "no-case-declarations": "off"
    }
  }
];

export default eslintConfig;
