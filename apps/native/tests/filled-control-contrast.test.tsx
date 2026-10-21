import { fireEvent, render, screen } from '@testing-library/react'
import type { ComponentProps, PropsWithChildren, ReactNode } from 'react'
import type { AccessibilityState, ViewStyle } from 'react-native'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { themeProviderMock } from './support/theme'

const state = vi.hoisted(() => ({
  scheme: 'light' as 'light' | 'dark',
  pressed: false,
  styles: new Map<string, unknown>(),
  controls: new Map<string, { accessibilityState?: AccessibilityState }>(),
}))
vi.mock('@/lib/theme-provider', () => ({
  useSheetlessTheme: () => themeProviderMock(state.scheme).useSheetlessTheme(),
}))
vi.mock('react-native', async importOriginal => {
  const native = await importOriginal<typeof import('react-native')>()
  return {
    ...native,
    // Resolve the real primitive's callback for each interaction state. This does
    // not pretend that jsdom can prove native press perception or layout.
    Pressable: ({ style, ...props }: ComponentProps<typeof native.Pressable>) => {
      const resolved = typeof style === 'function' ? style({ pressed: state.pressed, hovered: false }) : style
      const key = props.testID ?? props.accessibilityLabel
      if (key) {
        state.styles.set(key, resolved)
        state.controls.set(key, props)
      }
      return <native.Pressable {...props} style={resolved} />
    },
  }
})
vi.mock('lucide-react-native', () => ({
  Check: ({ color }: { color: string }) => <span data-testid="check" style={{ color }}>✓</span>,
}))
vi.mock('@/components', async () => ({
  ...await import('../src/components/Button'), ...await import('../src/components/Caption'),
  ...await import('../src/components/Panel'), ...await import('../src/components/SectionLabel'),
  ...await import('../src/components/Text'), ...await import('../src/components/TextInput'),
  SheetModal: ({ open, children, footer }: PropsWithChildren<{ open: boolean; footer?: ReactNode }>) => open ? <div>{children}{footer}</div> : null,
}))

import { Badge } from '../src/components/Badge'
import { Button } from '../src/components/Button'
import { SegmentedControl } from '../src/components/SegmentedControl'
import { themes, type ToneName } from '../src/lib/tokens'
import { FinishWorkoutSheet } from '../src/features/session/lifecycle/FinishWorkoutSheet'
import { EquipmentSection } from '../src/features/settings/preferences/EquipmentSection'

type RGB = [number, number, number]
const tones: ToneName[] = ['action', 'accent', 'success', 'warning', 'danger', 'neutral']

function rgb(color: string): RGB {
  if (/^#[\da-f]{6}$/i.test(color)) {
    return [1, 3, 5].map(index => parseInt(color.slice(index, index + 2), 16)) as RGB
  }
  const channels = color.match(/^rgb\((\d+),\s*(\d+),\s*(\d+)\)$/)
  if (!channels) throw new Error(`Expected an opaque colour, received ${color}`)
  return channels.slice(1).map(Number) as RGB
}

function composite(foreground: RGB, background: RGB, opacity: number): RGB {
  return foreground.map((channel, index) => channel * opacity + background[index] * (1 - opacity)) as RGB
}

function luminance(color: RGB) {
  return color.reduce((sum, channel, index) => {
    const value = channel / 255
    return sum + (value <= 0.04045 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4)
      * [0.2126, 0.7152, 0.0722][index]
  }, 0)
}

function contrast(foreground: string, fill: string, backdrop: string, opacity = 1) {
  const background = rgb(backdrop)
  const values = [foreground, fill].map(color => luminance(composite(rgb(color), background, opacity)))
  return (Math.max(...values) + 0.05) / (Math.min(...values) + 0.05)
}

function pressStyle(testID: string) {
  const flatten = (style: unknown): ViewStyle => {
    if (Array.isArray(style)) return Object.assign({}, ...style.map(flatten))
    if (!style) return {}
    if (typeof style !== 'object') throw new Error('Expected inline style objects')
    return style as ViewStyle
  }
  return flatten(state.styles.get(testID))
}

function expectReadable(text: HTMLElement, fill: string, opacity: ViewStyle['opacity'] = 1) {
  if (typeof opacity !== 'number') throw new Error('Expected a numeric control opacity')
  const color = getComputedStyle(text).color
  for (const backdrop of [themes[state.scheme].background, themes[state.scheme].surface]) {
    expect(contrast(color, fill, backdrop, opacity)).toBeGreaterThanOrEqual(4.5)
  }
}

beforeEach(() => {
  state.pressed = false
  state.styles.clear()
  state.controls.clear()
})

describe.each(['light', 'dark'] as const)('%s filled control contrast', scheme => {
  beforeEach(() => { state.scheme = scheme })

  it.each(tones)('keeps %s button text readable at rest and while pressed', tone => {
    const element = () => <Button label="Continue" tone={tone} testID="button" />
    const view = render(element())
    const theme = themes[scheme]
    const fill = tone === 'action' ? theme.primaryFill : theme.tones[tone].text
    for (const pressed of [false, true]) {
      state.pressed = pressed
      view.rerender(element())
      const style = pressStyle('button')
      expect(style.backgroundColor).toBe(fill)
      expect(style.opacity).toBe(1)
      expect(style.borderWidth).toBe(1)
      expect(style.borderColor).toBe(pressed ? theme.primaryFillText : 'transparent')
      expectReadable(screen.getByText('Continue'), String(style.backgroundColor), style.opacity)
    }
  })

  it('keeps filled badges readable without changing their existing primary fill', () => {
    const view = render(<Badge tone="action" variant="filled">Training</Badge>)
    const fill = getComputedStyle(view.container.firstElementChild as HTMLElement).backgroundColor
    expect(rgb(fill)).toEqual(rgb(themes[scheme].primaryFill))
    expectReadable(screen.getByText('Training'), fill)
  })

  it.each(['disabled', 'loading'] as const)('retains %s button semantics and inactive styling', inactive => {
    const onPress = vi.fn()
    state.pressed = true
    render(<Button label="Continue" disabled={inactive === 'disabled'} loading={inactive === 'loading'}
      tone="danger" testID="button" onPress={onPress} />)
    const button = screen.getByRole('button', { name: 'Continue' })
    expect(button.getAttribute('aria-disabled')).toBe('true')
    expect(state.controls.get('button')?.accessibilityState).toMatchObject({ disabled: true, busy: inactive === 'loading' })
    expect(pressStyle('button').opacity).toBe(0.55)
    expect(pressStyle('button').borderColor).toBe('transparent')
    fireEvent.click(button)
    expect(onPress).not.toHaveBeenCalled()
  })

  it.each(['light', 'default', 'subtle'] as const)('retains %s button press treatment', variant => {
    const element = () => <Button label="Continue" variant={variant} tone="danger" testID="button" />
    const view = render(element())
    const resting = pressStyle('button')
    const textColor = getComputedStyle(screen.getByText('Continue')).color
    state.pressed = true
    view.rerender(element())
    expect(pressStyle('button')).toMatchObject({
      backgroundColor: resting.backgroundColor,
      borderColor: resting.borderColor,
      borderWidth: resting.borderWidth,
      opacity: 0.85,
    })
    expect(getComputedStyle(screen.getByText('Continue')).color).toBe(textColor)
  })

  it.each(['tablist', 'radiogroup'] as const)('keeps selected %s segments readable with their selection state', role => {
    const onChange = vi.fn()
    const element = () => <SegmentedControl value="one" onChange={onChange} variant="segments"
      accessibilityRole={role} accessibilityLabel="Display"
      options={[{ value: 'one', label: 'Simple', testID: 'one' }, { value: 'two', label: 'Advanced', testID: 'two' }]} />
    const view = render(element())
    for (const pressed of [false, true]) {
      state.pressed = pressed
      view.rerender(element())
      const style = pressStyle('one')
      expect(style.backgroundColor).toBe(themes[scheme].primaryFill)
      expect(style.opacity).toBe(1)
      expect(style.borderWidth).toBe(1)
      expect(style.borderColor).toBe(pressed ? themes[scheme].primaryFillText : themes[scheme].primaryFill)
      expectReadable(screen.getByText('Simple'), String(style.backgroundColor), style.opacity)
    }
    const options = screen.getAllByRole(role === 'tablist' ? 'tab' : 'radio')
    const property = role === 'tablist' ? 'selected' : 'checked'
    expect(state.controls.get('one')?.accessibilityState?.[property]).toBe(true)
    expect(state.controls.get('two')?.accessibilityState?.[property]).toBe(false)
    expect(pressStyle('two').opacity).toBe(0.85)
    fireEvent.click(options[1])
    expect(onChange).toHaveBeenCalledExactlyOnceWith('two')
  })

  it('retains inset segment colours and press treatment', () => {
    const element = () => <SegmentedControl value="one" onChange={vi.fn()} variant="segments"
      appearance="inset" accessibilityLabel="Display" options={[{ value: 'one', label: 'Simple', testID: 'one' }]} />
    const view = render(element())
    const resting = pressStyle('one')
    const textColor = getComputedStyle(screen.getByText('Simple')).color
    state.pressed = true
    view.rerender(element())
    expect(pressStyle('one')).toMatchObject({ backgroundColor: resting.backgroundColor, borderColor: 'transparent', opacity: 0.85 })
    expect(getComputedStyle(screen.getByText('Simple')).color).toBe(textColor)
  })

  it.each(['group', 'option'] as const)('keeps %s-disabled segments inactive', disabled => {
    const onChange = vi.fn()
    state.pressed = true
    render(<SegmentedControl value="one" onChange={onChange} variant="segments"
      disabled={disabled === 'group'} accessibilityLabel="Display"
      options={[{ value: 'one', label: 'Simple', testID: 'one', disabled: disabled === 'option' }]} />)
    const option = screen.getByRole('tab', { name: 'Simple' })
    expect(option.getAttribute('aria-disabled')).toBe('true')
    expect(pressStyle('one')).toMatchObject({ opacity: 0.55, borderColor: themes[scheme].primaryFill })
    fireEvent.click(option)
    expect(onChange).not.toHaveBeenCalled()
  })

  it('keeps the selected Finish effort readable while pressing and retains the chosen effort', () => {
    const onFinish = vi.fn()
    const element = () => <FinishWorkoutSheet open completedSetCount={1} incompleteSetCount={0}
      isPending={false} onCancel={vi.fn()} onFinish={onFinish} />
    const view = render(element())
    fireEvent.click(screen.getByRole('button', { name: 'Effort 7 of 10' }))
    for (const pressed of [false, true]) {
      state.pressed = pressed
      view.rerender(element())
      const style = pressStyle('Effort 7 of 10')
      expect(style.opacity).toBe(1)
      expect(style.backgroundColor).toBe(themes[scheme].primaryFill)
      expect(style.borderColor).toBe(pressed ? themes[scheme].primaryFillText : themes[scheme].primaryFill)
      expectReadable(screen.getByText('7'), String(style.backgroundColor), style.opacity)
    }
    expect(pressStyle('Effort 6 of 10').opacity).toBe(0.8)
    fireEvent.click(screen.getByRole('button', { name: 'Finish workout' }))
    expect(onFinish).toHaveBeenCalledWith({ sessionRpe: 7, reflectionWin: null, reflectionImprove: null })
  })

  it('keeps selected equipment icons legible while pressing without changing toggle or disabled behavior', () => {
    const onToggle = vi.fn()
    const element = (disabled = false) => <EquipmentSection equipmentProfile={['barbell']} disabled={disabled} onToggle={onToggle} />
    const view = render(element())
    const checkbox = screen.getByRole('checkbox', { name: 'Barbell' })
    const check = screen.getByTestId('check')
    const fill = getComputedStyle(check.parentElement as HTMLElement).backgroundColor
    for (const pressed of [false, true]) {
      state.pressed = pressed
      view.rerender(element())
      const opacity = pressStyle('settings-equipment-barbell').opacity
      expect(opacity).toBe(1)
      expectReadable(screen.getByTestId('check'), fill, opacity)
    }
    expect(pressStyle('settings-equipment-dumbbells').opacity).toBe(0.7)
    fireEvent.click(checkbox)
    expect(onToggle).toHaveBeenCalledExactlyOnceWith('barbell')
    view.rerender(element(true))
    expect(pressStyle('settings-equipment-barbell').opacity).toBe(0.5)
    fireEvent.click(screen.getByRole('checkbox', { name: 'Barbell' }))
    expect(onToggle).toHaveBeenCalledTimes(1)
  })
})
