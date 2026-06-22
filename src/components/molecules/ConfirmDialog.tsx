import { Button, Modal, Text, type ButtonProps } from '@mantine/core'
import type { ReactNode } from 'react'

type ConfirmVariant = 'primary' | 'danger' | 'success'

export function ConfirmDialog({
    open,
    title,
    children,
    confirmLabel = 'Confirm',
    cancelLabel = 'Cancel',
    confirmVariant = 'primary',
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
    isPending?: boolean
    onConfirm: () => void
    onCancel: () => void
}) {
    const close = () => {
        if (!isPending) onCancel()
    }
    const confirmButtonProps = getConfirmButtonProps(confirmVariant)

    return (
        <Modal
            opened={open}
            onClose={close}
            title={title}
            closeOnClickOutside={!isPending}
            closeOnEscape={!isPending}
            withCloseButton={!isPending}
        >
            <div className="space-y-4">
                <Text component="div" size="sm" c="dimmed">
                    {children}
                </Text>
                <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
                    <Button variant="default" disabled={isPending} onClick={onCancel}>
                        {cancelLabel}
                    </Button>
                    <Button {...confirmButtonProps} disabled={isPending} onClick={onConfirm}>
                        {isPending ? 'Starting…' : confirmLabel}
                    </Button>
                </div>
            </div>
        </Modal>
    )
}

function getConfirmButtonProps(variant: ConfirmVariant): Pick<ButtonProps, 'color' | 'variant'> {
    if (variant === 'danger') return { color: 'danger', variant: 'light' }
    if (variant === 'success') return { color: 'success', variant: 'light' }
    return { color: 'action', variant: 'filled' }
}
