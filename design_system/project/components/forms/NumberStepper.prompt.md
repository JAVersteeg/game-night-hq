One scoring field during live entry, or one numeric field in a game template.

```jsx
<NumberStepper label="Nederzettingen" value={3} onChange={setV} />
<NumberStepper label="Strafkaarten" value={2} sign={-1} onChange={setV} />
```

- Tap targets are 40px; the value is also typeable because some fields go up in tens.
- `sign={-1}` adds a small "telt af" note in danger colour. Do not use a minus icon for it — the sign belongs to the field, not to the button the scorekeeper just pressed.
