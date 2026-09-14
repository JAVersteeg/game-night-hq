Circular initials badge for a player, used in the group header, member lists and the profile screen.

```jsx
<Avatar displayName="Jasper Versteeg" size={40} />
<Avatar displayName="Mara" size={96} />
```

- Sizes in use: 40 (header button, list rows), 96 (profile hero). Any number works — it drives diameter and font size together.
- Always initials on `--accent-soft` with `--accent-soft-fg` text; photo upload does not exist yet.
- Never renders empty: a blank name falls back to `?`.
