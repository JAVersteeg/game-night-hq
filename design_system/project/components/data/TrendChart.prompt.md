Score trend over session history, one line per player.

```jsx
<TrendChart
  labels={['5/8', '19/8', '2/9', '12/9']}
  series={[
    { name: 'Mara', color: 'var(--series-2)', points: [8, 10, 7, 11] },
    { name: 'Jasper', color: 'var(--series-1)', points: [6, 9, 9, 8] },
  ]}
/>
```

- Assign colours from `--series-1` … `--series-6` in group-member order and keep them stable across every chart on the screen.
- Four to six players maximum before the lines stop being readable; beyond that show the leaderboard instead.
- No area fills, no gradients, no animation, no tooltips.
