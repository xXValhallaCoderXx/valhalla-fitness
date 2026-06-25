import { Badge, Button, TextInput } from '@mantine/core'
import { notifications } from '@mantine/notifications'
import { useRouter } from '@tanstack/react-router'
import { Plus, Search } from 'lucide-react'
import { useId, useMemo, useState } from 'react'
import { Caption, EmptyState, Page, PageHeader, Panel, SectionLabel } from '~/components'
import type { ProgramTemplateSummary, TodayPayload } from '~/shared/types'
import { CustomProgramBuilder } from './CustomProgramBuilder'
import { TemplateCard, TemplateGrid } from './TemplateCard'

const templateFilters = ['All', 'Custom', 'Linear', 'Training max', 'Wave', 'Volume', 'Peak', 'High volume']

export function TemplateCatalogue({
  today,
  templates,
}: {
  today: TodayPayload
  templates: ProgramTemplateSummary[]
}) {
  const router = useRouter()
  const builderTitleId = useId()
  const [filter, setFilter] = useState('All')
  const [query, setQuery] = useState('')
  const [showBuilder, setShowBuilder] = useState(false)
  const activeTemplateId = today.activeProgram?.templateId ?? null

  const filtered = useMemo(() => {
    return templates.filter((template) => {
      const matchesFilter =
        filter === 'All' ||
        template.tags.some((tag) => tag.toLowerCase() === filter.toLowerCase()) ||
        template.sourceLabel.toLowerCase().includes(filter.toLowerCase())
      const haystack = `${template.name} ${template.description} ${template.sourceLabel}`.toLowerCase()
      return matchesFilter && haystack.includes(query.toLowerCase())
    })
  }, [filter, query, templates])
  const activeTemplate = activeTemplateId ? filtered.find((template) => template.id === activeTemplateId) ?? null : null
  const availableTemplates = activeTemplateId
    ? filtered.filter((template) => template.id !== activeTemplateId)
    : filtered

  const selectTemplate = (template: ProgramTemplateSummary) => {
    void router.navigate({ to: '/templates/$templateId/start', params: { templateId: template.id } })
  }

  const handleCustomTemplateCreated = async (template: ProgramTemplateSummary) => {
    notifications.show({ color: 'success', title: 'Programme created', message: `${template.name} is ready to start.` })
    setShowBuilder(false)
    await router.invalidate()
    await router.options.context.queryClient.invalidateQueries({ queryKey: ['templates'] })
    await router.navigate({ to: '/templates/$templateId/start', params: { templateId: template.id } })
  }

  return (
    <Page className="max-w-[1180px] md:px-8 lg:px-10">
      <PageHeader
        title="Choose a program"
        actions={
          <div className="flex flex-wrap justify-end gap-2">
            <Badge color="neutral" variant="light">{templates.length} programs available</Badge>
            <Button onClick={() => setShowBuilder(true)}>
              <Plus size={16} />
              Create programme
            </Button>
          </div>
        }
      >
        Select a structured program to start your next training cycle.
      </PageHeader>

      <Panel surface="inset" className="mb-4 max-w-4xl" px="sm" py="xs">
        <Caption>
          Built-in programs are original Sheetless programming tools and are not official, affiliated, or endorsed
          templates from any coach, author, book, or program.
        </Caption>
      </Panel>

      <div className="mb-5 space-y-3 md:mb-6">
        <div className="max-w-4xl">
          <TextInput
            leftSection={<Search size={16} />}
            placeholder="Search programs"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
          />
        </div>
        <div className="flex gap-2 overflow-x-auto pb-1 no-scrollbar sm:flex-wrap sm:overflow-visible sm:pb-0">
          {templateFilters.map((item) => (
            <Button
              key={item}
              size="xs"
              variant={filter === item ? 'filled' : 'default'}
              className="shrink-0"
              onClick={() => setFilter(item)}
            >
              {item}
            </Button>
          ))}
        </div>
      </div>

      <Caption className="mb-3" fw={600}>Showing {filtered.length} programs</Caption>

      <div className="space-y-6">
        {activeTemplate ? (
          <section>
            <SectionLabel className="mb-3">Active</SectionLabel>
            <TemplateGrid>
              <TemplateCard template={activeTemplate} isActive onStart={() => selectTemplate(activeTemplate)} />
            </TemplateGrid>
          </section>
        ) : null}

        <section>
          <SectionLabel className="mb-3">{activeTemplate ? 'Available' : 'Programs'}</SectionLabel>
          {availableTemplates.length ? (
            <TemplateGrid>
              {availableTemplates.map((template) => (
                <TemplateCard key={template.id} template={template} onStart={() => selectTemplate(template)} />
              ))}
            </TemplateGrid>
          ) : (
            <EmptyState title={activeTemplate ? 'No other matching programs' : 'No matching programs'}>
              Adjust the search or filter to see more templates.
            </EmptyState>
          )}
        </section>
      </div>

      {showBuilder ? (
        <div
          className="fixed inset-0 z-50 flex items-end bg-black/60 p-3 sm:items-center sm:justify-center"
          onClick={() => setShowBuilder(false)}
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby={builderTitleId}
            className="w-full max-w-4xl"
            onClick={(event) => event.stopPropagation()}
          >
            <CustomProgramBuilder
              titleId={builderTitleId}
              onClose={() => setShowBuilder(false)}
              onCreated={handleCustomTemplateCreated}
            />
          </div>
        </div>
      ) : null}
    </Page>
  )
}
