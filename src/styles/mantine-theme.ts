import { createTheme, type MantineColorsTuple } from '@mantine/core'

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
    components: {
        Button: {
            defaultProps: {
                radius: 'lg',
                size: 'sm',
            },
        },
        Badge: {
            defaultProps: {
                radius: 'sm',
                size: 'xs',
                variant: 'light',
            },
        },
        Card: {
            defaultProps: {
                radius: 'xl',
                padding: 'md',
            },
        },
        TextInput: {
            defaultProps: {
                radius: 'xl',
            },
        },
        Modal: {
            defaultProps: {
                centered: true,
                radius: 'xl',
                overlayProps: {
                    backgroundOpacity: 0.7,
                    blur: 3,
                },
            },
        },
    },
})
