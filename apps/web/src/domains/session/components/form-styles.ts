export const defaultFieldStyles = {
  label: {
    color: 'var(--mantine-color-dimmed)',
    fontSize: 'var(--mantine-font-size-xs)',
    fontWeight: 700,
  },
  input: {
    borderColor: 'var(--mantine-color-default-border)',
    backgroundColor: 'var(--mantine-color-default)',
    color: 'var(--mantine-color-text)',
  },
}

export const insetFieldStyles = {
  input: {
    borderColor: 'var(--mantine-color-default-border)',
    backgroundColor: 'var(--vf-surface-2)',
    color: 'var(--mantine-color-text)',
  },
}

export const defaultSelectStyles = {
  ...defaultFieldStyles,
  dropdown: {
    borderColor: 'var(--mantine-color-default-border)',
    backgroundColor: 'var(--mantine-color-default)',
  },
  option: {
    color: 'var(--mantine-color-text)',
  },
}

export const movementSwapModalClassNames = {
  inner: '!items-end !p-0 sm:!items-center sm:!p-4',
  content: '!mb-0 !max-h-[92dvh] !w-full !overflow-hidden !rounded-b-none sm:!mb-auto sm:!max-w-[60rem] sm:!rounded-2xl',
  body: '!max-h-[calc(92dvh-4rem)] !overflow-y-auto',
}

export const movementSwapModalStyles = {
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
    fontSize: 'var(--mantine-font-size-lg)',
    fontWeight: 700,
  },
  body: {
    color: 'var(--mantine-color-text)',
  },
  close: {
    color: 'var(--mantine-color-dimmed)',
  },
}

export const movementSwapScopeCheckboxStyles = {
  label: {
    color: 'var(--mantine-color-text)',
    fontSize: 'var(--mantine-font-size-sm)',
    fontWeight: 600,
  },
  input: {
    borderColor: 'var(--mantine-color-default-border)',
  },
}
