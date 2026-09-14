The full-width action button used at the bottom of every form and empty state.

```jsx
<Button label="Doorgaan" onClick={submit} />
<Button label="Groep aanmaken" variant="secondary" onClick={create} />
<Button label="Annuleren" variant="ghost" onClick={close} />
```

- `variant`: `primary` (clay fill, near-black `--accent-fg` text), `secondary` (sunken warm dark), `ghost` (hairline border, transparent).
- `isLoading` replaces the label with a spinner and applies the disabled opacity (0.5).
- Buttons stretch to their container. In the app they sit in a wrapper with 24px of space above.
- One primary button per screen. Never two side by side.
