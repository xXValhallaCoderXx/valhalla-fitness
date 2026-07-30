import { MantineProvider } from '@mantine/core'
import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'
import { EquipmentModeBadge } from '../src/components'

function renderBadge(equipmentMode?: 'standard' | 'free_weight') {
  return renderToStaticMarkup(
    <MantineProvider>
      <EquipmentModeBadge equipmentMode={equipmentMode} />
    </MantineProvider>,
  )
}

describe('equipment mode badge', () => {
  it('labels free-weight snapshots with the approved read-only copy', () => {
    expect(renderBadge('free_weight')).toContain('Free weights only')
  })

  it('keeps standard and legacy snapshots unbadged', () => {
    expect(renderBadge('standard')).not.toContain('mantine-Badge')
    expect(renderBadge()).not.toContain('mantine-Badge')
  })
})
