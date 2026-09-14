The app's text input, used for the display name and for naming groups and games.

```jsx
<TextField value={name} onChange={setName} placeholder="Je naam" maxLength={40} />
<TextField value={name} onChange={setName} error="Je naam kon niet worden opgeslagen." />
```

- Focus retints the border to `--accent`; there is no focus ring or glow.
- Display names cap at 40 characters (`MAX_DISPLAY_NAME_LENGTH` in the app).
- Placeholders are examples ("Je naam"), not instructions ("Vul je naam in").
