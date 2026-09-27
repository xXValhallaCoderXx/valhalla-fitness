import { useLocalSearchParams } from 'expo-router'
import { TemplateDetailScreen } from '@/features/templates/TemplateDetailScreen'

export default function TemplateRoute() {
  const { templateId, source, finderDays } = useLocalSearchParams<{ templateId: string; source?: string; finderDays?: string }>()
  return <TemplateDetailScreen templateId={templateId} source={source} finderDays={finderDays} />
}
