Selectable row for a set of options — one of (radio) or any of (check).

```jsx
<ChoiceRow title="Hoogste totaal wint" selected={dir === 'high'} onSelect={() => setDir('high')} />
<ChoiceRow mode="check" title="Mara de Wit" left={<Avatar displayName="Mara de Wit" size={32} />} selected onSelect={toggle} />
```

- Selected rows fill with `--accent-soft` and take an `--accent-line` border. The mark alone is not enough signal on a phone.
- The whole row is the tap target.
