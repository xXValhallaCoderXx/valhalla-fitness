import { useLocalSearchParams } from 'expo-router'
import { TemplateSetupScreen } from '@/features/templates/TemplateSetupScreen'

export default function TemplateSetupRoute() {
  const { templateId } = useLocalSearchParams<{ templateId: string }>()
  return <TemplateSetupScreen templateId={templateId} />
}
