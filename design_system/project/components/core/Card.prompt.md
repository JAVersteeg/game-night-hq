The bordered, unshadowed container behind every row, field and panel; `ListRow` is the pre-composed tappable version.

```jsx
<ListRow title="Donderdagclub" meta="6 leden" onClick={open} />
<Card tone="muted">
  Je persoonlijke statistieken verschijnen hier zodra je spellen hebt gespeeld.
</Card>
```

- Never add a drop shadow. Elevation in this brand is a hairline border plus a surface tint.
- `tone="muted"` is for content that is not there yet (empty stats, placeholders).
- Rows in a list are separated by `--list-gap` (12px), not by dividers.
