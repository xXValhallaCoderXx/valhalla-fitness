/* apps/native has no "type": "module" (Expo/Metro convention), so this config is
   explicitly .mjs rather than relying on package-type inference. */
import js from '@eslint/js'
import reactHooks from 'eslint-plugin-react-hooks'
import tseslint from 'typescript-eslint'

export default tseslint.config(
  {
    // `android`/`ios` are generated native projects; `.expo` and `dist` are build state.
    ignores: ['.expo', 'android', 'ios', 'dist', 'node_modules', 'expo-env.d.ts'],
  },
  js.configs.recommended,
  ...tseslint.configs.recommended,
  {
    files: ['**/*.{ts,tsx}'],
    plugins: {
      'react-hooks': reactHooks,
    },
    rules: {
      ...reactHooks.configs.recommended.rules,
      '@typescript-eslint/no-explicit-any': 'off',
      // The codebase already marks deliberate non-use with a leading underscore
      // (e.g. the throwing platform fallback in account-export.ts).
      '@typescript-eslint/no-unused-vars': [
        'error',
        { argsIgnorePattern: '^_', varsIgnorePattern: '^_', caughtErrorsIgnorePattern: '^_' },
      ],
      // KNOWN BACKLOG (16 sites), warn rather than error so `pnpm lint` is
      // meaningful today. Roughly 13 are one idiom — `useEffect(() => { if (open)
      // setX(prop) }, [open, prop])` to reset a sheet's local form state — whose
      // idiomatic fix is remounting on a `key` instead. The rest (session-provider,
      // theme-provider) are genuine external-system synchronisation and may stay.
      // Clearing this is a behavioural change across ~14 files and wants its own
      // commit, on top of component tests. React Compiler is on, so the cascading
      // renders this rule describes are real cost, not style.
      'react-hooks/set-state-in-effect': 'warn',
      // Hermes has no DOM. A web global reached from a shared code path is a
      // crash on device that typecheck cannot see, because Expo's tsconfig
      // still pulls in the DOM lib. Platform variants are exempted below.
      'no-restricted-globals': [
        'error',
        { name: 'window', message: 'No DOM on Hermes. Use Platform/Dimensions, or a .web.ts variant.' },
        { name: 'document', message: 'No DOM on Hermes. Use Platform/Dimensions, or a .web.ts variant.' },
        { name: 'localStorage', message: 'Use expo-secure-store or AsyncStorage; localStorage is web-only.' },
      ],
      // The design system styles with inline objects resolved from useTokens(),
      // so StyleSheet.create has no call site and would fork the convention.
      'no-restricted-imports': [
        'error',
        {
          paths: [
            {
              name: 'react-native',
              importNames: ['StyleSheet'],
              message: 'The native DS uses inline style objects from useTokens(); StyleSheet.create is not used here.',
            },
          ],
        },
      ],
    },
  },
  {
    // Metro picks these only on web, where the DOM genuinely exists.
    files: ['**/*.web.ts', '**/*.web.tsx'],
    rules: { 'no-restricted-globals': 'off' },
  },
)
