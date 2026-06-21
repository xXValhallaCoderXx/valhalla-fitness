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
    defaultRadius: 'md',
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
        success,
        warning,
        danger,
        neutral,
    },
    components: {
        Button: {
            defaultProps: {
                radius: 'md',
                size: 'sm',
            },
        },
        Card: {
            defaultProps: {
                radius: 'md',
                padding: 'md',
            },
        },
        TextInput: {
            defaultProps: {
                radius: 'md',
            },
        },
        Modal: {
            defaultProps: {
                centered: true,
                radius: 'md',
                overlayProps: {
                    backgroundOpacity: 0.7,
                },
            },
        },
    },
})
