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
    '#eef6ff',
    '#d8eaff',
    '#afd3ff',
    '#7eb7ff',
    '#559df7',
    '#2f83ee',
    '#1769d6',
    '#1253ad',
    '#123f82',
    '#0c2854',
]

const success: MantineColorsTuple = [
    '#eefbf3',
    '#d9f5e3',
    '#b4eac9',
    '#87dca9',
    '#5acb87',
    '#33b86a',
    '#249653',
    '#1f7544',
    '#1b5b38',
    '#0d301e',
]

const warning: MantineColorsTuple = [
    '#fff8e8',
    '#ffedc2',
    '#fed98a',
    '#f6bf4c',
    '#e8a21f',
    '#cf8311',
    '#a9650c',
    '#854d0e',
    '#683d12',
    '#381f07',
]

const danger: MantineColorsTuple = [
    '#fff0f1',
    '#ffdfe2',
    '#ffc1c8',
    '#ff97a3',
    '#f7687a',
    '#e43f55',
    '#c72b41',
    '#9f2134',
    '#7f1d2d',
    '#460b14',
]

const accent: MantineColorsTuple = [
    '#f4efff',
    '#e8dcff',
    '#d0b9ff',
    '#b38dff',
    '#9864f1',
    '#7f43d2',
    '#6931ad',
    '#542887',
    '#432169',
    '#27113e',
]

const neutral: MantineColorsTuple = [
    '#f8faf8',
    '#eef2ef',
    '#dce3df',
    '#c4cec8',
    '#96a49d',
    '#6c7972',
    '#4d5852',
    '#343d38',
    '#202723',
    '#111512',
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
        xs: '0.375rem',
        sm: '0.625rem',
        md: '0.875rem',
        lg: '1.125rem',
        xl: '1.375rem',
    },
    radius: {
        xs: '0.1875rem',
        sm: '0.375rem',
        md: '0.5rem',
        lg: '0.625rem',
        xl: '0.75rem',
    },
    shadows: {
        xs: '0 1px 1px rgb(17 21 18 / 0.05)',
        sm: '0 4px 14px rgb(17 21 18 / 0.08)',
        md: '0 14px 34px rgb(17 21 18 / 0.11)',
        lg: '0 24px 54px rgb(17 21 18 / 0.14)',
        xl: '0 30px 80px rgb(0 0 0 / 0.32)',
    },
    components: {
        ActionIcon: ActionIcon.extend({
            defaultProps: {
                radius: 'md',
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
                    letterSpacing: '0.03em',
                    textTransform: 'uppercase',
                },
            },
        }),
        Button: Button.extend({
            defaultProps: {
                radius: 'md',
                size: 'sm',
            },
            styles: {
                root: {
                    fontWeight: 800,
                    minHeight: '2.25rem',
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
                radius: 'lg',
                padding: 'sm',
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
                radius: 'lg',
                overlayProps: {
                    backgroundOpacity: 0.76,
                    blur: 2,
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
                    fontSize: '1rem',
                    fontWeight: 800,
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
                radius: 'md',
            },
        }),
        Notification: Notification.extend({
            defaultProps: {
                radius: 'md',
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
                radius: 'md',
            },
        }),
        Paper: Paper.extend({
            defaultProps: {
                radius: 'lg',
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
                radius: 'md',
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
        '--mantine-color-body': '#f3f5f2',
        '--mantine-color-text': '#111512',
        '--mantine-color-dimmed': '#647068',
        '--mantine-color-default': '#ffffff',
        '--mantine-color-default-hover': '#f7faf7',
        '--mantine-color-default-color': '#111512',
        '--mantine-color-default-border': '#d9e1dc',
        '--vf-bg-elevated': '#edf1ee',
        '--vf-surface-2': '#f7faf7',
        '--vf-surface-3': '#edf1ee',
        '--vf-surface-inset': '#e7ece8',
        '--vf-action-soft': 'rgb(23 105 214 / 0.1)',
        '--vf-action-border': 'rgb(23 105 214 / 0.24)',
        '--vf-action-text': '#1769d6',
        '--vf-success-soft': 'rgb(36 150 83 / 0.11)',
        '--vf-success-border': 'rgb(36 150 83 / 0.24)',
        '--vf-success-text': '#1f7544',
        '--vf-warning-soft': 'rgb(207 131 17 / 0.13)',
        '--vf-warning-border': 'rgb(207 131 17 / 0.28)',
        '--vf-warning-text': '#a9650c',
        '--vf-danger-soft': 'rgb(199 43 65 / 0.1)',
        '--vf-danger-border': 'rgb(199 43 65 / 0.22)',
        '--vf-danger-text': '#c72b41',
        '--vf-accent-soft': 'rgb(105 49 173 / 0.1)',
        '--vf-accent-border': 'rgb(105 49 173 / 0.22)',
        '--vf-accent-text': '#6931ad',
        '--vf-brand-mark': '#111512',
        '--vf-brand-mark-text': '#ffffff',
        '--vf-focus-ring': 'rgb(23 105 214 / 0.18)',
        '--vf-focus-outline': '#1769d6',
        '--vf-shadow-card': '0 1px 2px rgb(17 21 18 / 0.06)',
        '--vf-shadow-panel': '0 22px 58px rgb(17 21 18 / 0.14)',
    },
    dark: {
        '--mantine-color-body': '#0b0e0c',
        '--mantine-color-text': '#f4f7f2',
        '--mantine-color-dimmed': '#9aa79f',
        '--mantine-color-default': '#141917',
        '--mantine-color-default-hover': '#1c2420',
        '--mantine-color-default-color': '#f4f7f2',
        '--mantine-color-default-border': '#2a3430',
        '--vf-bg-elevated': '#101512',
        '--vf-surface-2': '#1b211e',
        '--vf-surface-3': '#25302b',
        '--vf-surface-inset': '#0f1412',
        '--vf-action-soft': 'rgb(85 157 247 / 0.16)',
        '--vf-action-border': 'rgb(85 157 247 / 0.34)',
        '--vf-action-text': '#7eb7ff',
        '--vf-success-soft': 'rgb(90 203 135 / 0.14)',
        '--vf-success-border': 'rgb(90 203 135 / 0.28)',
        '--vf-success-text': '#87dca9',
        '--vf-warning-soft': 'rgb(246 191 76 / 0.14)',
        '--vf-warning-border': 'rgb(246 191 76 / 0.32)',
        '--vf-warning-text': '#fed98a',
        '--vf-danger-soft': 'rgb(247 104 122 / 0.14)',
        '--vf-danger-border': 'rgb(247 104 122 / 0.32)',
        '--vf-danger-text': '#ff97a3',
        '--vf-accent-soft': 'rgb(179 141 255 / 0.15)',
        '--vf-accent-border': 'rgb(179 141 255 / 0.32)',
        '--vf-accent-text': '#d0b9ff',
        '--vf-brand-mark': '#f4f7f2',
        '--vf-brand-mark-text': '#0b0e0c',
        '--vf-focus-ring': 'rgb(85 157 247 / 0.22)',
        '--vf-focus-outline': '#7eb7ff',
        '--vf-shadow-card': 'none',
        '--vf-shadow-panel': '0 30px 80px rgb(0 0 0 / 0.38)',
    },
})
