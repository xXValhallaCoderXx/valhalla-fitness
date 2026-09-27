import { useCallback, useEffect, useMemo, useRef } from 'react'
import type { LayoutChangeEvent, ScrollView } from 'react-native'
import { createSettingsSectionScroll, type SettingsEntrySection } from './settings-section'

export function useSettingsSectionScroll(section: SettingsEntrySection | undefined) {
  const scrollRef = useRef<ScrollView>(null)
  const controller = useMemo(() => createSettingsSectionScroll(), [])
  const scrollWhenReady = useCallback(() => {
    if (!scrollRef.current) return
    const y = controller.takeOffset()
    if (y !== null) scrollRef.current.scrollTo({ y, animated: false })
  }, [controller])

  useEffect(() => {
    controller.setSection(section)
    scrollWhenReady()
  }, [controller, section, scrollWhenReady])

  return {
    scrollRef,
    onStartingNumbersLayout: (event: LayoutChangeEvent) => {
      controller.setTargetY(event.nativeEvent.layout.y)
      scrollWhenReady()
    },
    onContentSizeChange: (_width: number, height: number) => {
      controller.setContentHeight(height)
      scrollWhenReady()
    },
    onLayout: (event: LayoutChangeEvent) => {
      controller.setViewportHeight(event.nativeEvent.layout.height)
      scrollWhenReady()
    },
  }
}
