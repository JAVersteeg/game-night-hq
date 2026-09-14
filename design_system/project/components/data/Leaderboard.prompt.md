Per-game leaderboard table: rank, player, then up to three numeric columns.

```jsx
<Leaderboard
  columns={['Gespeeld', 'Winst', 'Gem.']}
  rows={[{ name: 'Mara de Wit', values: [12, '42%', 8.4] }, { name: 'Jasper', values: [12, '25%', 7.1], highlight: true }]}
  renderAvatar={(r) => <Avatar displayName={r.name} size={24} />}
/>
```

- Numbers are tabular and right-aligned; the player column truncates.
- `highlight` tints the signed-in user's row with `--surface-muted`. Never bold a row instead.
- Three columns maximum at phone width.
