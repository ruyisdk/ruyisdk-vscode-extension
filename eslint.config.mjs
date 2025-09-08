import js from '@eslint/js'
import stylistic from '@stylistic/eslint-plugin'
import importPlugin from 'eslint-plugin-import'
import globals from 'globals'
import tseslint from 'typescript-eslint'

export default tseslint.config(
  { ignores: ['out/**', 'dist/**', 'build/**', 'node_modules/**'] },
  js.configs.recommended,
  tseslint.configs.recommended,
  stylistic.configs.recommended,
  {
    files: ['**/*.ts'],
    extends: [importPlugin.flatConfigs.recommended, importPlugin.flatConfigs.typescript],
    languageOptions: { parser: tseslint.parser, parserOptions: { project: './tsconfig.json' }, globals: globals.node },
    settings: { 'import/core-modules': ['vscode'] },
    rules: {
      'import/order': ['error', { groups: ['builtin', 'external', 'internal', 'parent', 'sibling', 'index'], 'newlines-between': 'always', alphabetize: { order: 'asc', caseInsensitive: true } }],
      'import/no-unresolved': ['error', { ignore: ['^vscode$', '^\\.'] }],
    },
  },
)
