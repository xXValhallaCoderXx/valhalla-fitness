const title = 'Sheetless | Keep the logic. Lose the spreadsheet.'
const description =
  'Structured strength training without spreadsheet upkeep: pick a plan, log your reps and effort, and let Sheetless handle the progression math — with the rule attached to every change.'

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
