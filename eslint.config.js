import eslintJs from "@eslint/js";
import eslintConfigPrettier from "eslint-config-prettier";
import globals from "globals";
import typescriptEslint from "typescript-eslint";

export default [
  { languageOptions: { globals: globals.node } },
  eslintJs.configs.recommended,
  ...typescriptEslint.configs.strict,
  eslintConfigPrettier,
];
