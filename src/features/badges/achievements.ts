import { format } from 'date-fns';
import { nl } from 'date-fns/locale';

import type { DerivedSession } from '@/features/badges/passOnBadges';
import { sessionDayKey } from '@/features/badges/passOnBadges';

/**
 * Achievements: per-player milestones, cumulative and never lost — the counterpart to the pass-on
 * badges, which only ever have one holder. Like everything else here they're derived on read from
 * the group's session history, so there is no "you earned this" moment to fire.
 */
export interface Achievement {
  id: string;
  name: string;
  target: number;
  /** How far this player is, capped at `target` once reached. */
  current: number;
  /** The line under the name once it's been reached; null while it hasn't. */
  achievedLabel: string | null;
}

interface AchievementDefinition {
  id: string;
  name: string;
  target: number;
  /** Progress plus the session that pushed it over the line, if any. */
  measure: (input: PlayerHistory) => { current: number; achievedLabel: string | null };
}

interface PlayerHistory {
  userId: string;
  /** The player's own sessions, oldest first. */
  played: DerivedSession[];
  /** Every distinct date the group played, oldest first, as `yyyy-MM-dd`. */
  groupNights: string[];
  /** The nights this player was there, as `yyyy-MM-dd`. */
  attendedNights: Set<string>;
  target: number;
}

function onDate(playedAt: string): string {
  return `Gehaald op ${format(new Date(playedAt), 'd MMM', { locale: nl })}`;
}

/** The Nth potje a player took part in — the shape every "x potjes" milestone shares. */
function sessionCount({ played, target }: PlayerHistory) {
  return {
    current: played.length,
    achievedLabel: played.length >= target ? onDate(played[target - 1].playedAt) : null,
  };
}

/** Longest run of consecutive potjes (of the ones this player was at) that they won. */
function winStreak({ played, target, userId }: PlayerHistory) {
  let run = 0;
  let best = 0;
  let reachedAt: string | null = null;

  for (const session of played) {
    run = session.winnerIds.includes(userId) ? run + 1 : 0;
    if (run > best) best = run;
    if (run === target && !reachedAt) reachedAt = session.playedAt;
  }

  return { current: best, achievedLabel: reachedAt ? onDate(reachedAt) : null };
}

/** Most distinct days played inside one calendar month — "weekly player", per the brief. */
function daysInOneMonth({ played, target }: PlayerHistory) {
  const daysByMonth = new Map<string, Set<string>>();
  let best = 0;
  let reachedIn: string | null = null;

  for (const session of played) {
    const date = new Date(session.playedAt);
    const month = format(date, 'yyyy-MM');
    const days = daysByMonth.get(month) ?? new Set<string>();
    days.add(format(date, 'yyyy-MM-dd'));
    daysByMonth.set(month, days);

    if (days.size > best) best = days.size;
    if (days.size === target && !reachedIn) {
      reachedIn = `Gehaald in ${format(date, 'MMMM', { locale: nl })}`;
    }
  }

  return { current: best, achievedLabel: reachedIn };
}

/** Longest run of the group's game nights attended without missing one. */
function attendanceStreak({ groupNights, attendedNights, target }: PlayerHistory) {
  let run = 0;
  let best = 0;
  let reachedAt: string | null = null;

  for (const night of groupNights) {
    run = attendedNights.has(night) ? run + 1 : 0;
    if (run > best) best = run;
    if (run === target && !reachedAt) reachedAt = night;
  }

  return { current: best, achievedLabel: reachedAt ? onDate(reachedAt) : null };
}

/** How many different games in this group the player has actually sat down for. */
function distinctGames({ played, target }: PlayerHistory) {
  const templateIds = new Set<string>();
  let reachedAt: string | null = null;

  for (const session of played) {
    templateIds.add(session.templateId);
    if (templateIds.size === target && !reachedAt) reachedAt = session.playedAt;
  }

  return { current: templateIds.size, achievedLabel: reachedAt ? onDate(reachedAt) : null };
}

const ACHIEVEMENTS: AchievementDefinition[] = [
  { id: 'potjes-10', name: '10 potjes', target: 10, measure: sessionCount },
  { id: 'potjes-25', name: '25 potjes', target: 25, measure: sessionCount },
  { id: 'potjes-50', name: '50 potjes', target: 50, measure: sessionCount },
  { id: 'winsten-3', name: '3 winsten op een rij', target: 3, measure: winStreak },
  { id: 'winsten-5', name: '5 winsten op een rij', target: 3, measure: winStreak },
  { id: 'avonden-5', name: '5 avonden op een rij', target: 5, measure: attendanceStreak },
  { id: 'avonden-10', name: '10 avonden op een rij', target: 5, measure: attendanceStreak },
];

/**
 * One player's achievements, in the order `ACHIEVEMENTS` defines them — the list reads the same
 * for everyone, so the row a player is looking for sits in the same place on every profile rather
 * than moving as they progress. That order is set above, not here.
 */
export function computeAchievements(userId: string, sessions: DerivedSession[]): Achievement[] {
  const played = sessions.filter((session) => session.participantIds.includes(userId));

  const groupNights = Array.from(
    new Set(sessions.map((session) => sessionDayKey(session.playedAt))),
  );
  const attendedNights = new Set(played.map((session) => sessionDayKey(session.playedAt)));

  return ACHIEVEMENTS.map((definition) => {
    const { current, achievedLabel } = definition.measure({
      userId,
      played,
      groupNights,
      attendedNights,
      target: definition.target,
    });

    return {
      id: definition.id,
      name: definition.name,
      target: definition.target,
      current: Math.min(current, definition.target),
      achievedLabel,
    };
  });
}
