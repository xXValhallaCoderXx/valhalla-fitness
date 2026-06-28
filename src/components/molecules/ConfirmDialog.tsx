import { Button, Modal, Text, type ButtonProps } from '@mantine/core'
import { AlertTriangle, Info } from 'lucide-react'
import type { ReactNode } from 'react'

type ConfirmVariant = 'primary' | 'danger' | 'success'
type ConfirmTone = 'warning' | 'danger' | 'info'

export function ConfirmDialog({
    open,
    title,
    children,
    confirmLabel = 'Confirm',
    cancelLabel = 'Cancel',
    confirmVariant = 'primary',
    tone,
    isPending = false,
    onConfirm,
    onCancel,
}: {
    open: boolean
    title: string
    children: ReactNode
    confirmLabel?: string
    cancelLabel?: string
    confirmVariant?: ConfirmVariant
    /** Adds a coloured alert icon beside the title so cautionary dialogs read as warnings. */
    tone?: ConfirmTone
    isPending?: boolean
    onConfirm: () => void
    onCancel: () => void
}) {
    const close = () => {
        if (!isPending) onCancel()
    }
    const confirmButtonProps = getConfirmButtonProps(confirmVariant)
    const toneStyles = tone ? getToneStyles(tone) : null

    const titleNode = toneStyles ? (
        <div className="flex items-center gap-2.5">
            <span
                className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full"
                style={{ backgroundColor: toneStyles.soft, color: toneStyles.text }}
                aria-hidden="true"
            >
                {toneStyles.icon}
            </span>
            <span>{title}</span>
        </div>
    ) : (
        title
    )

    return (
        <Modal
            opened={open}
            onClose={close}
            title={titleNode}
            closeOnClickOutside={!isPending}
            closeOnEscape={!isPending}
            withCloseButton={!isPending}
        >
            <Text component="div" size="sm" c="dimmed" lh={1.55}>
                {children}
            </Text>
            <div className="mt-7 flex flex-col-reverse gap-2.5 sm:flex-row sm:justify-end">
                <Button variant="default" size="md" px="lg" disabled={isPending} onClick={onCancel}>
                    {cancelLabel}
                </Button>
                <Button {...confirmButtonProps} size="md" px="lg" disabled={isPending} onClick={onConfirm}>
                    {isPending ? 'Working...' : confirmLabel}
                </Button>
            </div>
        </Modal>
    )
}

function getConfirmButtonProps(variant: ConfirmVariant): Pick<ButtonProps, 'color' | 'variant'> {
    if (variant === 'danger') return { color: 'danger', variant: 'light' }
    if (variant === 'success') return { color: 'success', variant: 'light' }
    return { color: 'action', variant: 'filled' }
}

function getToneStyles(tone: ConfirmTone): { soft: string; text: string; icon: ReactNode } {
    if (tone === 'danger') {
        return { soft: 'var(--vf-danger-soft)', text: 'var(--vf-danger-text)', icon: <AlertTriangle size={18} /> }
    }
    if (tone === 'info') {
        return { soft: 'var(--vf-action-soft)', text: 'var(--vf-action-text)', icon: <Info size={18} /> }
    }
    return { soft: 'var(--vf-warning-soft)', text: 'var(--vf-warning-text)', icon: <AlertTriangle size={18} /> }
}
