Final totals for one session, as bars in finishing order.

```jsx
<ScoreBars rows={[{ name: 'Mara de Wit', total: 11 }, { name: 'Jasper', total: 9 }]} />
```

- Pass rows already sorted by the game's scoring direction; the component does not sort.
- Row one is the winner and gets `--success`; everyone else gets `--clay-700`. Bars are scaled to the largest absolute total.
