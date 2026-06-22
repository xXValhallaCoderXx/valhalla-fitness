import { Modal } from '@mantine/core'
import type { ReactNode } from 'react'
import { Button, type ButtonVariant } from '~/components/atoms'

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
    confirmVariant?: ButtonVariant
    isPending?: boolean
    onConfirm: () => void
    onCancel: () => void
}) {
    const close = () => {
        if (!isPending) onCancel()
    }

    return (
        <Modal
            opened={open}
            onClose={close}
            title={title}
            closeOnClickOutside={!isPending}
            closeOnEscape={!isPending}
            withCloseButton={!isPending}
            classNames={{
                content: '!border !border-[var(--border)] !bg-[var(--surface)] !text-[var(--text)]',
                header: '!bg-[var(--surface)] !text-[var(--text)]',
                title: 'text-lg font-bold !text-[var(--text)]',
                body: 'space-y-4 !text-[var(--text)]',
                close: '!text-[var(--muted)] hover:!bg-[var(--surface-2)] hover:!text-[var(--text)]',
            }}
        >
            <div className="text-sm text-[var(--muted)]">{children}</div>
            <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
                <Button variant="secondary" disabled={isPending} onClick={onCancel}>
                    {cancelLabel}
                </Button>
                <Button variant={confirmVariant} disabled={isPending} onClick={onConfirm}>
                    {isPending ? 'Starting…' : confirmLabel}
                </Button>
            </div>
        </Modal>
    )
}
