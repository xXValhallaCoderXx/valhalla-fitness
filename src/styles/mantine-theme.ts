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
    '#ecf8fb',
    '#d6eef5',
    '#aeddea',
    '#7fc8dc',
    '#54b0c9',
    '#2f98b3',
    '#197f9a',
    '#12657b',
    '#104e60',
    '#083440',
]

const success: MantineColorsTuple = [
    '#f0f8ee',
    '#dcefd6',
    '#bddfb1',
    '#9aca8a',
    '#77b262',
    '#5c9849',
    '#477a39',
    '#385f2f',
    '#2d4c28',
    '#182a15',
]

const warning: MantineColorsTuple = [
    '#fff8ea',
    '#f7ebc7',
    '#ecd697',
    '#dfbe62',
    '#c99e34',
    '#a97e23',
    '#86611d',
    '#694b1b',
    '#523b18',
    '#2f200b',
]

const danger: MantineColorsTuple = [
    '#fff1f3',
    '#f8dce1',
    '#ecb7c1',
    '#db8898',
    '#c75d72',
    '#ad3b53',
    '#8d2d43',
    '#6f2436',
    '#571d2b',
    '#321018',
]

const accent: MantineColorsTuple = [
    '#f5f2fb',
    '#e6ddf3',
    '#cfc0e5',
    '#b49bd4',
    '#9877be',
    '#7d5ca3',
    '#654983',
    '#503a68',
    '#3d2e50',
    '#241b31',
]

const neutral: MantineColorsTuple = [
    '#f8fafc',
    '#edf2f4',
    '#dbe3e6',
    '#c2cdd2',
    '#93a0a6',
    '#68777e',
    '#4c5960',
    '#343f45',
    '#202a30',
    '#10171b',
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
    black: '#081114',
    white: '#fbfdfc',
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
        xs: '0 1px 1px rgb(8 17 20 / 0.05)',
        sm: '0 4px 14px rgb(8 17 20 / 0.08)',
        md: '0 14px 34px rgb(8 17 20 / 0.11)',
        lg: '0 24px 54px rgb(8 17 20 / 0.14)',
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
        '--mantine-color-body': '#f2f6f7',
        '--mantine-color-text': '#152027',
        '--mantine-color-dimmed': '#60707a',
        '--mantine-color-default': '#fbfdfc',
        '--mantine-color-default-hover': '#f5f9fa',
        '--mantine-color-default-color': '#152027',
        '--mantine-color-default-border': '#d5e0e3',
        '--vf-bg-elevated': '#eaf1f3',
        '--vf-surface-2': '#f6faf9',
        '--vf-surface-3': '#edf4f5',
        '--vf-surface-inset': '#e1ebee',
        '--vf-action-soft': 'rgb(25 127 154 / 0.1)',
        '--vf-action-border': 'rgb(25 127 154 / 0.26)',
        '--vf-action-text': '#12657b',
        '--vf-success-soft': 'rgb(71 122 57 / 0.11)',
        '--vf-success-border': 'rgb(71 122 57 / 0.25)',
        '--vf-success-text': '#385f2f',
        '--vf-warning-soft': 'rgb(134 97 29 / 0.13)',
        '--vf-warning-border': 'rgb(134 97 29 / 0.29)',
        '--vf-warning-text': '#694b1b',
        '--vf-danger-soft': 'rgb(141 45 67 / 0.1)',
        '--vf-danger-border': 'rgb(141 45 67 / 0.24)',
        '--vf-danger-text': '#8d2d43',
        '--vf-accent-soft': 'rgb(101 73 131 / 0.1)',
        '--vf-accent-border': 'rgb(101 73 131 / 0.24)',
        '--vf-accent-text': '#654983',
        '--vf-brand-mark': '#10232c',
        '--vf-brand-mark-text': '#fbfdfc',
        '--vf-focus-ring': 'rgb(25 127 154 / 0.2)',
        '--vf-focus-outline': '#197f9a',
        '--vf-shadow-card': '0 1px 2px rgb(8 17 20 / 0.06)',
        '--vf-shadow-panel': '0 22px 58px rgb(8 17 20 / 0.14)',
    },
    dark: {
        '--mantine-color-body': '#081114',
        '--mantine-color-text': '#eef7f6',
        '--mantine-color-dimmed': '#98abb0',
        '--mantine-color-default': '#101b20',
        '--mantine-color-default-hover': '#17252b',
        '--mantine-color-default-color': '#eef7f6',
        '--mantine-color-default-border': '#2a3a40',
        '--vf-bg-elevated': '#0c171b',
        '--vf-surface-2': '#162328',
        '--vf-surface-3': '#203139',
        '--vf-surface-inset': '#091317',
        '--vf-action-soft': 'rgb(84 176 201 / 0.17)',
        '--vf-action-border': 'rgb(84 176 201 / 0.36)',
        '--vf-action-text': '#7fc8dc',
        '--vf-success-soft': 'rgb(154 202 138 / 0.14)',
        '--vf-success-border': 'rgb(154 202 138 / 0.3)',
        '--vf-success-text': '#9aca8a',
        '--vf-warning-soft': 'rgb(223 190 98 / 0.14)',
        '--vf-warning-border': 'rgb(223 190 98 / 0.32)',
        '--vf-warning-text': '#dfbe62',
        '--vf-danger-soft': 'rgb(219 136 152 / 0.14)',
        '--vf-danger-border': 'rgb(219 136 152 / 0.32)',
        '--vf-danger-text': '#db8898',
        '--vf-accent-soft': 'rgb(180 155 212 / 0.15)',
        '--vf-accent-border': 'rgb(180 155 212 / 0.33)',
        '--vf-accent-text': '#b49bd4',
        '--vf-brand-mark': '#d6eef5',
        '--vf-brand-mark-text': '#081114',
        '--vf-focus-ring': 'rgb(127 200 220 / 0.23)',
        '--vf-focus-outline': '#7fc8dc',
        '--vf-shadow-card': 'none',
        '--vf-shadow-panel': '0 30px 80px rgb(0 0 0 / 0.38)',
    },
})
