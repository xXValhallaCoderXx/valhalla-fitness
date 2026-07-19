import { Redirect } from 'expo-router'
import { useSession } from '@/auth/SessionProvider'

export default function Index() {
  const { session } = useSession()
  return <Redirect href={session ? '/today' : '/sign-in'} />
}
