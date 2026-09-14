Centred empty-list message, used when a group list, history tab or stats panel has no rows.

```jsx
<EmptyState
  title="Nog geen groepen"
  body="Maak een groep voor jullie spelavonden, of sluit je aan bij een groep met een uitnodigingscode van een vriend."
  action={<Button label="Groep aanmaken" onClick={create} />}
/>
```

- Title states the fact; body offers both routes forward. No exclamation marks, no illustration, no emoji.
