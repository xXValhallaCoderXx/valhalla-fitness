import {
    ActionIcon,
    Badge,
    Button,
    Card,
    Checkbox,
    Menu,
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
import { palettes, radius, semanticColors, spacing, typography } from '@sheetless/tokens'

const action: MantineColorsTuple = [...palettes.action]
const success: MantineColorsTuple = [...palettes.success]
const warning: MantineColorsTuple = [...palettes.warning]
const danger: MantineColorsTuple = [...palettes.danger]
const accent: MantineColorsTuple = [...palettes.accent]
const neutral: MantineColorsTuple = [...palettes.neutral]
const rem = (pixels: number) => `${pixels / 16}rem`

export const mantineTheme = createTheme({
    primaryColor: 'action',
    primaryShade: { light: 6, dark: 5 },
    defaultRadius: 'md',
    cursorType: 'pointer',
    fontFamily: typography.fontFamily,
    headings: {
        fontFamily: typography.fontFamily,
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
    black: semanticColors.dark.background,
    white: semanticColors.light.surface,
    fontSizes: {
        xs: rem(typography.fontSize.xs),
        sm: rem(typography.fontSize.sm),
        md: rem(typography.fontSize.md),
        lg: rem(typography.fontSize.lg),
        xl: rem(typography.fontSize.xl),
    },
    spacing: {
        xs: rem(spacing.xs),
        sm: rem(spacing.sm),
        md: rem(spacing.md),
        lg: rem(spacing.lg),
        xl: rem(spacing.xl),
    },
    radius: {
        xs: rem(radius.xs),
        sm: rem(radius.sm),
        md: rem(radius.md),
        lg: rem(radius.lg),
        xl: rem(radius.xl),
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
                    borderColor: 'var(--vf-card-border)',
                    boxShadow: 'var(--vf-shadow-card)',
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
        Menu: Menu.extend({
            styles: {
                dropdown: {
                    // Dropdowns float over same-color surfaces; without a shadow they read as flush.
                    boxShadow: 'var(--vf-shadow-panel)',
                },
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
                    borderColor: 'var(--vf-card-border)',
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
        '--mantine-color-body': semanticColors.light.background,
        '--mantine-color-text': semanticColors.light.text,
        '--mantine-color-dimmed': semanticColors.light.mutedText,
        '--mantine-color-default': semanticColors.light.surface,
        '--mantine-color-default-hover': semanticColors.light.surfaceHover,
        '--mantine-color-default-color': semanticColors.light.text,
        '--mantine-color-default-border': semanticColors.light.border,
        '--vf-card-border': semanticColors.light.cardBorder,
        '--vf-bg-elevated': semanticColors.light.elevatedBackground,
        '--vf-surface-2': semanticColors.light.surface2,
        '--vf-surface-3': semanticColors.light.surface3,
        '--vf-surface-inset': semanticColors.light.inset,
        '--vf-action-soft': semanticColors.light.actionSoft,
        '--vf-action-border': semanticColors.light.actionBorder,
        '--vf-action-text': semanticColors.light.actionText,
        '--vf-success-soft': semanticColors.light.successSoft,
        '--vf-success-border': semanticColors.light.successBorder,
        '--vf-success-text': semanticColors.light.successText,
        '--vf-warning-soft': semanticColors.light.warningSoft,
        '--vf-warning-border': semanticColors.light.warningBorder,
        '--vf-warning-text': semanticColors.light.warningText,
        '--vf-danger-soft': semanticColors.light.dangerSoft,
        '--vf-danger-border': semanticColors.light.dangerBorder,
        '--vf-danger-text': semanticColors.light.dangerText,
        '--vf-accent-soft': semanticColors.light.accentSoft,
        '--vf-accent-border': semanticColors.light.accentBorder,
        '--vf-accent-text': semanticColors.light.accentText,
        '--vf-brand-mark': semanticColors.light.brandMark,
        '--vf-brand-mark-text': semanticColors.light.brandMarkText,
        '--vf-focus-ring': semanticColors.light.focusRing,
        '--vf-focus-outline': semanticColors.light.focusOutline,
        '--vf-shadow-card': '0 1px 2px rgb(8 17 20 / 0.05), 0 8px 24px -6px rgb(8 17 20 / 0.1)',
        '--vf-shadow-card-raised': '0 2px 4px rgb(8 17 20 / 0.06), 0 16px 40px -8px rgb(8 17 20 / 0.16)',
        '--vf-shadow-panel': '0 22px 58px rgb(8 17 20 / 0.14)',
    },
    dark: {
        '--mantine-color-body': semanticColors.dark.background,
        '--mantine-color-text': semanticColors.dark.text,
        '--mantine-color-dimmed': semanticColors.dark.mutedText,
        '--mantine-color-default': semanticColors.dark.surface,
        '--mantine-color-default-hover': semanticColors.dark.surfaceHover,
        '--mantine-color-default-color': semanticColors.dark.text,
        '--mantine-color-default-border': semanticColors.dark.border,
        '--vf-card-border': semanticColors.dark.cardBorder,
        '--vf-bg-elevated': semanticColors.dark.elevatedBackground,
        '--vf-surface-2': semanticColors.dark.surface2,
        '--vf-surface-3': semanticColors.dark.surface3,
        '--vf-surface-inset': semanticColors.dark.inset,
        '--vf-action-soft': semanticColors.dark.actionSoft,
        '--vf-action-border': semanticColors.dark.actionBorder,
        '--vf-action-text': semanticColors.dark.actionText,
        '--vf-success-soft': semanticColors.dark.successSoft,
        '--vf-success-border': semanticColors.dark.successBorder,
        '--vf-success-text': semanticColors.dark.successText,
        '--vf-warning-soft': semanticColors.dark.warningSoft,
        '--vf-warning-border': semanticColors.dark.warningBorder,
        '--vf-warning-text': semanticColors.dark.warningText,
        '--vf-danger-soft': semanticColors.dark.dangerSoft,
        '--vf-danger-border': semanticColors.dark.dangerBorder,
        '--vf-danger-text': semanticColors.dark.dangerText,
        '--vf-accent-soft': semanticColors.dark.accentSoft,
        '--vf-accent-border': semanticColors.dark.accentBorder,
        '--vf-accent-text': semanticColors.dark.accentText,
        '--vf-brand-mark': semanticColors.dark.brandMark,
        '--vf-brand-mark-text': semanticColors.dark.brandMarkText,
        '--vf-focus-ring': semanticColors.dark.focusRing,
        '--vf-focus-outline': semanticColors.dark.focusOutline,
        '--vf-shadow-card': '0 1px 2px rgb(0 0 0 / 0.4), 0 10px 30px -8px rgb(0 0 0 / 0.55)',
        '--vf-shadow-card-raised': '0 2px 4px rgb(0 0 0 / 0.4), 0 18px 44px -10px rgb(0 0 0 / 0.55)',
        '--vf-shadow-panel': '0 30px 80px rgb(0 0 0 / 0.38)',
    },
})
