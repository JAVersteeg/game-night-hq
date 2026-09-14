Headline number for the top of a stats screen.

```jsx
<div style={{display:'flex', gap:'var(--space-3)'}}>
  <StatTile value="12" label="avonden" />
  <StatTile value="42" unit="%" label="winst" />
  <StatTile value="8.4" label="gem. score" />
</div>
```

- Three across at phone width. Four is too tight; two looks unfinished.
- No trend arrows, no colour on the number, no sparkline inside.
