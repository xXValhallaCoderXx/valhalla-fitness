const title = 'Sheetless | Keep the logic. Lose the spreadsheet.'
const description =
  'Back-to-basics strength training: pick a plan, log your reps and effort, and see exactly why your next workout changes. Transparent progression, no black-box AI.'

export function marketingHead() {
  return {
    meta: [
      { title },
      { name: 'description', content: description },
      { property: 'og:title', content: title },
      { property: 'og:description', content: description },
      { property: 'og:type', content: 'website' },
      { property: 'og:site_name', content: 'Sheetless' },
      { name: 'twitter:card', content: 'summary' },
      { name: 'twitter:title', content: title },
      { name: 'twitter:description', content: description },
    ],
  }
}
