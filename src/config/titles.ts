export type Metric =
  | 'activeDays'
  | 'workouts'
  | 'volume'
  | 'prs'
  | 'bosses'
  | 'bodyLogs'
  | 'progressPhotos'
  | 'checkins'
  | 'checkinStreak'
  | 'journals'
  | 'habits'
  | 'habitStreak'
  | 'questDays'
  | 'questStreak'
  | 'penalties'
  | 'notes'
  | 'rank'
  | 'xp'
  | 'meals'
  | 'proteinDays'
  | 'proteinStreak'
  | 'kcalDays'
  | 'waterDays'

type Group = {
  metric: Metric
  category: string
  hint: (n: number) => string
  tiers: [number, string][]
}

const de = (n: number) => n.toLocaleString('de-DE')

export const TITLE_GROUPS: Group[] = [
  {
    metric: 'activeDays',
    category: 'Ausdauer',
    hint: (n) => (n === 1 ? 'Ersten Tag in der App' : `An ${de(n)} Tagen aktiv`),
    tiers: [
      [1, 'Erwacht'],
      [3, 'Neuling'],
      [7, 'Anwärter'],
      [14, 'Lehrling'],
      [30, 'Beständiger'],
      [60, 'Gefestigter'],
      [100, 'Hundertfacher'],
      [180, 'Halbjahres-Jäger'],
      [365, 'Jahres-Jäger'],
    ],
  },
  {
    metric: 'workouts',
    category: 'Training',
    hint: (n) => (n === 1 ? 'Erstes Training abschließen' : `${de(n)} Trainings abschließen`),
    tiers: [
      [1, 'Eisenhand'],
      [5, 'Schwitzender'],
      [10, 'Krieger'],
      [25, 'Kämpfer'],
      [50, 'Veteran'],
      [100, 'Unermüdlich'],
      [150, 'Stahlkörper'],
      [200, 'Titan'],
      [300, 'Koloss'],
      [500, 'Unsterblicher'],
    ],
  },
  {
    metric: 'volume',
    category: 'Training',
    hint: (n) => `Insgesamt ${n >= 1000 ? `${de(n / 1000)} t` : `${de(n)} kg`} bewegt`,
    tiers: [
      [1000, 'Lastenträger'],
      [10000, 'Gewichtheber'],
      [50000, 'Schwerarbeiter'],
      [100000, 'Bergversetzer'],
      [250000, 'Erdbeweger'],
      [500000, 'Atlas'],
      [1000000, 'Weltenträger'],
    ],
  },
  {
    metric: 'prs',
    category: 'Training',
    hint: (n) => (n === 1 ? 'Ersten PR aufstellen' : `${de(n)} PRs aufstellen`),
    tiers: [
      [1, 'Grenzbrecher'],
      [5, 'Rekordjäger'],
      [10, 'Überwinder'],
      [25, 'Grenzenlos'],
      [50, 'Rekordmaschine'],
      [100, 'Legende der Hantel'],
    ],
  },
  {
    metric: 'bosses',
    category: 'Bosse',
    hint: (n) => (n === 1 ? 'Ersten Boss besiegen' : `${de(n)} Bosse besiegen`),
    tiers: [
      [1, 'Bezwinger'],
      [3, 'Boss-Jäger'],
      [5, 'Drachentöter'],
      [10, 'Dungeon-Meister'],
      [25, 'Monarch der Bosse'],
    ],
  },
  {
    metric: 'bodyLogs',
    category: 'Körper',
    hint: (n) => (n === 1 ? 'Körperdaten eintragen' : `An ${de(n)} Tagen Körperdaten eintragen`),
    tiers: [
      [1, 'Vermesser'],
      [10, 'Beobachter'],
      [30, 'Analytiker'],
      [100, 'Körperkenner'],
    ],
  },
  {
    metric: 'progressPhotos',
    category: 'Körper',
    hint: (n) => (n === 1 ? 'Erstes Fortschrittsfoto' : `${de(n)} Fortschrittsfotos`),
    tiers: [
      [1, 'Spiegelbild'],
      [10, 'Chronist'],
      [25, 'Verwandler'],
      [50, 'Metamorphose'],
    ],
  },
  {
    metric: 'checkins',
    category: 'Antrieb',
    hint: (n) => `${de(n)} Check-ins`,
    tiers: [
      [10, 'Selbstbeobachter'],
      [50, 'Achtsamer'],
      [100, 'Reflektierter'],
      [200, 'Innenschau'],
      [365, 'Selbstkenner'],
    ],
  },
  {
    metric: 'checkinStreak',
    category: 'Antrieb',
    hint: (n) => `Check-in ${de(n)} Tage am Stück`,
    tiers: [
      [3, 'Funke'],
      [7, 'Disziplin'],
      [14, 'Fokussiert'],
      [30, 'Eiserner Wille'],
      [60, 'Unbeugsam'],
      [100, 'Unerschütterlich'],
      [180, 'Gewohnheitstier'],
      [365, 'Ewige Flamme'],
    ],
  },
  {
    metric: 'journals',
    category: 'Antrieb',
    hint: (n) => (n === 1 ? 'Ersten Tagebucheintrag schreiben' : `${de(n)} Tagebucheinträge`),
    tiers: [
      [1, 'Schreiber'],
      [10, 'Erzähler'],
      [30, 'Chronist der Tage'],
      [100, 'Autor'],
      [250, 'Weiser'],
    ],
  },
  {
    metric: 'habits',
    category: 'Habits',
    hint: (n) => (n === 1 ? 'Ersten Habit abhaken' : `${de(n)} Habits abhaken`),
    tiers: [
      [1, 'Erster Schritt'],
      [25, 'Gewohnheitsbildner'],
      [100, 'Routinier'],
      [250, 'Automat'],
      [500, 'Meister der Routine'],
      [1000, 'Tausendfacher'],
    ],
  },
  {
    metric: 'habitStreak',
    category: 'Habits',
    hint: (n) => `Ein Habit ${de(n)} Tage am Stück`,
    tiers: [
      [7, 'Durchhalter'],
      [21, 'Neu verdrahtet'],
      [30, 'Monatsstreak'],
      [66, 'Gewohnheit verankert'],
      [100, 'Hundert Tage Stahl'],
      [180, 'Unaufhaltsam'],
      [365, 'Ein Jahr ohne Pause'],
    ],
  },
  {
    metric: 'questDays',
    category: 'Quests',
    hint: (n) => (n === 1 ? 'Einen Tag alle Quests erledigen' : `An ${de(n)} Tagen alle Quests erledigen`),
    tiers: [
      [1, 'Pflichtbewusst'],
      [7, 'Questläufer'],
      [30, 'Auftragserfüller'],
      [60, 'Zuverlässiger'],
      [100, 'Questmeister'],
      [200, 'Unermüdlicher Spieler'],
      [365, 'Systemtreuer'],
    ],
  },
  {
    metric: 'questStreak',
    category: 'Quests',
    hint: (n) => `${de(n)} Tage am Stück alle Quests`,
    tiers: [
      [3, 'Im Rhythmus'],
      [7, 'Wochenkrieger'],
      [14, 'Zwei Wochen Stahl'],
      [30, 'Monatsbezwinger'],
      [60, 'Der Unbeirrbare'],
      [100, 'Perfektionist'],
    ],
  },
  {
    metric: 'penalties',
    category: 'Quests',
    hint: (n) => (n === 1 ? 'Eine Penalty Quest erledigen' : `${de(n)} Penalty Quests erledigen`),
    tiers: [
      [1, 'Büßer'],
      [5, 'Wiedergutmacher'],
      [10, 'Strafe ertragen'],
      [25, 'Aus Fehlern gelernt'],
    ],
  },
  {
    metric: 'notes',
    category: 'Antrieb',
    hint: (n) => (n === 1 ? 'Erste Notiz schreiben' : `${de(n)} Notizen schreiben`),
    tiers: [
      [1, 'Notizgeber'],
      [25, 'Gedankensammler'],
      [100, 'Archivar'],
    ],
  },
  {
    metric: 'meals',
    category: 'Ernährung',
    hint: (n) => (n === 1 ? 'Erste Mahlzeit eintragen' : `${de(n)} Mahlzeiten eintragen`),
    tiers: [
      [1, 'Erster Bissen'],
      [50, 'Mahlzeitenzähler'],
      [200, 'Ernährungsbewusst'],
      [500, 'Kalorienbuchhalter'],
      [1000, 'Meister der Küche'],
    ],
  },
  {
    metric: 'proteinDays',
    category: 'Ernährung',
    hint: (n) => `An ${de(n)} Tagen das Eiweißziel schaffen`,
    tiers: [
      [7, 'Muskelfutter'],
      [30, 'Eiweißkrieger'],
      [100, 'Proteinmonarch'],
    ],
  },
  {
    metric: 'proteinStreak',
    category: 'Ernährung',
    hint: (n) => `${de(n)} Tage am Stück das Eiweißziel schaffen`,
    tiers: [
      [7, 'Eiweiß-Woche'],
      [30, 'Eiweiß-Monat'],
    ],
  },
  {
    metric: 'kcalDays',
    category: 'Ernährung',
    hint: (n) => `An ${de(n)} Tagen das Kalorienziel schaffen`,
    tiers: [
      [7, 'Gut genährt'],
      [30, 'Energiespeicher'],
      [100, 'Unerschöpflich'],
    ],
  },
  {
    metric: 'waterDays',
    category: 'Ernährung',
    hint: (n) => `An ${de(n)} Tagen das Wasserziel schaffen`,
    tiers: [
      [7, 'Durstlöscher'],
      [30, 'Quellwasser'],
      [100, 'Herr der Fluten'],
    ],
  },
  {
    metric: 'rank',
    category: 'Rang',
    hint: (n) => `Rang ${'EDCBAS'[n]} erreichen`,
    tiers: [
      [1, 'D-Rang-Jäger'],
      [2, 'C-Rang-Jäger'],
      [3, 'B-Rang-Jäger'],
      [4, 'A-Rang-Jäger'],
      [5, 'S-Rang-Jäger'],
    ],
  },
  {
    metric: 'xp',
    category: 'Rang',
    hint: (n) => `Insgesamt ${de(n)} XP sammeln`,
    tiers: [
      [1000, 'Aufsteiger'],
      [5000, 'Erfahrener'],
      [10000, 'Elite'],
      [20000, 'Auserwählter'],
      [30000, 'Schattenmonarch'],
    ],
  },
]

export const TITLES = TITLE_GROUPS.flatMap((g) =>
  g.tiers.map(([threshold, name]) => ({
    id: `${g.metric}-${threshold}`,
    name,
    category: g.category,
    metric: g.metric,
    threshold,
    hint: g.hint(threshold),
  })),
)

export type Title = (typeof TITLES)[number]
