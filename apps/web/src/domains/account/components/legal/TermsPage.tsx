import { Anchor } from '@mantine/core'
import { Text } from '~/components'
import {
  LEGAL_CONTACT_EMAIL,
  LegalDocument,
  LegalList,
  LegalSection,
} from './LegalDocument'

export function TermsPage() {
  return (
    <LegalDocument
      title="Terms of Use"
      summary="These terms govern your use of the Sheetless public beta. By creating an account or using the service, you agree to them."
    >
      <LegalSection title="1. Eligibility and accounts">
        <Text component="p" size="sm" tone="dimmed" lh={1.6}>
          You must be at least 18 years old and legally able to accept these terms. Provide accurate
          account information, keep access to your email and sign-in provider secure, and notify us
          if you believe your account has been compromised. You are responsible for activity under
          your account.
        </Text>
      </LegalSection>

      <LegalSection title="2. Public-beta service">
        <Text component="p" size="sm" tone="dimmed" lh={1.6}>
          Sheetless is pre-release software. Features, programmes, calculations, availability, and
          data formats may change. We may fix, add, remove, or suspend beta functionality, and the
          service may contain defects or interruptions. We will take reasonable care but do not
          promise uninterrupted or error-free operation.
        </Text>
      </LegalSection>

      <LegalSection title="3. Training and health notice">
        <LegalList
          items={[
            'Sheetless provides general fitness information and deterministic training tools. It is not medical advice, diagnosis, treatment, physiotherapy, or individualized professional coaching.',
            'Consult a qualified healthcare professional before beginning or changing an exercise programme, especially if you have an injury, medical condition, pregnancy, or other concern.',
            'Use judgment, appropriate technique, equipment, spotting, and load selection. Stop exercising and seek appropriate help if you experience pain, faintness, chest pain, or unusual symptoms.',
            'Progression suggestions and strength estimates are calculations based on the data entered. They do not guarantee safety, suitability, or results.',
          ]}
        />
      </LegalSection>

      <LegalSection title="4. Acceptable use">
        <Text component="p" size="sm" tone="dimmed" lh={1.6}>
          Do not misuse the service, interfere with its operation, attempt unauthorized access,
          probe or bypass security, automate abusive traffic, upload malicious material, infringe
          another person’s rights, impersonate others, or use Sheetless unlawfully. We may restrict
          or terminate access needed to protect users, providers, or the service.
        </Text>
      </LegalSection>

      <LegalSection title="5. Your content and data">
        <Text component="p" size="sm" tone="dimmed" lh={1.6}>
          You retain ownership of notes, feedback, and custom programme material you create. You give
          Sheetless a limited permission to host, copy, process, and display that content only as
          needed to operate, secure, support, and improve the service. Do not submit content you do
          not have the right to use. Our handling of personal data is described in the Privacy
          Policy.
        </Text>
      </LegalSection>

      <LegalSection title="6. Sheetless programmes and intellectual property">
        <Text component="p" size="sm" tone="dimmed" lh={1.6}>
          The application, branding, interface, documentation, and built-in programme definitions
          are owned by Sheetless or used under applicable licenses. Built-in programmes are original
          Sheetless tools and are not affiliated with or endorsed by any coach, author, book, or
          third-party programme unless explicitly stated. These terms grant only a personal,
          revocable, non-transferable right to use the service.
        </Text>
      </LegalSection>

      <LegalSection title="7. Data availability and account closure">
        <Text component="p" size="sm" tone="dimmed" lh={1.6}>
          Keep any copy of your data you need. Settings provides a JSON export and self-service
          deletion. You may stop using Sheetless or delete your account at any time. We may suspend
          or close an account that materially violates these terms, creates risk, or where the
          service is discontinued. Account deletion is irreversible, subject to limited backup,
          security, and legally required retention described in the Privacy Policy.
        </Text>
      </LegalSection>

      <LegalSection title="8. Disclaimers and limitation of liability">
        <Text component="p" size="sm" tone="dimmed" lh={1.6}>
          To the extent permitted by law, the beta is provided “as is” and “as available,” without
          implied warranties of fitness for a particular purpose, accuracy, or non-infringement.
          Sheetless is not responsible for training decisions, injuries, lost results, or indirect,
          incidental, special, consequential, or punitive loss arising from use of the service.
          Nothing in these terms excludes liability that cannot lawfully be excluded or limits
          mandatory consumer rights.
        </Text>
      </LegalSection>

      <LegalSection title="9. Changes, governing law, and contact">
        <Text component="p" size="sm" tone="dimmed" lh={1.6}>
          We may update these terms as the beta changes. Material updates will be shown in the app
          or otherwise communicated when appropriate; continuing to use the service after an
          effective update means accepting the revised terms. Applicable law governs these terms,
          and nothing here overrides mandatory protections or dispute rights that apply where you
          live. Questions can be sent to{' '}
          <Anchor href={`mailto:${LEGAL_CONTACT_EMAIL}`}>{LEGAL_CONTACT_EMAIL}</Anchor>.
        </Text>
      </LegalSection>
    </LegalDocument>
  )
}
