import { useLocalSearchParams } from 'expo-router'
import { TemplateDetailScreen } from '@/features/templates/TemplateDetailScreen'

export default function TemplateRoute() {
  const { templateId } = useLocalSearchParams<{ templateId: string }>()
  return <TemplateDetailScreen templateId={templateId} />
}
