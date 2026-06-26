import { Badge, Button, Modal, TextInput } from '@mantine/core'
import { notifications } from '@mantine/notifications'
import { useRouter } from '@tanstack/react-router'
import { Plus, Search } from 'lucide-react'
import { useId, useMemo, useState } from 'react'
import { Caption, EmptyState, Heading, Page, PageHeader, Panel, SectionLabel, Text } from '~/components'
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
  const activeTemplate = activeTemplateId ? templates.find((template) => template.id === activeTemplateId) ?? null : null
  const availableTemplates = activeTemplateId
    ? filtered.filter((template) => template.id !== activeTemplateId)
    : filtered
  const builtInTemplates = availableTemplates.filter((template) => template.origin !== 'user_created')
  const customTemplates = availableTemplates.filter((template) => template.origin === 'user_created')

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
          <div className="flex w-full items-center justify-between gap-2 sm:w-auto sm:flex-wrap sm:justify-end">
            <Badge color="neutral" variant="light">{templates.length} programs available</Badge>
            <Button
              className="h-8 min-h-8 px-3 sm:hidden"
              hiddenFrom="sm"
              onClick={() => setShowBuilder(true)}
            >
              <Plus size={14} />
              Create
            </Button>
            <Button visibleFrom="sm" onClick={() => setShowBuilder(true)}>
              <Plus size={16} />
              Create programme
            </Button>
          </div>
        }
      >
        Select a structured program to start your next training cycle.
      </PageHeader>

      {activeTemplate ? (
        <ActiveProgramBand template={activeTemplate} className="mb-4" />
      ) : null}

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

      <div className="space-y-6">
        {builtInTemplates.length ? (
          <section>
            <TemplateSectionHeader
              label="Sheetless library"
              count={builtInTemplates.length}
              helper="Original presets and progression tools."
            />
            <TemplateGrid>
              {builtInTemplates.map((template) => (
                <TemplateCard key={template.id} template={template} onStart={() => selectTemplate(template)} />
              ))}
            </TemplateGrid>
          </section>
        ) : null}

        {customTemplates.length || filter === 'Custom' ? (
          <section>
            <TemplateSectionHeader
              label="Custom"
              count={customTemplates.length}
              helper="Templates you build for your own training."
            />
            {customTemplates.length ? (
              <TemplateGrid>
                {customTemplates.map((template) => (
                  <TemplateCard key={template.id} template={template} onStart={() => selectTemplate(template)} />
                ))}
              </TemplateGrid>
            ) : (
              <EmptyState title="No matching custom programs">Adjust the search or create a programme.</EmptyState>
            )}
          </section>
        ) : null}

        {!availableTemplates.length && filter !== 'Custom' ? (
          <EmptyState title={activeTemplate ? 'No other matching programs' : 'No matching programs'}>
            Adjust the search or filter to see more templates.
          </EmptyState>
        ) : null}
      </div>

      <Modal
        opened={showBuilder}
        onClose={() => setShowBuilder(false)}
        withCloseButton={false}
        centered
        size="64rem"
        padding={0}
        classNames={{
          inner: 'p-0 sm:p-4',
          content: 'h-[100dvh] max-h-[100dvh] w-full rounded-none sm:h-auto sm:max-h-[92dvh] sm:rounded-lg',
          body: 'h-full',
        }}
        styles={{
          content: {
            backgroundColor: 'transparent',
            border: 0,
            boxShadow: 'none',
          },
          body: {
            padding: 0,
          },
        }}
      >
        <CustomProgramBuilder
          titleId={builderTitleId}
          onClose={() => setShowBuilder(false)}
          onCreated={handleCustomTemplateCreated}
        />
      </Modal>
    </Page>
  )
}

function TemplateSectionHeader({
  label,
  count,
  helper,
}: {
  label: string
  count: number
  helper: string
}) {
  return (
    <div className="mb-3 flex flex-wrap items-end justify-between gap-2">
      <div>
        <SectionLabel>{label}</SectionLabel>
        <Caption mt={2}>{helper}</Caption>
      </div>
      <Badge color="neutral">{count} matching</Badge>
    </div>
  )
}

function ActiveProgramBand({
  template,
  className,
}: {
  template: ProgramTemplateSummary
  className?: string
}) {
  return (
    <Panel className={className} p="sm" style={{ borderColor: 'var(--vf-action-border)' }}>
      <div className="grid gap-3 md:grid-cols-[minmax(0,1fr)_auto] md:items-center">
        <div className="min-w-0">
          <div className="mb-1 flex flex-wrap items-center gap-2">
            <Badge color="action" variant="filled">Active program</Badge>
            <Badge color={template.origin === 'user_created' ? 'accent' : 'neutral'}>{template.sourceLabel}</Badge>
          </div>
          <Heading order={2} size="h4" className="truncate">
            {template.name}
          </Heading>
          <Text mt={3} size="sm" tone="dimmed" lineClamp={2}>
            {template.description}
          </Text>
        </div>
        <div className="grid grid-cols-3 gap-2 md:w-[20rem]">
          <ActiveBandMetric label="Days" value={`${template.daysPerWeek}/wk`} />
          <ActiveBandMetric label="Level" value={template.complexity} />
          <ActiveBandMetric label="Method" value={template.progressionLabel} />
        </div>
      </div>
    </Panel>
  )
}

function ActiveBandMetric({ label, value }: { label: string; value: string | number }) {
  return (
    <Panel surface="inset" px="xs" py={6} className="min-w-0">
      <SectionLabel size="0.5625rem" truncate>{label}</SectionLabel>
      <Text mt={2} size="xs" fw={900} truncate>{value}</Text>
    </Panel>
  )
}
