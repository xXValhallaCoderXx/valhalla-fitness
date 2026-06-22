import {
    ActionIcon,
    Badge,
    Button,
    Card,
    Checkbox,
    Modal,
    NativeSelect,
    Notification,
    NumberInput,
    Paper,
    TextInput,
    Tooltip,
    createTheme,
    type CSSVariablesResolver,
    type MantineColorsTuple,
} from '@mantine/core'

const action: MantineColorsTuple = [
    '#eef5ff',
    '#d9e8ff',
    '#b3d0ff',
    '#89b6ff',
    '#659fff',
    '#4f8ef7',
    '#2563eb',
    '#1d4ed8',
    '#1e40af',
    '#172554',
]

const success: MantineColorsTuple = [
    '#ecfdf5',
    '#d1fae5',
    '#a7f3d0',
    '#6ee7b7',
    '#34d399',
    '#10b981',
    '#059669',
    '#047857',
    '#065f46',
    '#022c22',
]

const warning: MantineColorsTuple = [
    '#fffbeb',
    '#fef3c7',
    '#fde68a',
    '#fcd34d',
    '#fbbf24',
    '#f59e0b',
    '#d97706',
    '#b45309',
    '#92400e',
    '#451a03',
]

const danger: MantineColorsTuple = [
    '#fef2f2',
    '#fee2e2',
    '#fecaca',
    '#fca5a5',
    '#f87171',
    '#ef4444',
    '#dc2626',
    '#b91c1c',
    '#991b1b',
    '#450a0a',
]

const accent: MantineColorsTuple = [
    '#eef2ff',
    '#e0e7ff',
    '#c7d2fe',
    '#a5b4fc',
    '#818cf8',
    '#6366f1',
    '#4f46e5',
    '#4338ca',
    '#3730a3',
    '#1e1b4b',
]

const neutral: MantineColorsTuple = [
    '#f9fafb',
    '#f3f4f6',
    '#e5e7eb',
    '#d1d5db',
    '#9ca3af',
    '#6b7280',
    '#4b5563',
    '#374151',
    '#1f2937',
    '#111827',
]

export const mantineTheme = createTheme({
    primaryColor: 'action',
    primaryShade: { light: 6, dark: 5 },
    defaultRadius: 'lg',
    cursorType: 'pointer',
    fontFamily:
        'Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
    headings: {
        fontFamily:
            'Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
        fontWeight: '700',
    },
    colors: {
        action,
        accent,
        success,
        warning,
        danger,
        neutral,
    },
    black: '#0f0f11',
    white: '#ffffff',
    fontSizes: {
        xs: '0.6875rem',
        sm: '0.8125rem',
        md: '0.875rem',
        lg: '1rem',
        xl: '1.125rem',
    },
    spacing: {
        xs: '0.5rem',
        sm: '0.75rem',
        md: '1rem',
        lg: '1.25rem',
        xl: '1.5rem',
    },
    radius: {
        xs: '0.25rem',
        sm: '0.5rem',
        md: '0.625rem',
        lg: '0.75rem',
        xl: '1rem',
    },
    shadows: {
        xs: '0 1px 2px rgb(15 23 42 / 0.06)',
        sm: '0 8px 24px rgb(15 23 42 / 0.1)',
        md: '0 18px 44px rgb(15 23 42 / 0.12)',
        lg: '0 24px 70px rgb(15 23 42 / 0.14)',
        xl: '0 30px 80px rgb(0 0 0 / 0.28)',
    },
    components: {
        ActionIcon: ActionIcon.extend({
            defaultProps: {
                radius: 'lg',
                variant: 'subtle',
                color: 'neutral',
            },
        }),
        Badge: Badge.extend({
            defaultProps: {
                color: 'neutral',
                radius: 'sm',
                size: 'xs',
                variant: 'light',
            },
            styles: {
                root: {
                    borderWidth: 1,
                    fontWeight: 800,
                    letterSpacing: '0.06em',
                    textTransform: 'uppercase',
                },
            },
        }),
        Button: Button.extend({
            defaultProps: {
                radius: 'lg',
                size: 'sm',
            },
            styles: {
                root: {
                    fontWeight: 800,
                },
                label: {
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '0.625rem',
                },
            },
        }),
        Card: Card.extend({
            defaultProps: {
                withBorder: true,
                radius: 'xl',
                padding: 'md',
            },
            styles: {
                root: {
                    backgroundColor: 'var(--mantine-color-default)',
                    borderColor: 'var(--mantine-color-default-border)',
                    color: 'var(--mantine-color-text)',
                },
            },
        }),
        Checkbox: Checkbox.extend({
            defaultProps: {
                color: 'action',
                radius: 'sm',
            },
        }),
        Modal: Modal.extend({
            defaultProps: {
                centered: true,
                radius: 'xl',
                overlayProps: {
                    backgroundOpacity: 0.7,
                    blur: 3,
                },
            },
            styles: {
                content: {
                    border: '1px solid var(--mantine-color-default-border)',
                    backgroundColor: 'var(--mantine-color-default)',
                    color: 'var(--mantine-color-text)',
                },
                header: {
                    backgroundColor: 'var(--mantine-color-default)',
                    color: 'var(--mantine-color-text)',
                },
                title: {
                    color: 'var(--mantine-color-text)',
                    fontSize: '1.125rem',
                    fontWeight: 700,
                },
                body: {
                    color: 'var(--mantine-color-text)',
                },
                close: {
                    color: 'var(--mantine-color-dimmed)',
                },
            },
        }),
        NativeSelect: NativeSelect.extend({
            defaultProps: {
                radius: 'lg',
            },
        }),
        Notification: Notification.extend({
            defaultProps: {
                radius: 'lg',
                withBorder: true,
            },
            styles: {
                root: {
                    backgroundColor: 'var(--mantine-color-default)',
                    borderColor: 'var(--mantine-color-default-border)',
                    boxShadow: 'var(--vf-shadow-panel)',
                    color: 'var(--mantine-color-text)',
                },
                title: {
                    color: 'var(--mantine-color-text)',
                    fontWeight: 800,
                },
                description: {
                    color: 'var(--mantine-color-dimmed)',
                },
                closeButton: {
                    color: 'var(--mantine-color-dimmed)',
                },
            },
        }),
        NumberInput: NumberInput.extend({
            defaultProps: {
                radius: 'lg',
            },
        }),
        Paper: Paper.extend({
            defaultProps: {
                radius: 'xl',
                withBorder: true,
            },
            styles: {
                root: {
                    backgroundColor: 'var(--mantine-color-default)',
                    borderColor: 'var(--mantine-color-default-border)',
                    color: 'var(--mantine-color-text)',
                },
            },
        }),
        TextInput: TextInput.extend({
            defaultProps: {
                radius: 'lg',
            },
        }),
        Tooltip: Tooltip.extend({
            defaultProps: {
                withArrow: true,
                withinPortal: true,
            },
            styles: {
                tooltip: {
                    backgroundColor: 'var(--mantine-color-default)',
                    border: '1px solid var(--mantine-color-default-border)',
                    boxShadow: 'var(--vf-shadow-panel)',
                    color: 'var(--mantine-color-dimmed)',
                },
                arrow: {
                    backgroundColor: 'var(--mantine-color-default)',
                    borderColor: 'var(--mantine-color-default-border)',
                },
            },
        }),
    },
})

export const mantineCssVariablesResolver: CSSVariablesResolver = () => ({
    variables: {},
    light: {
        '--mantine-color-body': '#f4f5f7',
        '--mantine-color-text': '#111827',
        '--mantine-color-dimmed': '#6b7280',
        '--mantine-color-default': '#ffffff',
        '--mantine-color-default-hover': '#f9fafb',
        '--mantine-color-default-color': '#111827',
        '--mantine-color-default-border': '#e5e7eb',
        '--vf-bg-elevated': '#f4f5f7',
        '--vf-surface-2': '#f9fafb',
        '--vf-surface-3': '#f4f5f7',
        '--vf-action-soft': 'rgb(37 99 235 / 0.1)',
        '--vf-action-border': 'rgb(37 99 235 / 0.22)',
        '--vf-action-text': '#2563eb',
        '--vf-success-soft': 'rgb(22 163 74 / 0.1)',
        '--vf-success-border': 'rgb(22 163 74 / 0.18)',
        '--vf-success-text': '#16a34a',
        '--vf-warning-soft': 'rgb(217 119 6 / 0.12)',
        '--vf-warning-border': 'rgb(217 119 6 / 0.24)',
        '--vf-warning-text': '#d97706',
        '--vf-danger-soft': 'rgb(220 38 38 / 0.1)',
        '--vf-danger-border': 'rgb(220 38 38 / 0.18)',
        '--vf-danger-text': '#dc2626',
        '--vf-accent-soft': 'rgb(124 58 237 / 0.1)',
        '--vf-accent-border': 'rgb(124 58 237 / 0.22)',
        '--vf-brand-mark': '#111827',
        '--vf-brand-mark-text': '#ffffff',
        '--vf-focus-ring': 'rgb(37 99 235 / 0.14)',
        '--vf-shadow-card': '0 1px 2px rgb(15 23 42 / 0.06)',
        '--vf-shadow-panel': '0 24px 70px rgb(15 23 42 / 0.14)',
    },
    dark: {
        '--mantine-color-body': '#0f0f11',
        '--mantine-color-text': '#f2f2f3',
        '--mantine-color-dimmed': '#9a9aa6',
        '--mantine-color-default': '#1a1a1e',
        '--mantine-color-default-hover': '#242428',
        '--mantine-color-default-color': '#f2f2f3',
        '--mantine-color-default-border': '#2e2e34',
        '--vf-bg-elevated': '#18181c',
        '--vf-surface-2': '#242428',
        '--vf-surface-3': '#2e2e34',
        '--vf-action-soft': 'rgb(79 142 247 / 0.15)',
        '--vf-action-border': 'rgb(79 142 247 / 0.3)',
        '--vf-action-text': '#7fb0ff',
        '--vf-success-soft': 'rgb(52 211 153 / 0.14)',
        '--vf-success-border': 'rgb(52 211 153 / 0.28)',
        '--vf-success-text': '#6ee7b7',
        '--vf-warning-soft': 'rgb(245 158 11 / 0.14)',
        '--vf-warning-border': 'rgb(245 158 11 / 0.3)',
        '--vf-warning-text': '#fbbf24',
        '--vf-danger-soft': 'rgb(239 68 68 / 0.14)',
        '--vf-danger-border': 'rgb(239 68 68 / 0.3)',
        '--vf-danger-text': '#f87171',
        '--vf-accent-soft': 'rgb(168 85 247 / 0.16)',
        '--vf-accent-border': 'rgb(168 85 247 / 0.3)',
        '--vf-brand-mark': '#ffffff',
        '--vf-brand-mark-text': '#0f0f11',
        '--vf-focus-ring': 'rgb(79 142 247 / 0.18)',
        '--vf-shadow-card': 'none',
        '--vf-shadow-panel': '0 30px 80px rgb(0 0 0 / 0.35)',
    },
})
