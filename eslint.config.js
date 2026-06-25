import js from '@eslint/js'
import reactHooks from 'eslint-plugin-react-hooks'
import tseslint from 'typescript-eslint'

export default tseslint.config(
  {
    ignores: ['.output', 'dist', 'node_modules', 'src/routeTree.gen.ts'],
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
      // Tailwind is for layout only. Typography/color/background/border-color
      // must go through Mantine theming + atoms/molecules (Text, Heading,
      // SectionLabel, StatValue, Caption, Panel, StatCard).
      'no-restricted-syntax': [
        'warn',
        {
          selector:
            "JSXAttribute[name.name='className'] Literal[value=/font-(thin|extralight|light|normal|medium|semibold|bold|extrabold|black)|text-(xs|sm|base|lg|xl|2xl|3xl|4xl)|text-\\[[0-9]|text-\\[var\\(--|bg-\\[var\\(--|border-\\[var\\(--|vf-section-label/]",
          message:
            'Avoid inline Tailwind typography/color. Use Mantine props + atoms/molecules (Text, Heading, SectionLabel, StatValue, Caption, Panel). Tailwind is for layout only.',
        },
        {
          selector:
            "JSXAttribute[name.name='className'] TemplateElement[value.raw=/font-(thin|extralight|light|normal|medium|semibold|bold|extrabold|black)|text-(xs|sm|base|lg|xl|2xl|3xl|4xl)|text-\\[[0-9]|text-\\[var\\(--|bg-\\[var\\(--|border-\\[var\\(--|vf-section-label/]",
          message:
            'Avoid inline Tailwind typography/color. Use Mantine props + atoms/molecules (Text, Heading, SectionLabel, StatValue, Caption, Panel). Tailwind is for layout only.',
        },
      ],
    },
  },
)
