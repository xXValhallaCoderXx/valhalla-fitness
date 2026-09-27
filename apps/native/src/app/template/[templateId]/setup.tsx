import { useLocalSearchParams } from 'expo-router'
import { TemplateSetupScreen } from '@/features/templates/TemplateSetupScreen'

export default function TemplateSetupRoute() {
  const params = useLocalSearchParams<{ templateId: string; draftId?: string; source?: string; finderDays?: string }>()
  return <TemplateSetupScreen {...params} />
}
