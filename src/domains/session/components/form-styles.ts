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
