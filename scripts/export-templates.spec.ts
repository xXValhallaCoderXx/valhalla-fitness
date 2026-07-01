import { mkdirSync, writeFileSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vitest'
import { templateCatalog } from '~/domains/program/lib/templates'
import { listFallbackTemplateDefinitions } from '~/domains/program/lib/template-definitions'

/**
 * Exports every built-in training plan to a single structured JSON file.
 *
 * Source of truth is the *code*, not the DB: `templateCatalog` (catalog/metadata) joined on `id` with
 * `listFallbackTemplateDefinitions()` (the full DSL — sessions/weeks/prescriptions/sets/loads). The DB's
 * `program_template_versions.definition` is stale for several templates (older `percent`/`anchor` shape the
 * current parser rejects), so the app falls back to this code — which is what we serialise here.
 *
 * Run with: `pnpm export:templates` (a standalone vitest config; not part of `pnpm test`).
 * Output is deterministic (no timestamp) so re-running only diffs when a plan actually changes.
 */
const HERE = dirname(fileURLToPath(import.meta.url))
const OUT = resolve(HERE, '../docs/templates/templates.export.json')

function buildTemplatesExport() {
  const definitions = listFallbackTemplateDefinitions()
  const definitionById = new Map(definitions.map((definition) => [definition.id, definition]))

  const templates = templateCatalog.map((meta) => {
    const definition = definitionById.get(meta.id)
    if (!definition) throw new Error(`Catalog template "${meta.id}" has no DSL definition`)
    // Catalog metadata (the "card") at the top level, full DSL nested under `definition`.
    return { ...meta, definition }
  })

  return {
    schemaVersion: '2026.06.dsl',
    generatedBy: 'pnpm export:templates (scripts/export-templates.spec.ts)',
    source: 'code: src/domains/program/lib/templates.ts (catalog) + template-definitions.ts (DSL)',
    templateCount: templates.length,
    templates,
  }
}

describe('training plan DSL export', () => {
  it('serialises every built-in plan (catalog metadata + full DSL) to JSON', () => {
    const data = buildTemplatesExport()

    // Sanity: catalog and DSL definitions are id-aligned, complete, and internally consistent.
    expect(data.templates.length).toBe(listFallbackTemplateDefinitions().length)
    for (const template of data.templates) {
      expect(template.definition.id).toBe(template.id)
      expect(template.definition.sessions.length).toBe(template.definition.daysPerWeek)
      expect(template.definition.weeks.length).toBe(template.definition.durationWeeks)
    }

    mkdirSync(dirname(OUT), { recursive: true })
    writeFileSync(OUT, `${JSON.stringify(data, null, 2)}\n`)
    console.log(`Exported ${data.templateCount} plans → ${OUT}`)
  })
})
