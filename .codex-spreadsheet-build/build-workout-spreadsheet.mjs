import fs from 'node:fs/promises'
import path from 'node:path'
import { createRequire } from 'node:module'

const requireFromBundledDeps = createRequire(
  'C:/Users/renat/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/package.json',
)
const { SpreadsheetFile, Workbook } = requireFromBundledDeps('@oai/artifact-tool')

const root = process.cwd()
const outputDir = path.join(root, 'outputs', 'workout-comeback-spreadsheet')
const outputPath = path.join(outputDir, 'Workout-Comeback-Program.xlsx')

const theme = {
  navy: '#172033',
  blue: '#2563EB',
  blueDark: '#1E3A8A',
  paleBlue: '#DBEAFE',
  paleGreen: '#DCFCE7',
  paleAmber: '#FEF3C7',
  grid: '#CBD5E1',
  text: '#0F172A',
  muted: '#64748B',
  white: '#FFFFFF',
}

const lifts = [
  ['Squat', 120, 1, 0, 0.85, 'Enter true 1RM as reps=1/RIR=0, or a top set.'],
  ['Bench', 105, 1, 0, 0.8, 'Shoulder-conservative TM percentage.'],
  ['Deadlift', 210, 1, 1, 0.85, 'Current comeback seed from the tough single.'],
]

const weeks = [
  {
    week: 1,
    name: '5s',
    sets: [
      [0.65, '5', 'Set 1'],
      [0.75, '5', 'Set 2'],
      [0.85, '5+', 'Top set'],
    ],
    fsl: [0.65, '5'],
  },
  {
    week: 2,
    name: '3s',
    sets: [
      [0.7, '3', 'Set 1'],
      [0.8, '3', 'Set 2'],
      [0.9, '3+', 'Top set'],
    ],
    fsl: [0.65, '5'],
  },
  {
    week: 3,
    name: '5/3/1',
    sets: [
      [0.75, '5', 'Set 1'],
      [0.85, '3', 'Set 2'],
      [0.95, '1+', 'Top set'],
    ],
    fsl: [0.65, '5'],
  },
  {
    week: 4,
    name: 'Deload',
    sets: [
      [0.4, '5', 'Set 1'],
      [0.5, '5', 'Set 2'],
      [0.6, '5', 'Set 3'],
    ],
    fsl: null,
  },
]

const liftDays = { Squat: 'Mon', Bench: 'Wed', Deadlift: 'Fri' }

const accessoryRows = [
  ['Squat', 'Quad volume', 'Leg press', 3, 10, 12, 90, 2.5, 'Bulgarian split squat; Hack squat'],
  ['Squat', 'Hamstring support', 'Lying / seated leg curl', 3, 12, 15, 75, 2.5, 'Assisted Nordic curl'],
  ['Squat', 'Pressing support', 'Triceps pushdown', 3, 12, 15, 60, 2.5, 'Rope overhead extension if shoulder calm'],
  ['Squat', 'Core', 'Hanging leg raise', 3, 10, 15, 60, 2.5, 'Ab wheel; Plank'],
  ['Bench', 'Heavy row', 'Chest-supported row', 4, 8, 12, 90, 2.5, 'Seal row; DB row'],
  ['Bench', 'Vertical pull', 'Neutral-grip lat pulldown', 3, 10, 12, 75, 2.5, 'Assisted pull-up'],
  ['Bench', 'Optional press', 'Incline DB press neutral grip', 3, 8, 12, 90, 2.5, 'Only if pain-free; Machine press; Push-up handles'],
  ['Bench', 'Arm balance', 'DB hammer curl', 3, 12, 12, 60, 2.5, 'Cable curl'],
  ['Bench', 'Shoulder prehab', 'Face pulls + band external rotation', 4, 15, 20, 45, 2.5, 'Band pull-apart'],
  ['Assist', 'Technique squat', 'Paused squat technique', 3, 3, 3, 90, 0, 'Light crisp triples only; no grinding'],
  ['Assist', 'Upper back volume', 'Chest-supported row', 4, 10, 12, 75, 2.5, 'Seal row; DB row'],
  ['Assist', 'Lat volume', 'Neutral-grip lat pulldown', 3, 10, 12, 75, 2.5, 'Assisted pull-up'],
  ['Assist', 'Shoulder-safe press', 'DB floor press', 3, 8, 12, 75, 2.5, 'Optional if shoulder is calm; Push-up handles; Machine press'],
  ['Assist', 'Prehab + core', 'Face pulls + band external rotation', 3, 15, 20, 45, 2.5, 'Band pull-apart; Plank'],
  ['Deadlift', 'Posterior chain', 'Romanian deadlift', 3, 8, 10, 120, 2.5, 'Back extension; Hip thrust'],
  ['Deadlift', 'Back extension', '45 degree back extension', 3, 12, 15, 90, 2.5, 'Hip thrust'],
  ['Deadlift', 'Row', 'DB row', 3, 10, 10, 75, 2.5, 'Chest-supported row; Seal row'],
  ['Deadlift', 'Core', 'Cable crunch', 3, 10, 15, 60, 2.5, 'Plank; Ab wheel'],
]

function setWidths(sheet, widths) {
  widths.forEach((width, index) => {
    sheet.getRangeByIndexes(0, index, 1, 1).format.columnWidthPx = width
  })
}

function title(sheet, range, text) {
  sheet.getRange(range).merge()
  const cell = sheet.getRange(range)
  cell.values = [[text]]
  cell.format = {
    fill: theme.navy,
    font: { bold: true, color: theme.white, size: 16 },
    horizontalAlignment: 'center',
  }
  cell.format.rowHeightPx = 34
}

function styleHeader(range, fill = theme.blueDark) {
  range.format = {
    fill,
    font: { bold: true, color: theme.white },
    borders: { preset: 'all', style: 'thin', color: theme.grid },
  }
}

function styleBody(range) {
  range.format = {
    fill: theme.white,
    font: { color: theme.text },
    borders: { preset: 'all', style: 'thin', color: theme.grid },
  }
}

function inputFill(range) {
  range.format = {
    fill: theme.paleAmber,
    borders: { preset: 'all', style: 'thin', color: theme.grid },
  }
}

function tmFormula(row) {
  return `=IF(F${row}="","",ROUND(F${row}*E${row}/$B$4,0)*$B$4)`
}

function e1rmFormula(row) {
  return `=IF(OR(B${row}="",C${row}=""),"",IF(AND(C${row}=1,D${row}=0),B${row},B${row}*(1+(C${row}+D${row})/30)))`
}

function weightFormula(row, liftCol = 'E', pctCol = 'H') {
  return `=IF(${pctCol}${row}="","",ROUND(INDEX(Setup!$G$11:$G$13,MATCH(${liftCol}${row},Setup!$A$11:$A$13,0))*${pctCol}${row}/Setup!$B$4,0)*Setup!$B$4)`
}

function selectedPctFormula(setNumber) {
  const pcts = {
    1: '0.65,0.70,0.75,0.40',
    2: '0.75,0.80,0.85,0.50',
    3: '0.85,0.90,0.95,0.60',
  }
  return `=CHOOSE(Setup!$B$6,${pcts[setNumber]})`
}

function selectedRepsFormula(setNumber, lift) {
  if (lift === 'Bench' && setNumber === 3) return `=CHOOSE(Setup!$B$6,"5","3","1","5")`
  const reps = {
    1: '"5","3","5","5"',
    2: '"5","3","3","5"',
    3: '"5+","3+","1+","5"',
  }
  return `=CHOOSE(Setup!$B$6,${reps[setNumber]})`
}

function selectedWeightFormula(row) {
  return `=IF(D${row}="","",ROUND(INDEX(Setup!$G$11:$G$13,MATCH(B${row},Setup!$A$11:$A$13,0))*D${row}/Setup!$B$4,0)*Setup!$B$4)`
}

function configLookup(row, colLetter) {
  return `INDEX(Accessory_Config!$${colLetter}$6:$${colLetter}$30,MATCH(C${row},Accessory_Config!$B$6:$B$30,0))`
}

const workbook = Workbook.create()

const dashboard = workbook.worksheets.add('Dashboard')
const setup = workbook.worksheets.add('Setup')
const weekly = workbook.worksheets.add('Weekly_View')
const history = workbook.worksheets.add('History')
const cycle = workbook.worksheets.add('Cycle')
const accessoryConfig = workbook.worksheets.add('Accessory_Config')
const accessoryLog = workbook.worksheets.add('Accessory_Log')

for (const sheet of [dashboard, setup, weekly, history, cycle, accessoryConfig, accessoryLog]) {
  sheet.showGridLines = false
}

// Setup
title(setup, 'A1:H1', 'Workout Comeback - Setup')
setWidths(setup, [130, 115, 70, 70, 80, 115, 120, 340])
setup.getRange('A4:B7').values = [
  ['Rounding kg', 2.5],
  ['Selected cycle', 1],
  ['Selected week', 1],
  ['How to use', 'Enter a true 1RM as reps=1 and RIR=0, or enter a recent top set with reps/RIR. Yellow cells are inputs.'],
]
setup.getRange('A4:A7').format = { font: { bold: true, color: theme.text }, fill: theme.paleBlue }
inputFill(setup.getRange('B4:B6'))
setup.getRange('B4:B6').format.numberFormat = '0.0'
setup.getRange('B7:H7').merge()
setup.getRange('B7:H7').format = { fill: theme.paleBlue, font: { color: theme.text }, wrapText: true }

setup.getRange('A10:H10').values = [['Lift', 'Weight / 1RM', 'Reps', 'RIR', 'TM %', 'e1RM', 'Training Max', 'Notes']]
styleHeader(setup.getRange('A10:H10'))
setup.getRange('A11:H13').values = lifts.map(([lift, weight, reps, rir, pct, note]) => [lift, weight, reps, rir, pct, null, null, note])
styleBody(setup.getRange('A11:H13'))
inputFill(setup.getRange('B11:E13'))
setup.getRange('F11:F13').formulas = [[e1rmFormula(11)], [e1rmFormula(12)], [e1rmFormula(13)]]
setup.getRange('G11:G13').formulas = [[tmFormula(11)], [tmFormula(12)], [tmFormula(13)]]
setup.getRange('E11:E13').format.numberFormat = '0%'
setup.getRange('F11:G13').format.numberFormat = '0.0'
setup.getRange('H11:H13').format = { wrapText: true }
setup.freezePanes.freezeRows(10)

// Cycle
title(cycle, 'A1:L1', '5/3/1 FSL Cycle Generator')
setWidths(cycle, [65, 65, 90, 65, 90, 90, 65, 70, 85, 65, 90, 300])
const cycleHeaders = ['Cycle', 'Week', 'Week Name', 'Day', 'Lift', 'Set Type', 'Set #', '% TM', 'Target', 'Sets', 'Weight', 'Notes']
cycle.getRange('A4:L4').values = [cycleHeaders]
styleHeader(cycle.getRange('A4:L4'))
const cycleRows = []
for (const week of weeks) {
  for (const [lift] of lifts) {
    for (let i = 0; i < week.sets.length; i += 1) {
      const [pct, reps, label] = week.sets[i]
      const target = lift === 'Bench' && label === 'Top set' ? String(reps).replace('+', '') : reps
      const note =
        lift === 'Bench' && label === 'Top set'
          ? 'No AMRAP; stop with shoulder calm.'
          : label === 'Top set'
            ? 'Stop at RPE 8 / 2+ RIR. No grinding.'
            : ''
      cycleRows.push([1, week.week, week.name, liftDays[lift], lift, 'Main', i + 1, pct, target, 1, null, note])
    }
    if (week.fsl) {
      const fslSets = lift === 'Deadlift' ? 4 : 5
      cycleRows.push([1, week.week, week.name, liftDays[lift], lift, 'FSL', '', week.fsl[0], week.fsl[1], fslSets, null, 'Same weight every set; cut volume if bar speed slows.'])
    }
  }
}
cycle.getRangeByIndexes(4, 0, cycleRows.length, cycleHeaders.length).values = cycleRows
styleBody(cycle.getRangeByIndexes(4, 0, cycleRows.length, cycleHeaders.length))
const cycleWeightFormulas = cycleRows.map((_, index) => [weightFormula(index + 5)])
cycle.getRangeByIndexes(4, 10, cycleRows.length, 1).formulas = cycleWeightFormulas
cycle.getRangeByIndexes(4, 7, cycleRows.length, 1).format.numberFormat = '0%'
cycle.getRangeByIndexes(4, 10, cycleRows.length, 1).format.numberFormat = '0.0'
cycle.freezePanes.freezeRows(4)
cycle.tables.add(`A4:L${4 + cycleRows.length}`, true, 'CycleTable')

// Weekly view
title(weekly, 'A1:Y1', 'Weekly Logger')
setWidths(weekly, [
  58, 55, 95, 65, 88, 88, 145, 210, 78, 58, 88, 88, 70, 58, 70, 58, 70, 58, 70, 58, 70, 58, 86, 250, 110,
])
weekly.getRange('A3:Y3').merge()
weekly.getRange('A3:Y3').values = [['Type only in yellow cells. These rows are your saved history for Cycle 1; filter Week or Session to focus the view. Mark Status to send completed/skipped rows to History.']]
weekly.getRange('A3:Y3').format = { fill: theme.paleBlue, font: { bold: true, color: theme.text }, wrapText: true }
weekly.getRange('A4:K4').merge()
weekly.getRange('A4:K4').values = [['Planned work']]
weekly.getRange('L4:X4').merge()
weekly.getRange('L4:X4').values = [['Your log']]
weekly.getRange('Y4').values = [['Auto']]
weekly.getRange('A4:K4').format = { fill: theme.blueDark, font: { bold: true, color: theme.white }, horizontalAlignment: 'center' }
weekly.getRange('L4:X4').format = { fill: '#92400E', font: { bold: true, color: theme.white }, horizontalAlignment: 'center' }
weekly.getRange('Y4').format = { fill: theme.blueDark, font: { bold: true, color: theme.white }, horizontalAlignment: 'center' }
const weeklyHeaders = [
  'Cycle',
  'Week',
  'Date',
  'Day',
  'Session',
  'Block',
  'Item',
  'Exercise',
  'Target',
  'Sets',
  'Planned Wt',
  'Actual Wt',
  'S1 Reps',
  'S1 RIR',
  'S2 Reps',
  'S2 RIR',
  'S3 Reps',
  'S3 RIR',
  'S4 Reps',
  'S4 RIR',
  'S5 Reps',
  'S5 RIR',
  'Status',
  'Notes',
  'Suggested Next',
]
weekly.getRange('A5:Y5').values = [weeklyHeaders]
styleHeader(weekly.getRange('A5:Y5'))

const weeklyRows = []
const weeklyFormulaWrites = []
const weeklyAccessoryRows = []

function plannedWeightFor(row, pct) {
  return `=ROUND(INDEX(Setup!$G$11:$G$13,MATCH(E${row},Setup!$A$11:$A$13,0))*${pct}/Setup!$B$4,0)*Setup!$B$4`
}

function appendWeeklyRow(values, formulas = {}, isAccessory = false) {
  const rowNumber = 6 + weeklyRows.length
  weeklyRows.push(values)
  for (const [column, formula] of Object.entries(formulas)) {
    weeklyFormulaWrites.push({ address: `${column}${rowNumber}`, formula })
  }
  if (isAccessory) weeklyAccessoryRows.push(rowNumber)
  return rowNumber
}

for (const week of weeks) {
  for (const lift of ['Squat', 'Bench', 'Assist', 'Deadlift']) {
    if (lift !== 'Assist') {
      for (const [pct, reps, label] of week.sets) {
        const target = lift === 'Bench' && label === 'Top set' ? String(reps).replace('+', '') : reps
        const note = label === 'Top set' ? (lift === 'Bench' ? 'No AMRAP; stop with shoulder calm.' : 'Cap at RPE 8 / 2+ RIR.') : ''
        appendWeeklyRow(
          [1, week.week, null, liftDays[lift], lift, 'Main', label, lift, target, 1, null, null, null, null, null, null, null, null, null, null, null, null, null, note, null],
          { K: plannedWeightFor(6 + weeklyRows.length, pct) },
        )
      }
      if (week.fsl) {
        appendWeeklyRow(
          [1, week.week, null, liftDays[lift], lift, 'FSL', 'First set last', lift, week.fsl[1], lift === 'Deadlift' ? 4 : 5, null, null, null, null, null, null, null, null, null, null, null, null, null, 'Same weight each set; cut volume if bar speed slows.', null],
          { K: plannedWeightFor(6 + weeklyRows.length, week.fsl[0]) },
        )
      }
    }

    const sessionAccessories = accessoryRows
      .map((row, index) => ({ row, configRow: index + 6 }))
      .filter(({ row }) => row[0] === lift)
    for (const { row, configRow } of sessionAccessories) {
      const day = lift === 'Assist' ? 'Thu' : liftDays[lift]
      const rowNumber = 6 + weeklyRows.length
      const suggestedNext = `=IF(L${rowNumber}="","",IF(AND(COUNT(M${rowNumber},O${rowNumber},Q${rowNumber},S${rowNumber},U${rowNumber})>=J${rowNumber},MIN(M${rowNumber},O${rowNumber},Q${rowNumber},IF(J${rowNumber}>=4,S${rowNumber},999),IF(J${rowNumber}>=5,U${rowNumber},999))>=Accessory_Config!$F$${configRow},MIN(N${rowNumber},P${rowNumber},R${rowNumber},IF(J${rowNumber}>=4,T${rowNumber},999),IF(J${rowNumber}>=5,V${rowNumber},999))>=2),L${rowNumber}+Accessory_Config!$H$${configRow},L${rowNumber}))`
      appendWeeklyRow(
        [1, week.week, null, day, lift, 'Accessory', row[1], null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, row[8], null],
        {
          H: `=Accessory_Config!$C$${configRow}`,
          I: `=Accessory_Config!$E$${configRow}&"-"&Accessory_Config!$F$${configRow}`,
          J: `=Accessory_Config!$D$${configRow}`,
          Y: suggestedNext,
        },
        true,
      )
    }
  }
}

weekly.getRangeByIndexes(5, 0, weeklyRows.length, weeklyHeaders.length).values = weeklyRows
styleBody(weekly.getRangeByIndexes(5, 0, weeklyRows.length, weeklyHeaders.length))
for (const { address, formula } of weeklyFormulaWrites) {
  weekly.getRange(address).formulas = [[formula]]
}
for (const rowNumber of weeklyAccessoryRows) {
  weekly.getRange(`A${rowNumber}:Y${rowNumber}`).format = { fill: theme.paleGreen, borders: { preset: 'all', style: 'thin', color: theme.grid } }
}
inputFill(weekly.getRange(`C6:C${5 + weeklyRows.length}`))
inputFill(weekly.getRange(`L6:X${5 + weeklyRows.length}`))
weekly.getRange(`A6:B${5 + weeklyRows.length}`).format.horizontalAlignment = 'center'
weekly.getRange(`C6:C${5 + weeklyRows.length}`).format.numberFormat = 'yyyy-mm-dd'
weekly.getRange(`J6:L${5 + weeklyRows.length}`).format.numberFormat = '0.0'
weekly.getRange(`M6:V${5 + weeklyRows.length}`).format.numberFormat = '0'
weekly.getRange(`Y6:Y${5 + weeklyRows.length}`).format = { fill: theme.paleBlue, borders: { preset: 'all', style: 'thin', color: theme.grid }, numberFormat: '0.0' }
weekly.getRange(`X6:X${5 + weeklyRows.length}`).format = { fill: theme.paleAmber, wrapText: true, borders: { preset: 'all', style: 'thin', color: theme.grid } }
weekly.freezePanes.freezeRows(5)
weekly.freezePanes.freezeColumns(6)
weekly.tables.add(`A5:Y${5 + weeklyRows.length}`, true, 'WeeklyLogTable')
try {
  weekly.dataValidations.add({ range: `W6:W${5 + weeklyRows.length}`, rule: { type: 'list', values: ['Done', 'Skipped'] } })
} catch {
  // The log remains usable if validation is unavailable in a viewer.
}

// History
title(history, 'A1:N1', 'Completed History')
setWidths(history, [95, 65, 65, 65, 88, 88, 145, 210, 88, 88, 85, 75, 85, 260])
history.getRange('A3:N3').merge()
history.getRange('A3:N3').values = [['This sheet mirrors Weekly_View rows where Status is filled. Use Weekly_View as the input surface; this tab is for filtering completed/skipped history.']]
history.getRange('A3:N3').format = { fill: theme.paleBlue, font: { bold: true, color: theme.text }, wrapText: true }
const historyHeaders = ['Date', 'Cycle', 'Week', 'Day', 'Session', 'Block', 'Item', 'Exercise', 'Planned Wt', 'Actual Wt', 'Total Reps', 'Avg RIR', 'Status', 'Notes']
history.getRange('A5:N5').values = [historyHeaders]
styleHeader(history.getRange('A5:N5'))
styleBody(history.getRangeByIndexes(5, 0, weeklyRows.length, historyHeaders.length))
for (let index = 0; index < weeklyRows.length; index += 1) {
  const sourceRow = 6 + index
  const targetRow = 6 + index
  history.getRange(`A${targetRow}:N${targetRow}`).formulas = [[
    `=IF(Weekly_View!$W${sourceRow}="","",Weekly_View!$C${sourceRow})`,
    `=IF(Weekly_View!$W${sourceRow}="","",Weekly_View!$A${sourceRow})`,
    `=IF(Weekly_View!$W${sourceRow}="","",Weekly_View!$B${sourceRow})`,
    `=IF(Weekly_View!$W${sourceRow}="","",Weekly_View!$D${sourceRow})`,
    `=IF(Weekly_View!$W${sourceRow}="","",Weekly_View!$E${sourceRow})`,
    `=IF(Weekly_View!$W${sourceRow}="","",Weekly_View!$F${sourceRow})`,
    `=IF(Weekly_View!$W${sourceRow}="","",Weekly_View!$G${sourceRow})`,
    `=IF(Weekly_View!$W${sourceRow}="","",Weekly_View!$H${sourceRow})`,
    `=IF(Weekly_View!$W${sourceRow}="","",Weekly_View!$K${sourceRow})`,
    `=IF(Weekly_View!$W${sourceRow}="","",Weekly_View!$L${sourceRow})`,
    `=IF(Weekly_View!$W${sourceRow}="","",SUM(Weekly_View!$M${sourceRow},Weekly_View!$O${sourceRow},Weekly_View!$Q${sourceRow},Weekly_View!$S${sourceRow},Weekly_View!$U${sourceRow}))`,
    `=IF(Weekly_View!$W${sourceRow}="","",IFERROR(AVERAGE(Weekly_View!$N${sourceRow},Weekly_View!$P${sourceRow},Weekly_View!$R${sourceRow},Weekly_View!$T${sourceRow},Weekly_View!$V${sourceRow}),""))`,
    `=IF(Weekly_View!$W${sourceRow}="","",Weekly_View!$W${sourceRow})`,
    `=IF(Weekly_View!$W${sourceRow}="","",Weekly_View!$X${sourceRow})`,
  ]]
}
history.getRange(`A6:A${5 + weeklyRows.length}`).format.numberFormat = 'yyyy-mm-dd'
history.getRange(`I6:J${5 + weeklyRows.length}`).format.numberFormat = '0.0'
history.getRange(`K6:L${5 + weeklyRows.length}`).format.numberFormat = '0.0'
history.freezePanes.freezeRows(5)
history.tables.add(`A5:N${5 + weeklyRows.length}`, true, 'HistoryTable')

// Accessory config
title(accessoryConfig, 'A1:I1', 'Accessory Configuration')
setWidths(accessoryConfig, [80, 165, 210, 65, 75, 80, 80, 90, 380])
accessoryConfig.getRange('A3:I3').merge()
accessoryConfig.getRange('A3:I3').values = [['Edit default exercises, set/rep targets, rest, and swap notes here. Accessory_Log looks up targets from the Slot column.']]
accessoryConfig.getRange('A3:I3').format = { fill: theme.paleBlue, wrapText: true }
accessoryConfig.getRange('A5:I5').values = [['Session', 'Slot', 'Default Exercise', 'Sets', 'Rep Low', 'Rep High', 'Rest Sec', 'Increment kg', 'Swap Pool / Notes']]
styleHeader(accessoryConfig.getRange('A5:I5'))
accessoryConfig.getRangeByIndexes(5, 0, accessoryRows.length, 9).values = accessoryRows
styleBody(accessoryConfig.getRangeByIndexes(5, 0, accessoryRows.length, 9))
inputFill(accessoryConfig.getRangeByIndexes(5, 2, accessoryRows.length, 6))
accessoryConfig.getRangeByIndexes(5, 8, accessoryRows.length, 1).format = { wrapText: true }
accessoryConfig.freezePanes.freezeRows(5)
accessoryConfig.tables.add(`A5:I${5 + accessoryRows.length}`, true, 'AccessoryConfigTable')

// Accessory log
title(accessoryLog, 'A1:Q1', 'Accessory Log')
setWidths(accessoryLog, [100, 85, 160, 190, 80, 75, 75, 75, 75, 75, 75, 75, 75, 95, 115, 115, 280])
accessoryLog.getRange('A3:Q3').merge()
accessoryLog.getRange('A3:Q3').values = [['Log accessories here. If all required sets hit the top of the rep range with RIR >= 2, Suggested Next Weight adds the configured increment.']]
accessoryLog.getRange('A3:Q3').format = { fill: theme.paleBlue, wrapText: true }
const logHeaders = [
  'Date',
  'Session',
  'Slot',
  'Exercise',
  'Weight',
  'Set1 Reps',
  'Set1 RIR',
  'Set2 Reps',
  'Set2 RIR',
  'Set3 Reps',
  'Set3 RIR',
  'Set4 Reps',
  'Set4 RIR',
  'All Sets Logged?',
  'Hit Top + Reserve?',
  'Suggested Next',
  'Notes',
]
accessoryLog.getRange('A5:Q5').values = [logHeaders]
styleHeader(accessoryLog.getRange('A5:Q5'))
const logRows = 200
styleBody(accessoryLog.getRange(`A6:Q${5 + logRows}`))
inputFill(accessoryLog.getRange(`A6:M${5 + logRows}`))
inputFill(accessoryLog.getRange(`Q6:Q${5 + logRows}`))
const logFormulas = []
for (let row = 6; row <= 5 + logRows; row += 1) {
  const sets = configLookup(row, 'D')
  const repHigh = configLookup(row, 'F')
  const increment = configLookup(row, 'H')
  const enoughSets = `COUNT(F${row},H${row},J${row},L${row})>=${sets}`
  const minReps = `MIN(F${row},H${row},J${row},IF(${sets}=4,L${row},999))>=${repHigh}`
  const minRir = `MIN(G${row},I${row},K${row},IF(${sets}=4,M${row},999))>=2`
  logFormulas.push([
    `=IF(A${row}="","",${enoughSets})`,
    `=IF(A${row}="","",AND(N${row},${minReps},${minRir}))`,
    `=IF(A${row}="","",IF(E${row}="","",IF(O${row},E${row}+${increment},E${row})))`,
  ])
}
accessoryLog.getRange(`N6:P${5 + logRows}`).formulas = logFormulas
accessoryLog.getRange(`A6:A${5 + logRows}`).format.numberFormat = 'yyyy-mm-dd'
accessoryLog.getRange(`E6:E${5 + logRows}`).format.numberFormat = '0.0'
accessoryLog.getRange(`P6:P${5 + logRows}`).format.numberFormat = '0.0'
accessoryLog.freezePanes.freezeRows(5)
accessoryLog.tables.add(`A5:Q${5 + logRows}`, true, 'AccessoryLogTable')
try {
  accessoryLog.dataValidations.add({ range: `B6:B${5 + logRows}`, rule: { type: 'list', values: ['Squat', 'Bench', 'Assist', 'Deadlift'] } })
  accessoryLog.dataValidations.add({ range: `C6:C${5 + logRows}`, rule: { type: 'list', formula1: 'Accessory_Config!$B$6:$B$23' } })
} catch {
  // Data validation is helpful but not required for formula compatibility.
}

// Dashboard
title(dashboard, 'A1:H1', 'Workout Comeback Dashboard')
setWidths(dashboard, [150, 120, 120, 120, 30, 130, 130, 130, 130, 130, 130])
dashboard.getRange('A3:D3').values = [['Metric', 'Value', 'Target / Rule', 'Notes']]
styleHeader(dashboard.getRange('A3:D3'))
dashboard.getRange('A4:D11').values = [
  ['Selected Week', null, '1-4', 'Use this as the week filter/reference for Weekly_View.'],
  ['Squat TM', null, 'Auto', 'From Setup table.'],
  ['Bench TM', null, 'Auto', 'Bench uses 80% TM by default.'],
  ['Deadlift TM', null, 'Auto', 'From current comeback seed.'],
  ['Rows Done', null, 'Weekly_Log', 'Rows marked Done in Weekly_View.'],
  ['Accessory Done', null, 'Weekly_Log', 'Accessory rows marked Done in Weekly_View.'],
  ['Current Phase', 'Rebuild', 'Guarded progression', 'One heavy deadlift day plus one assistance day.'],
  ['Rule', 'No grinders', 'Stop at RPE 8', 'Bench pain blocks progression.'],
]
styleBody(dashboard.getRange('A4:D11'))
dashboard.getRange('B4').formulas = [['=Setup!$B$6']]
dashboard.getRange('B5').formulas = [['=Setup!$G$11']]
dashboard.getRange('B6').formulas = [['=Setup!$G$12']]
dashboard.getRange('B7').formulas = [['=Setup!$G$13']]
dashboard.getRange('B8').formulas = [[`=COUNTIF(Weekly_View!$W$6:$W$${5 + weeklyRows.length},"Done")`]]
dashboard.getRange('B9').formulas = [[`=COUNTIFS(Weekly_View!$F$6:$F$${5 + weeklyRows.length},"Accessory",Weekly_View!$W$6:$W$${5 + weeklyRows.length},"Done")`]]
dashboard.getRange('B5:B7').format.numberFormat = '0.0'
dashboard.getRange('F3:G6').values = [
  ['Lift', 'Training Max'],
  ['Squat', null],
  ['Bench', null],
  ['Deadlift', null],
]
styleHeader(dashboard.getRange('F3:G3'))
styleBody(dashboard.getRange('F4:G6'))
dashboard.getRange('G4:G6').formulas = [['=Setup!$G$11'], ['=Setup!$G$12'], ['=Setup!$G$13']]
dashboard.getRange('G4:G6').format.numberFormat = '0.0'
try {
  const chart = dashboard.charts.add('bar', dashboard.getRange('F3:G6'))
  chart.title = 'Training Maxes'
  chart.hasLegend = false
  chart.yAxis = { numberFormatCode: '0 kg' }
  chart.setPosition('F8', 'K22')
} catch {
  // The workbook remains useful if a renderer cannot place the chart.
}

// Render previews for visual verification.
await fs.mkdir(outputDir, { recursive: true })
const inspect = await workbook.inspect({
  kind: 'table',
  range: 'Setup!A1:H14',
  include: 'values,formulas',
  tableMaxRows: 20,
  tableMaxCols: 10,
  maxChars: 4000,
})
console.log(inspect.ndjson)
const errors = await workbook.inspect({
  kind: 'match',
  searchTerm: '#REF!|#DIV/0!|#VALUE!|#NAME\\?|#N/A',
  options: { useRegex: true, maxResults: 100 },
  summary: 'formula error scan',
  maxChars: 2000,
})
console.log(errors.ndjson)

for (const sheetName of ['Dashboard', 'Setup', 'Weekly_View', 'History', 'Accessory_Config', 'Accessory_Log']) {
  const preview = await workbook.render({ sheetName, autoCrop: 'all', scale: 1, format: 'png' })
  await fs.writeFile(path.join(outputDir, `${sheetName}.png`), new Uint8Array(await preview.arrayBuffer()))
}

const xlsx = await SpreadsheetFile.exportXlsx(workbook)
await xlsx.save(outputPath)
console.log(`EXPORTED ${outputPath}`)
