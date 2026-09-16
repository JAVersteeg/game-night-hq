# Feature Ideas Backlog

Unscheduled ideas for future stages. Not committed to — see CLAUDE.md for what's already in scope (v1 flows, Non-Goals, Deferred Features).

1. **Achievements/badges** — per-group, fully derived badges (milestones, streaks, per-game domination, weekly player, pass-on badges like "Grote Daggoe"). See [achievements-badges.md](achievements-badges.md).
2. **Session notes/photos** — free-text note or photo attached to a session. Needs `sessions.note` column and Supabase Storage.
3. **Rematch/quick restart button** — from a finished session, start a new one pre-filled with the same template, group, and participants.
4. **Group activity feed** — chronological feed on the dashboard ("Jochem won Puntensaldo, 45-32"), built from existing session data only.
5. **Elo/skill rating per game** — alternative derived stat to win %. Nontrivial math (K-factor, multiplayer variants) — worth its own stage/decision.
6. **Team/partnership games** — support 2v2-style team play. Real domain model change (a team concept alongside participants), bigger lift — needs an Open Decision if pursued.
7. **Game suggestion ("what to play tonight")** — surface a game a group hasn't played recently, based on history.
8. **Push notifications for session start** — currently a stated Non-Goal in CLAUDE.md; parked unless that's revisited.
9. **Shareable session result image** — export a finished session's scoreboard as an image to share outside the app.
