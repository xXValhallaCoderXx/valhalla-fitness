import { useState } from 'react'
import type { User } from '@supabase/supabase-js'
import { usePathname } from 'expo-router'
import { menuCategoryOptions, type FeedbackCategory } from '@sheetless/domain/feedback/feedback-options'
import { Button, Caption, SheetModal, Text } from '@/components'
import { FeedbackFields } from './FeedbackFields'
import { useFeedbackSubmission } from './useFeedbackSubmission'

export function BetaFeedback({ user }: { user: User }) {
  const [open, setOpen] = useState(false)
  return <>
    <Button label="Beta feedback" variant="default" onPress={() => setOpen(true)} testID="beta-feedback-open" />
    {open ? <BetaFeedbackSheet key={user.id} user={user} onClose={() => setOpen(false)} /> : null}
  </>
}

function BetaFeedbackSheet({ user, onClose }: { user: User; onClose: () => void }) {
  const route = usePathname()
  const [category, setCategory] = useState<FeedbackCategory | null>(null)
  const [message, setMessage] = useState('')
  const submission = useFeedbackSubmission(user)
  return <SheetModal open title="Beta feedback" onClose={onClose} closeDisabled={submission.pending} testID="beta-feedback-sheet">
    {submission.sent ? <>
      <Text tone="success">Thanks — this helps improve the beta.</Text>
      <Button label="Done" onPress={onClose} />
    </> : <>
      <Caption>Share a bug, a suggestion, or something that was unclear.</Caption>
      <FeedbackFields options={menuCategoryOptions} category={category} onCategory={setCategory}
        message={message} onMessage={setMessage} pending={submission.pending} requiredMessage />
      {submission.error ? <Text tone="danger">{submission.error}</Text> : null}
      <Button label="Send feedback" disabled={!category || !message.trim()} loading={submission.pending}
        onPress={() => { if (category && message.trim()) void submission.send({ source: 'menu', category, message, route }) }} />
    </>}
  </SheetModal>
}
