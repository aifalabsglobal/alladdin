import { dirname } from "path";
import { fileURLToPath } from "url";
import { FlatCompat } from "@eslint/eslintrc";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const compat = new FlatCompat({
  baseDirectory: __dirname,
});

const eslintConfig = [
  {
    ignores: [
      ".next/**",
      "node_modules/**",
      "coverage/**",
      "dist/**",
      "next-env.d.ts",
    ],
  },
  ...compat.extends("next/core-web-vitals", "next/typescript"),
  {
    rules: {
      "@typescript-eslint/no-explicit-any": "error",
      "@typescript-eslint/no-unused-vars": [
        "error",
        { argsIgnorePattern: "^_", varsIgnorePattern: "^_" },
      ],
    },
  },
  {
    files: ["app/**/*.{ts,tsx}", "src/app/**/*.{ts,tsx}"],
    ignores: [
      "src/app/api/**/*.ts",
      "src/app/**/route.ts",
      "app/api/**/*.ts",
      "app/**/route.ts",
    ],
    rules: {
      "no-restricted-imports": [
        "error",
        {
          paths: [
            {
              name: "openai",
              message:
                "OPENAI_API_KEY is server-side only. Import OpenAI only from route handlers, jobs, or src/lib server modules — never from client or page components.",
            },
            {
              name: "@/lib/openai",
              message:
                "Do not import the OpenAI client from app pages/components. Use route handlers or server-only jobs.",
            },
          ],
        },
      ],
    },
  },
];

export default eslintConfig;
