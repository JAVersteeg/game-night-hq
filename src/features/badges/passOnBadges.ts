import { format } from 'date-fns';

/**
 * Pass-on badges: "badge X is held by whoever most recently satisfied condition Y". One holder at
 * a time, nothing stored — every badge is a pair of pure functions over the group's finished
 * sessions, so a new badge is a new definition and never a new table or write path.
 */

/** One finished session, reduced to the handful of facts every badge condition is written against. */
export interface DerivedSession {
  id: string;
  playedAt: string;
  templateId: string;
  gameName: string;
  /** The game library key (`catan`, `dalmuti`, …) or undefined for a hand-made template. */
  gameKey: string | undefined;
  participantIds: string[];
  /** All of them on a tie, same as everywhere else in the app. */
  winnerIds: string[];
  /** The single worst finisher, or null when the table tied for last (or there was no table). */
  lastPlaceId: string | null;
}

export interface PassOnHolder {
  userId: string;
  /** The figure under the holder's name ("64% uit 14 potjes"). Null falls back to "sinds <datum>". */
  metric: string | null;
}

/** One player's row in a badge's ranking. */
export interface BadgeStanding {
  userId: string;
  /** What the row is sorted on; only the label is shown. */
  value: number;
  valueLabel: string;
  /** The line under the name ("4 uit 14 potjes"). */
  meta: string;
  played: number;
  /** False below the badge's minimum sample: still listed, but can't hold it yet. */
  eligible: boolean;
}

/** A badge's ranking as the detail screen shows it: what the figure is, what it means, and the
 *  players in order. */
export interface BadgeStandings {
  label: string;
  explanation: string;
  rows: BadgeStanding[];
}

export interface PassOnBadgeDefinition {
  id: string;
  name: string;
  /** The one-liner under the badge name on the card. */
  condition: string;
  /** The fuller explanation on the detail screen. */
  description: string;
  /** Key into `BADGE_ART`; null for a badge nobody has drawn yet. */
  artKey: string | null;
  /** Featured badges get the big hexagon cards at the top of the screen — art is what earns that. */
  featured: boolean;
  /** Whether the holder wears this badge on their avatar everywhere in the group. Needs `artKey`:
   *  a badge without a drawing has nothing to show at avatar size. */
  avatarMark: boolean;
  /** Whether this session can move the badge at all. */
  qualifies: (session: DerivedSession) => boolean;
  /** Who holds it after every qualifying session up to and including the last one in the list. */
  resolve: (qualifying: DerivedSession[]) => PassOnHolder | null;
  /** The standings behind the badge, for the detail screen. Only badges whose condition is a
   *  ranking have one — "wie was laatst als laatste" has nothing to rank. */
  standings?: (qualifying: DerivedSession[]) => BadgeStandings;
}

export interface BadgeTemplate {
  id: string;
  name: string;
  gameKey: string | undefined;
}

/** Below this a winstfactor says more about the sample than the player — one lucky avond can
 *  almost double it — so nobody under it can hold the badge, however high they rank.
 *  `docs/ideas/achievements-badges.md` names 8; the exact number is still open. */
export const MIN_SESSIONS_FOR_DOMINATION = 8;
/** 1,0× is what pure chance hands out, so the holder has to be at least at chance level. */
const MIN_WIN_FACTOR_FOR_DOMINATION = 1;
/** A "reeks" of one is just a win, so the streak badge only exists from two consecutive wins up. */
const MIN_WIN_STREAK = 2;
/** Same reasoning for showing up: one avond is not a reeks. */
const MIN_ATTENDANCE_STREAK = 2;

/** A speelavond is a date, not a session — a night where the group played three potjes is one
 *  avond, and being there for any of them counts as showing up. */
export function sessionDayKey(playedAt: string): string {
  return format(new Date(playedAt), 'yyyy-MM-dd');
}

/** "Grote Daggoe" and its kin: held by whoever came last in the most recent potje of one game. */
function lastPlaceBadge(template: BadgeTemplate): PassOnBadgeDefinition {
  const isDaggoe = template.gameKey === 'dalmuti';

  return {
    id: `laatste-${template.id}`,
    name: isDaggoe ? 'Grote Daggoe' : `Rode lantaarn ${template.name}`,
    condition: `Laatste plaats, ${template.name}`,
    description: isDaggoe
      ? 'Balen man, jij bent de grote daggoe. Kan alleen maar afgestaan worden door de volgende keer niet te verliezen.'
      : `Voor wie als laatste eindigde in het meest recente potje ${template.name}. Een houder tegelijk, tot iemand anders laatste wordt.`,
    artKey: isDaggoe ? 'grote_daggoe' : null,
    featured: isDaggoe,
    avatarMark: isDaggoe,
    qualifies: (session) => session.templateId === template.id,
    // Walks back rather than reading the last session: a potje that ended in a tie for last has no
    // single loser, so it leaves the badge where it was instead of taking it off the board.
    resolve: (qualifying) => {
      for (let index = qualifying.length - 1; index >= 0; index -= 1) {
        const lastPlaceId = qualifying[index].lastPlaceId;
        if (lastPlaceId) return { userId: lastPlaceId, metric: null };
      }
      return null;
    },
  };
}

/**
 * The name a game's domination badge carries, keyed by game library key (the same key
 * `GAME_COVERS` and a template's `cover_key` use). Every game gets its own title rather than a
 * generic "Koning van X" — the badge is half the joke, so it's worth naming each one. A template
 * that isn't in the library, or a game nobody has named yet, falls back to "Koning van <naam>".
 */
export const DOMINATION_BADGE_NAMES: Record<string, string> = {
  catan: 'Koning van Catan',
  dalmuti: 'Leenheer',
  heat: 'Hottest man alive',
  arschmallows: 'Beste akka',
  terraforming_mars: 'Heerser van Mars',
};

function dominationName(template: BadgeTemplate): string {
  const named = template.gameKey ? DOMINATION_BADGE_NAMES[template.gameKey] : undefined;
  return named ?? `Koning van ${template.name}`;
}

/** Dutch decimals, same as the stats screens — every number here is read out loud at the table. */
function decimal(value: number): string {
  return value.toFixed(1).replace('.', ',');
}

/**
 * The winstfactor ranking behind a domination badge: wins divided by the wins pure chance would
 * hand out at the table sizes this player actually sat at (Σ 1/deelnemers), so beating five people
 * counts for more than beating two. 1,0× is chance. Same metric as the group dashboard's
 * Winstfactor column, computed here from the sessions rather than re-read from `useGameStats` —
 * this list is per badge, and the badge already has its own sessions in hand.
 *
 * Ordered best first, with everyone below the minimum sample after everyone above it: the ranking
 * is the badge's own pecking order, so people who can't hold it yet sit under the line.
 */
function dominationStandings(qualifying: DerivedSession[]): BadgeStanding[] {
  const tally = new Map<string, { played: number; wins: number; expected: number }>();

  for (const session of qualifying) {
    for (const userId of session.participantIds) {
      const entry = tally.get(userId) ?? { played: 0, wins: 0, expected: 0 };
      entry.played += 1;
      entry.wins += session.winnerIds.includes(userId) ? 1 : 0;
      entry.expected += 1 / session.participantIds.length;
      tally.set(userId, entry);
    }
  }

  return Array.from(tally, ([userId, entry]) => {
    const factor = entry.expected === 0 ? 0 : entry.wins / entry.expected;
    return {
      userId,
      value: factor,
      valueLabel: `${decimal(factor)}×`,
      meta: `${entry.wins} uit ${entry.played} potjes`,
      played: entry.played,
      eligible: entry.played >= MIN_SESSIONS_FOR_DOMINATION,
    };
  }).sort(
    (a, b) => Number(b.eligible) - Number(a.eligible) || b.value - a.value || b.played - a.played,
  );
}

/** "Koning van Catan" and its kin: held by the highest winstfactor within one game. */
function dominationBadge(template: BadgeTemplate): PassOnBadgeDefinition {
  return {
    id: `koning-${template.id}`,
    name: dominationName(template),
    condition: `Hoogste winstfactor, ${template.name}`,
    description: `Voor wie de hoogste winstfactor heeft bij ${template.name}, met minimaal ${MIN_SESSIONS_FOR_DOMINATION} potjes op de teller, en meer potjes gewonnen dan puur toeval zou opleveren.`,
    artKey: template.gameKey === 'catan' ? 'koning_van_catan' : null,
    featured: template.gameKey === 'catan',
    avatarMark: false,
    qualifies: (session) => session.templateId === template.id,
    resolve: (qualifying) => {
      // The ranking is already sorted with the eligible players on top, so the badge goes to the
      // first row that also wins more often than chance would — leading a game nobody is good at
      // isn't domination, so below 1,0× the badge stays unheld.
      const leader = dominationStandings(qualifying).find(
        (row) => row.eligible && row.value >= MIN_WIN_FACTOR_FOR_DOMINATION,
      );
      if (!leader) return null;
      return { userId: leader.userId, metric: `${leader.valueLabel} uit ${leader.played} potjes` };
    },
    standings: (qualifying) => ({
      label: 'Winstfactor',
      explanation: `Hoe vaak je wint vergeleken met wat puur toeval zou opleveren bij deze tafelgroottes; 1,0× is toeval. Vanaf ${MIN_SESSIONS_FOR_DOMINATION} potjes kun je de badge pakken.`,
      rows: dominationStandings(qualifying),
    }),
  };
}

/** Group-wide: the longest run of wins anyone has strung together, over every game. */
const LONGEST_STREAK_BADGE: PassOnBadgeDefinition = {
  id: 'langste-reeks',
  name: 'Langste winstreeks',
  condition: 'Meeste winsten op een rij',
  description:
    'Voor wie de langste reeks gewonnen potjes op zijn naam heeft staan, over alle spellen in de groep. Alleen potjes waar je zelf bij was tellen mee in de reeks.',
  artKey: null,
  featured: false,
  avatarMark: false,
  qualifies: () => true,
  resolve: (qualifying) => {
    const running = new Map<string, number>();
    let best: { userId: string; streak: number } | null = null;

    for (const session of qualifying) {
      for (const userId of session.participantIds) {
        const streak = session.winnerIds.includes(userId) ? (running.get(userId) ?? 0) + 1 : 0;
        running.set(userId, streak);
        // `>=` rather than `>`: on a tie the badge moves to whoever matched it most recently,
        // which is what makes it a pass-on badge rather than a permanent first-past-the-post.
        if (streak >= MIN_WIN_STREAK && (!best || streak >= best.streak)) {
          best = { userId, streak };
        }
      }
    }

    if (!best) return null;
    return { userId: best.userId, metric: `${best.streak} winsten op een rij` };
  },
};

/** Group-wide: the longest run of speelavonden anyone turned up for without missing one. The
 *  attendance counterpart to `LONGEST_STREAK_BADGE` — same shape, counted per avond instead of
 *  per potje, and won by showing up rather than by winning. */
const LONGEST_ATTENDANCE_BADGE: PassOnBadgeDefinition = {
  id: 'langste-aanwezigheidsreeks',
  name: 'Langste aanwezigheidsreeks',
  condition: 'Meeste avonden op een rij',
  description:
    'Voor wie de meeste speelavonden op een rij is komen opdagen, zonder er één te missen. Een avond telt zodra je bij één potje van die dag meedeed.',
  artKey: null,
  featured: false,
  avatarMark: false,
  qualifies: () => true,
  resolve: (qualifying) => {
    // Chronological, since `qualifying` is and a Map keeps insertion order: one entry per avond,
    // holding everyone who played at least one potje that day.
    const attendeesByNight = new Map<string, Set<string>>();
    for (const session of qualifying) {
      const night = sessionDayKey(session.playedAt);
      const attendees = attendeesByNight.get(night) ?? new Set<string>();
      for (const userId of session.participantIds) attendees.add(userId);
      attendeesByNight.set(night, attendees);
    }

    const running = new Map<string, number>();
    let best: { userId: string; streak: number } | null = null;

    for (const attendees of attendeesByNight.values()) {
      // Everyone who has ever turned up is scored every avond, not just the people who were
      // there — missing one is exactly what has to break a streak.
      for (const userId of attendees) running.set(userId, running.get(userId) ?? 0);

      for (const [userId, previous] of running) {
        const streak = attendees.has(userId) ? previous + 1 : 0;
        running.set(userId, streak);
        // `>=`, same as the win streak: a tie goes to whoever matched it most recently.
        if (streak >= MIN_ATTENDANCE_STREAK && (!best || streak >= best.streak)) {
          best = { userId, streak };
        }
      }
    }

    if (!best) return null;
    return { userId: best.userId, metric: `${best.streak} avonden op een rij` };
  },
};

/**
 * Which pass-on badges exist in this group. Derived from the group's own game templates, so a
 * group that never plays Dalmuti never sees a Grote Daggoe, and every played game gets its own
 * "Koning van" — the domination mechanic repeated per template, which is the pattern the brief
 * asks for rather than a one-off per badge.
 */
export function buildPassOnBadges(
  templates: BadgeTemplate[],
  sessions: DerivedSession[],
): PassOnBadgeDefinition[] {
  const playedTemplateIds = new Set(sessions.map((session) => session.templateId));

  const lastPlace = templates
    .filter((template) => template.gameKey === 'dalmuti')
    .map(lastPlaceBadge);

  // A template nobody has played yet would only add a permanently empty row, so it's left out —
  // except Catan, whose badge is one of the two headline ones and has to exist to be aimed at.
  const domination = templates
    .filter((template) => template.gameKey === 'catan' || playedTemplateIds.has(template.id))
    .map(dominationBadge);

  const badges = [...lastPlace, ...domination, LONGEST_STREAK_BADGE, LONGEST_ATTENDANCE_BADGE];
  return badges.sort((a, b) => Number(b.featured) - Number(a.featured));
}

export interface HolderPeriod {
  userId: string;
  metric: string | null;
  from: string;
  /** Null while this is the current holder. */
  to: string | null;
}

/**
 * Who held a badge when, by replaying the group's sessions in order and asking the definition
 * after each one. Quadratic in the number of qualifying sessions, since `resolve` re-reads the
 * whole prefix — at friend-group scale that's a few hundred iterations, and it keeps a badge
 * definition to two plain functions with no incremental-state contract to get wrong.
 */
export function replayHolders(
  definition: PassOnBadgeDefinition,
  sessions: DerivedSession[],
): HolderPeriod[] {
  const qualifying = sessions.filter(definition.qualifies);
  const periods: HolderPeriod[] = [];

  for (let index = 0; index < qualifying.length; index += 1) {
    const holder = definition.resolve(qualifying.slice(0, index + 1));
    if (!holder) continue;

    const current = periods[periods.length - 1];
    if (current && current.userId === holder.userId) {
      // Same holder, possibly a better figure — the badge didn't move, so the period doesn't split.
      current.metric = holder.metric;
      continue;
    }

    if (current) current.to = qualifying[index].playedAt;
    periods.push({
      userId: holder.userId,
      metric: holder.metric,
      from: qualifying[index].playedAt,
      to: null,
    });
  }

  return periods;
}
