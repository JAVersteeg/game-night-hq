/* @ds-bundle: {"format":4,"namespace":"GameNightHQDesignSystem_d57d33","components":[{"name":"Avatar","sourcePath":"components/core/Avatar.jsx"},{"name":"Button","sourcePath":"components/core/Button.jsx"},{"name":"Card","sourcePath":"components/core/Card.jsx"},{"name":"ListRow","sourcePath":"components/core/Card.jsx"},{"name":"EmptyState","sourcePath":"components/core/EmptyState.jsx"},{"name":"SectionLabel","sourcePath":"components/core/SectionLabel.jsx"},{"name":"TextField","sourcePath":"components/core/TextField.jsx"},{"name":"HeadToHead","sourcePath":"components/data/HeadToHead.jsx"},{"name":"Leaderboard","sourcePath":"components/data/Leaderboard.jsx"},{"name":"ScoreBars","sourcePath":"components/data/ScoreBars.jsx"},{"name":"StatTile","sourcePath":"components/data/StatTile.jsx"},{"name":"TrendChart","sourcePath":"components/data/TrendChart.jsx"},{"name":"Badge","sourcePath":"components/forms/Badge.jsx"},{"name":"ChoiceRow","sourcePath":"components/forms/ChoiceRow.jsx"},{"name":"NumberStepper","sourcePath":"components/forms/NumberStepper.jsx"},{"name":"SegmentedControl","sourcePath":"components/forms/SegmentedControl.jsx"}],"sourceHashes":{"components/core/Avatar.jsx":"28c29e994c17","components/core/Button.jsx":"3bf461adc523","components/core/Card.jsx":"e5fc89728c9c","components/core/EmptyState.jsx":"9123aad913d3","components/core/SectionLabel.jsx":"8c719e7409e3","components/core/TextField.jsx":"e4642c5adf91","components/data/HeadToHead.jsx":"7b3a0983417c","components/data/Leaderboard.jsx":"9db9545fba66","components/data/ScoreBars.jsx":"dbe69e06945e","components/data/StatTile.jsx":"5aeec8626511","components/data/TrendChart.jsx":"659be961e60c","components/forms/Badge.jsx":"64ded6ffc926","components/forms/ChoiceRow.jsx":"cf2f5051c23b","components/forms/NumberStepper.jsx":"06c51bd18cfe","components/forms/SegmentedControl.jsx":"d61794266a30","ui_kits/app/DisplayNameScreen.jsx":"7b4bc501f891","ui_kits/app/GameSetupScreens.jsx":"c6b4a6885b66","ui_kits/app/GroupDetailScreen.jsx":"eaa1b937b2a2","ui_kits/app/GroupListScreen.jsx":"59f20744d4d2","ui_kits/app/PhoneFrame.jsx":"ad6f06d0711d","ui_kits/app/ProfileScreen.jsx":"23959ade2827","ui_kits/app/SessionScreens.jsx":"ededc67cd637","ui_kits/app/data.jsx":"0c2c863132d1"},"inlinedExternals":[],"unexposedExports":[{"name":"initialsFrom","sourcePath":"components/core/Avatar.jsx"}]} */

(() => {

const __ds_ns = (window.GameNightHQDesignSystem_d57d33 = window.GameNightHQDesignSystem_d57d33 || {});

const __ds_scope = {};

(__ds_ns.__errors = __ds_ns.__errors || []);

// components/core/Avatar.jsx
try { (() => {
/** Up to two initials from a display name; '?' rather than an empty circle. */
function initialsFrom(displayName = '') {
  const words = String(displayName).trim().split(/\s+/).filter(Boolean);
  if (words.length === 0) return '?';
  if (words.length === 1) return words[0].slice(0, 1).toUpperCase();
  return (words[0].slice(0, 1) + words[words.length - 1].slice(0, 1)).toUpperCase();
}

/** Circular identity badge. One `size` number drives diameter and font size. */
function Avatar({
  displayName = '',
  size = 40,
  avatarUrl = null,
  style
}) {
  const box = {
    width: size,
    height: size,
    borderRadius: 'var(--radius-full)',
    flex: '0 0 auto'
  };
  if (avatarUrl) return /*#__PURE__*/React.createElement("img", {
    src: avatarUrl,
    alt: "",
    style: {
      ...box,
      objectFit: 'cover',
      ...style
    }
  });
  return /*#__PURE__*/React.createElement("span", {
    style: {
      ...box,
      display: 'inline-flex',
      alignItems: 'center',
      justifyContent: 'center',
      background: 'var(--accent-soft)',
      color: 'var(--accent-soft-fg)',
      fontFamily: 'var(--font-sans)',
      fontWeight: 'var(--weight-semibold)',
      fontSize: size * 0.4,
      lineHeight: 1,
      ...style
    }
  }, initialsFrom(displayName));
}
Object.assign(__ds_scope, { initialsFrom, Avatar });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/core/Avatar.jsx", error: String((e && e.message) || e) }); }

// components/core/Button.jsx
try { (() => {
const CONTAINER = {
  primary: {
    background: 'var(--accent)',
    color: 'var(--accent-fg)',
    border: '1px solid transparent'
  },
  secondary: {
    background: 'var(--surface-sunken)',
    color: 'var(--ink)',
    border: '1px solid transparent'
  },
  ghost: {
    background: 'transparent',
    color: 'var(--ink)',
    border: 'var(--border-strong)'
  }
};
function Spinner() {
  return /*#__PURE__*/React.createElement("span", {
    style: {
      width: 18,
      height: 18,
      borderRadius: 'var(--radius-full)',
      border: '2px solid currentColor',
      borderTopColor: 'transparent',
      animation: 'gnhq-spin 700ms linear infinite',
      opacity: 0.7
    }
  });
}

/** Full-width action. Mirrors src/components/Button.tsx: rounded-2xl, px-6 py-3.5. */
function Button({
  label,
  children,
  variant = 'primary',
  isLoading = false,
  disabled = false,
  onClick,
  style
}) {
  const isDisabled = disabled || isLoading;
  const press = v => e => {
    if (!isDisabled) e.currentTarget.style.opacity = v;
  };
  return /*#__PURE__*/React.createElement("button", {
    type: "button",
    onClick: isDisabled ? undefined : onClick,
    disabled: isDisabled,
    onMouseDown: press('var(--press-opacity)'),
    onMouseUp: press(1),
    onMouseLeave: press(1),
    style: {
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      width: '100%',
      minHeight: 'var(--tap-min)',
      padding: 'var(--control-pad-y) var(--control-pad-x)',
      borderRadius: 'var(--radius-lg)',
      fontFamily: 'var(--font-sans)',
      fontWeight: 'var(--weight-semibold)',
      fontSize: 'var(--text-base)',
      lineHeight: 'var(--text-base-lh)',
      letterSpacing: 'var(--tracking-tight)',
      cursor: isDisabled ? 'default' : 'pointer',
      opacity: isDisabled ? 'var(--disabled-opacity)' : 1,
      transition: 'opacity var(--duration-fast) var(--ease-standard)',
      ...CONTAINER[variant],
      ...style
    }
  }, isLoading ? /*#__PURE__*/React.createElement(Spinner, null) : label ?? children);
}
Object.assign(__ds_scope, { Button });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/core/Button.jsx", error: String((e && e.message) || e) }); }

// components/core/Card.jsx
try { (() => {
const TONES = {
  plain: 'var(--surface)',
  muted: 'var(--surface-muted)'
};

/**
 * The container every list row, field and panel in the app is made of:
 * rounded-2xl, hairline warm border, no shadow.
 */
function Card({
  children,
  tone = 'plain',
  interactive = false,
  onClick,
  padding,
  style
}) {
  const press = v => e => {
    if (interactive) e.currentTarget.style.opacity = v;
  };
  return /*#__PURE__*/React.createElement("div", {
    onClick: onClick,
    role: interactive ? 'button' : undefined,
    onMouseDown: press('var(--press-opacity-soft)'),
    onMouseUp: press(1),
    onMouseLeave: press(1),
    style: {
      background: TONES[tone],
      border: 'var(--border)',
      borderRadius: 'var(--radius-lg)',
      padding: padding ?? 'var(--card-pad-y) var(--card-pad-x)',
      cursor: interactive ? 'pointer' : 'default',
      transition: 'opacity var(--duration-fast) var(--ease-standard)',
      ...style
    }
  }, children);
}

/** A single row inside a list: title, optional meta line, optional right slot. */
function ListRow({
  title,
  meta,
  right,
  onClick
}) {
  return /*#__PURE__*/React.createElement(Card, {
    interactive: Boolean(onClick),
    onClick: onClick,
    style: {
      display: 'flex',
      alignItems: 'center',
      gap: 'var(--space-4)'
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      minWidth: 0,
      flex: 1
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      fontFamily: 'var(--font-sans)',
      fontWeight: 'var(--weight-semibold)',
      fontSize: 'var(--text-lg)',
      lineHeight: 'var(--text-lg-lh)',
      color: 'var(--ink)'
    }
  }, title), meta ? /*#__PURE__*/React.createElement("div", {
    style: {
      marginTop: 2,
      fontFamily: 'var(--font-sans)',
      fontWeight: 'var(--weight-medium)',
      fontSize: 'var(--text-sm)',
      lineHeight: 'var(--text-sm-lh)',
      color: 'var(--ink-muted)'
    }
  }, meta) : null), right);
}
Object.assign(__ds_scope, { Card, ListRow });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/core/Card.jsx", error: String((e && e.message) || e) }); }

// components/core/EmptyState.jsx
try { (() => {
/** Centred title + explanation for a list with nothing in it yet. */
function EmptyState({
  title,
  body,
  action,
  style
}) {
  return /*#__PURE__*/React.createElement("div", {
    style: {
      flex: 1,
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      textAlign: 'center',
      padding: 'var(--space-16) var(--screen-gutter)',
      ...style
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      fontFamily: 'var(--font-sans)',
      fontWeight: 'var(--weight-semibold)',
      fontSize: 'var(--text-xl)',
      lineHeight: 'var(--text-xl-lh)',
      color: 'var(--ink)'
    }
  }, title), body ? /*#__PURE__*/React.createElement("div", {
    style: {
      marginTop: 'var(--space-2)',
      fontFamily: 'var(--font-sans)',
      fontWeight: 'var(--weight-medium)',
      fontSize: 'var(--text-base)',
      lineHeight: 'var(--text-base-lh)',
      color: 'var(--ink-muted)',
      maxWidth: 320,
      textWrap: 'pretty'
    }
  }, body) : null, action ? /*#__PURE__*/React.createElement("div", {
    style: {
      marginTop: 'var(--space-6)',
      width: '100%',
      maxWidth: 320
    }
  }, action) : null);
}
Object.assign(__ds_scope, { EmptyState });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/core/EmptyState.jsx", error: String((e && e.message) || e) }); }

// components/core/SectionLabel.jsx
try { (() => {
/** Small uppercase label above a section, as on the profile screen. */
function SectionLabel({
  children,
  style
}) {
  return /*#__PURE__*/React.createElement("div", {
    style: {
      fontFamily: 'var(--font-sans)',
      fontWeight: 'var(--weight-semibold)',
      fontSize: 'var(--text-sm)',
      lineHeight: 'var(--text-sm-lh)',
      color: 'var(--ink-subtle)',
      textTransform: 'uppercase',
      letterSpacing: 'var(--tracking-wide)',
      ...style
    }
  }, children);
}
Object.assign(__ds_scope, { SectionLabel });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/core/SectionLabel.jsx", error: String((e && e.message) || e) }); }

// components/core/TextField.jsx
try { (() => {
/** The onboarding/name input: rounded-2xl, hairline border, 18px value text. */
function TextField({
  value,
  onChange,
  placeholder,
  label,
  error,
  maxLength,
  id,
  style
}) {
  const idle = error ? '1px solid var(--danger-line)' : 'var(--border)';
  return /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      flexDirection: 'column',
      gap: 'var(--space-2)',
      ...style
    }
  }, label ? /*#__PURE__*/React.createElement("label", {
    htmlFor: id,
    style: {
      fontFamily: 'var(--font-sans)',
      fontWeight: 'var(--weight-semibold)',
      fontSize: 'var(--text-sm)',
      lineHeight: 'var(--text-sm-lh)',
      color: 'var(--ink-muted)'
    }
  }, label) : null, /*#__PURE__*/React.createElement("input", {
    id: id,
    value: value,
    maxLength: maxLength,
    placeholder: placeholder,
    onChange: e => onChange && onChange(e.target.value),
    onFocus: e => {
      e.currentTarget.style.border = '1px solid var(--accent)';
    },
    onBlur: e => {
      e.currentTarget.style.border = idle;
    },
    style: {
      width: '100%',
      boxSizing: 'border-box',
      padding: '14px var(--space-4)',
      borderRadius: 'var(--radius-lg)',
      border: idle,
      background: 'var(--surface)',
      color: 'var(--ink)',
      fontFamily: 'var(--font-sans)',
      fontWeight: 'var(--weight-medium)',
      fontSize: 'var(--text-lg)',
      lineHeight: 'var(--text-lg-lh)',
      outline: 'none'
    }
  }), error ? /*#__PURE__*/React.createElement("div", {
    style: {
      fontFamily: 'var(--font-sans)',
      fontSize: 'var(--text-sm)',
      lineHeight: 'var(--text-sm-lh)',
      color: 'var(--danger)'
    }
  }, error) : null);
}
Object.assign(__ds_scope, { TextField });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/core/TextField.jsx", error: String((e && e.message) || e) }); }

// components/data/HeadToHead.jsx
try { (() => {
/**
 * Head-to-head record between two players: one horizontal bar split by wins,
 * plus the raw counts. Draws are shown as a neutral middle segment.
 */
function HeadToHead({
  left,
  right,
  leftWins = 0,
  rightWins = 0,
  draws = 0
}) {
  const total = Math.max(1, leftWins + rightWins + draws);
  const pct = n => n / total * 100;
  const num = {
    fontFamily: 'var(--font-sans)',
    fontWeight: 'var(--weight-bold)',
    fontSize: 'var(--text-2xl)',
    lineHeight: 'var(--text-2xl-lh)',
    letterSpacing: 'var(--tracking-tight)',
    fontVariantNumeric: 'tabular-nums',
    color: 'var(--ink)'
  };
  const name = {
    fontFamily: 'var(--font-sans)',
    fontWeight: 'var(--weight-medium)',
    fontSize: 'var(--text-sm)',
    lineHeight: 'var(--text-sm-lh)',
    color: 'var(--ink-muted)'
  };
  return /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      alignItems: 'flex-end',
      justifyContent: 'space-between',
      gap: 'var(--space-3)'
    }
  }, /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("div", {
    style: num
  }, leftWins), /*#__PURE__*/React.createElement("div", {
    style: name
  }, left)), /*#__PURE__*/React.createElement("div", {
    style: {
      textAlign: 'center',
      ...name
    }
  }, draws > 0 ? draws + ' gelijk' : 'onderling'), /*#__PURE__*/React.createElement("div", {
    style: {
      textAlign: 'right'
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: num
  }, rightWins), /*#__PURE__*/React.createElement("div", {
    style: name
  }, right))), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      gap: 2,
      marginTop: 'var(--space-3)',
      height: 10,
      borderRadius: 'var(--radius-full)',
      overflow: 'hidden',
      background: 'var(--surface-sunken)'
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      width: pct(leftWins) + '%',
      background: 'var(--series-1)'
    }
  }), draws > 0 ? /*#__PURE__*/React.createElement("div", {
    style: {
      width: pct(draws) + '%',
      background: 'var(--ink-faint)'
    }
  }) : null, /*#__PURE__*/React.createElement("div", {
    style: {
      width: pct(rightWins) + '%',
      background: 'var(--series-2)'
    }
  })));
}
Object.assign(__ds_scope, { HeadToHead });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/data/HeadToHead.jsx", error: String((e && e.message) || e) }); }

// components/data/Leaderboard.jsx
try { (() => {
const CELL = {
  fontFamily: 'var(--font-sans)',
  fontWeight: 'var(--weight-medium)',
  fontSize: 'var(--text-sm)',
  lineHeight: 'var(--text-sm-lh)',
  color: 'var(--ink)',
  fontVariantNumeric: 'tabular-nums',
  textAlign: 'right',
  padding: '10px 0',
  width: 52
};
const HEAD = {
  ...CELL,
  color: 'var(--ink-subtle)',
  fontWeight: 'var(--weight-semibold)'
};

/**
 * Per-game leaderboard. Rows are ordered as given — the caller decides whether
 * highest or lowest total wins.
 */
function Leaderboard({
  rows = [],
  columns = ['Gespeeld', 'Winst', 'Gem.'],
  renderAvatar
}) {
  return /*#__PURE__*/React.createElement("div", {
    style: {
      border: 'var(--border)',
      borderRadius: 'var(--radius-lg)',
      background: 'var(--surface)',
      overflow: 'hidden'
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      alignItems: 'center',
      gap: 'var(--space-3)',
      padding: '0 var(--space-4)',
      borderBottom: 'var(--border)'
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      ...HEAD,
      flex: 1,
      minWidth: 0,
      textAlign: 'left',
      width: 'auto'
    }
  }, "Speler"), columns.map(c => /*#__PURE__*/React.createElement("div", {
    key: c,
    style: HEAD
  }, c))), rows.map((r, i) => /*#__PURE__*/React.createElement("div", {
    key: r.name,
    style: {
      display: 'flex',
      alignItems: 'center',
      gap: 'var(--space-3)',
      padding: '0 var(--space-4)',
      borderBottom: i === rows.length - 1 ? 'none' : 'var(--border)',
      background: r.highlight ? 'var(--surface-muted)' : 'transparent'
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      flex: 1,
      minWidth: 0,
      display: 'flex',
      alignItems: 'center',
      gap: 'var(--space-2)',
      padding: '8px 0'
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      width: 16,
      fontFamily: 'var(--font-sans)',
      fontWeight: 'var(--weight-semibold)',
      fontSize: 'var(--text-sm)',
      color: 'var(--ink-subtle)',
      fontVariantNumeric: 'tabular-nums'
    }
  }, i + 1), renderAvatar ? renderAvatar(r) : null, /*#__PURE__*/React.createElement("span", {
    style: {
      fontFamily: 'var(--font-sans)',
      fontWeight: 'var(--weight-semibold)',
      fontSize: 'var(--text-sm)',
      lineHeight: 'var(--text-sm-lh)',
      color: 'var(--ink)',
      overflow: 'hidden',
      textOverflow: 'ellipsis',
      whiteSpace: 'nowrap'
    }
  }, r.name)), r.values.map((v, j) => /*#__PURE__*/React.createElement("div", {
    key: j,
    style: CELL
  }, v)))));
}
Object.assign(__ds_scope, { Leaderboard });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/data/Leaderboard.jsx", error: String((e && e.message) || e) }); }

// components/data/ScoreBars.jsx
try { (() => {
/**
 * Final totals for one session, as horizontal bars in leaderboard order.
 * Used on the result screen and in history detail.
 */
function ScoreBars({
  rows = [],
  winnerTone = 'var(--success)'
}) {
  const max = Math.max(1, ...rows.map(r => Math.abs(r.total)));
  return /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      flexDirection: 'column',
      gap: 'var(--space-3)'
    }
  }, rows.map((r, i) => /*#__PURE__*/React.createElement("div", {
    key: r.name
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      alignItems: 'baseline',
      justifyContent: 'space-between',
      gap: 'var(--space-3)'
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      fontFamily: 'var(--font-sans)',
      fontWeight: 'var(--weight-semibold)',
      fontSize: 'var(--text-base)',
      lineHeight: 'var(--text-base-lh)',
      color: 'var(--ink)',
      overflow: 'hidden',
      textOverflow: 'ellipsis',
      whiteSpace: 'nowrap'
    }
  }, r.name), /*#__PURE__*/React.createElement("span", {
    style: {
      fontFamily: 'var(--font-sans)',
      fontWeight: 'var(--weight-bold)',
      fontSize: 'var(--text-lg)',
      lineHeight: 'var(--text-lg-lh)',
      color: 'var(--ink)',
      fontVariantNumeric: 'tabular-nums'
    }
  }, r.total)), /*#__PURE__*/React.createElement("div", {
    style: {
      height: 8,
      marginTop: 6,
      borderRadius: 'var(--radius-full)',
      background: 'var(--surface-sunken)',
      overflow: 'hidden'
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      width: Math.abs(r.total) / max * 100 + '%',
      height: '100%',
      background: i === 0 ? winnerTone : 'var(--clay-700)'
    }
  })))));
}
Object.assign(__ds_scope, { ScoreBars });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/data/ScoreBars.jsx", error: String((e && e.message) || e) }); }

// components/data/StatTile.jsx
try { (() => {
/** One headline number with its label. Three across on a stats screen. */
function StatTile({
  label,
  value,
  unit,
  meta
}) {
  return /*#__PURE__*/React.createElement("div", {
    style: {
      flex: 1,
      minWidth: 0,
      border: 'var(--border)',
      borderRadius: 'var(--radius-lg)',
      background: 'var(--surface)',
      padding: '12px var(--space-3)'
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      alignItems: 'baseline',
      gap: 2
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      fontFamily: 'var(--font-sans)',
      fontWeight: 'var(--weight-bold)',
      fontSize: 'var(--text-2xl)',
      lineHeight: 'var(--text-2xl-lh)',
      letterSpacing: 'var(--tracking-tight)',
      color: 'var(--ink)',
      fontVariantNumeric: 'tabular-nums'
    }
  }, value), unit ? /*#__PURE__*/React.createElement("span", {
    style: {
      fontFamily: 'var(--font-sans)',
      fontWeight: 'var(--weight-semibold)',
      fontSize: 'var(--text-base)',
      color: 'var(--ink-subtle)'
    }
  }, unit) : null), /*#__PURE__*/React.createElement("div", {
    style: {
      marginTop: 2,
      fontFamily: 'var(--font-sans)',
      fontWeight: 'var(--weight-medium)',
      fontSize: 'var(--text-sm)',
      lineHeight: 'var(--text-sm-lh)',
      color: 'var(--ink-muted)'
    }
  }, label), meta ? /*#__PURE__*/React.createElement("div", {
    style: {
      fontFamily: 'var(--font-sans)',
      fontWeight: 'var(--weight-medium)',
      fontSize: 'var(--text-sm)',
      lineHeight: 'var(--text-sm-lh)',
      color: 'var(--ink-subtle)'
    }
  }, meta) : null);
}
Object.assign(__ds_scope, { StatTile });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/data/StatTile.jsx", error: String((e && e.message) || e) }); }

// components/data/TrendChart.jsx
try { (() => {
const PAD = {
  l: 30,
  r: 8,
  t: 10,
  b: 22
};

/**
 * Score trend over time: one line per player, points evenly spaced by session index.
 * Deliberately plain — hairline grid, 2px lines, small dots, no area fill, no animation.
 */
function TrendChart({
  series = [],
  labels = [],
  height = 168,
  width = 342
}) {
  const all = series.flatMap(s => s.points).filter(n => typeof n === 'number');
  if (all.length === 0 || series.length === 0) return null;
  const rawMin = Math.min(...all);
  const rawMax = Math.max(...all);
  const span = Math.max(1, rawMax - rawMin);
  const min = Math.floor((rawMin - span * 0.15) / 2) * 2;
  const max = Math.ceil((rawMax + span * 0.15) / 2) * 2;
  const innerW = width - PAD.l - PAD.r;
  const innerH = height - PAD.t - PAD.b;
  const n = Math.max(1, labels.length || series[0].points.length);
  const x = i => PAD.l + (n === 1 ? innerW / 2 : i * innerW / (n - 1));
  const y = v => PAD.t + innerH - (v - min) / (max - min) * innerH;
  const ticks = [min, min + (max - min) / 2, max];
  return /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("svg", {
    viewBox: '0 0 ' + width + ' ' + height,
    width: "100%",
    height: height,
    role: "img",
    style: {
      display: 'block',
      overflow: 'visible'
    }
  }, ticks.map(t => /*#__PURE__*/React.createElement("g", {
    key: t
  }, /*#__PURE__*/React.createElement("line", {
    x1: PAD.l,
    x2: width - PAD.r,
    y1: y(t),
    y2: y(t),
    stroke: "var(--line)",
    strokeWidth: "1"
  }), /*#__PURE__*/React.createElement("text", {
    x: PAD.l - 6,
    y: y(t) + 4,
    textAnchor: "end",
    fontFamily: "var(--font-sans)",
    fontSize: "10",
    fontWeight: "500",
    fill: "var(--ink-subtle)"
  }, Math.round(t)))), labels.map((l, i) => /*#__PURE__*/React.createElement("text", {
    key: i,
    x: x(i),
    y: height - 6,
    textAnchor: "middle",
    fontFamily: "var(--font-sans)",
    fontSize: "10",
    fontWeight: "500",
    fill: "var(--ink-subtle)"
  }, l)), series.map(s => /*#__PURE__*/React.createElement("g", {
    key: s.name
  }, /*#__PURE__*/React.createElement("polyline", {
    fill: "none",
    stroke: s.color,
    strokeWidth: "2",
    strokeLinecap: "round",
    strokeLinejoin: "round",
    points: s.points.map((v, i) => x(i) + ',' + y(v)).join(' ')
  }), s.points.map((v, i) => /*#__PURE__*/React.createElement("circle", {
    key: i,
    cx: x(i),
    cy: y(v),
    r: "2.5",
    fill: "var(--surface)",
    stroke: s.color,
    strokeWidth: "2"
  }))))), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      flexWrap: 'wrap',
      gap: 'var(--space-3)',
      marginTop: 'var(--space-2)',
      paddingLeft: PAD.l
    }
  }, series.map(s => /*#__PURE__*/React.createElement("span", {
    key: s.name,
    style: {
      display: 'inline-flex',
      alignItems: 'center',
      gap: 6,
      fontFamily: 'var(--font-sans)',
      fontWeight: 'var(--weight-medium)',
      fontSize: 'var(--text-sm)',
      lineHeight: 'var(--text-sm-lh)',
      color: 'var(--ink-muted)'
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      width: 10,
      height: 2,
      borderRadius: 2,
      background: s.color,
      display: 'inline-block'
    }
  }), s.name))));
}
Object.assign(__ds_scope, { TrendChart });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/data/TrendChart.jsx", error: String((e && e.message) || e) }); }

// components/forms/Badge.jsx
try { (() => {
const TONES = {
  neutral: {
    background: 'var(--surface-sunken)',
    color: 'var(--ink-muted)'
  },
  accent: {
    background: 'var(--accent-soft)',
    color: 'var(--accent-soft-fg)'
  },
  success: {
    background: 'var(--success-soft)',
    color: 'var(--success-soft-fg)'
  },
  warning: {
    background: 'var(--warning-soft)',
    color: 'var(--warning-soft-fg)'
  },
  danger: {
    background: 'var(--danger-soft)',
    color: 'var(--danger-soft-fg)'
  }
};

/** Small status pill: live session, finished session, winner, scorekeeper. */
function Badge({
  children,
  tone = 'neutral',
  style
}) {
  return /*#__PURE__*/React.createElement("span", {
    style: {
      display: 'inline-flex',
      alignItems: 'center',
      gap: 6,
      borderRadius: 'var(--radius-full)',
      padding: '4px 10px',
      fontFamily: 'var(--font-sans)',
      fontWeight: 'var(--weight-semibold)',
      fontSize: 'var(--text-sm)',
      lineHeight: 'var(--text-sm-lh)',
      whiteSpace: 'nowrap',
      ...TONES[tone],
      ...style
    }
  }, children);
}
Object.assign(__ds_scope, { Badge });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/forms/Badge.jsx", error: String((e && e.message) || e) }); }

// components/forms/ChoiceRow.jsx
try { (() => {
function Mark({
  mode,
  on
}) {
  const round = mode === 'radio';
  return /*#__PURE__*/React.createElement("span", {
    style: {
      width: 22,
      height: 22,
      flex: '0 0 auto',
      borderRadius: round ? 'var(--radius-full)' : 6,
      border: on ? '6px solid var(--accent)' : 'var(--border-strong)',
      background: on && !round ? 'var(--accent)' : 'var(--surface)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      boxSizing: 'border-box',
      color: 'var(--accent-fg)',
      fontSize: 13,
      fontWeight: 700,
      lineHeight: 1
    }
  }, on && !round ? '\u2713' : null);
}

/**
 * A selectable row inside a card group: scoring direction (radio), or who is playing
 * tonight (check). The whole row is the target, not just the mark.
 */
function ChoiceRow({
  title,
  meta,
  left,
  mode = 'radio',
  selected = false,
  onSelect
}) {
  return /*#__PURE__*/React.createElement("button", {
    type: "button",
    onClick: onSelect,
    style: {
      width: '100%',
      display: 'flex',
      alignItems: 'center',
      gap: 'var(--space-3)',
      textAlign: 'left',
      background: selected ? 'var(--accent-soft)' : 'var(--surface)',
      border: selected ? '1px solid var(--accent-line)' : 'var(--border)',
      borderRadius: 'var(--radius-lg)',
      padding: '12px var(--space-4)',
      cursor: 'pointer',
      minHeight: 'var(--tap-min)',
      fontFamily: 'var(--font-sans)'
    }
  }, left, /*#__PURE__*/React.createElement("span", {
    style: {
      minWidth: 0,
      flex: 1
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      display: 'block',
      fontWeight: 'var(--weight-semibold)',
      fontSize: 'var(--text-base)',
      lineHeight: 'var(--text-base-lh)',
      color: 'var(--ink)'
    }
  }, title), meta ? /*#__PURE__*/React.createElement("span", {
    style: {
      display: 'block',
      fontWeight: 'var(--weight-medium)',
      fontSize: 'var(--text-sm)',
      lineHeight: 'var(--text-sm-lh)',
      color: 'var(--ink-muted)'
    }
  }, meta) : null), /*#__PURE__*/React.createElement(Mark, {
    mode: mode,
    on: selected
  }));
}
Object.assign(__ds_scope, { ChoiceRow });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/forms/ChoiceRow.jsx", error: String((e && e.message) || e) }); }

// components/forms/NumberStepper.jsx
try { (() => {
const BTN = {
  width: 40,
  height: 40,
  flex: '0 0 auto',
  borderRadius: 'var(--radius-md)',
  border: 'var(--border-strong)',
  background: 'var(--surface)',
  color: 'var(--ink)',
  fontFamily: 'var(--font-sans)',
  fontWeight: 'var(--weight-semibold)',
  fontSize: 20,
  lineHeight: 1,
  cursor: 'pointer',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center'
};

/**
 * Numeric score field. The scorekeeper is entering numbers fast with one thumb, so the
 * value is tappable up and down as well as typeable.
 */
function NumberStepper({
  label,
  value = 0,
  onChange,
  sign = 1,
  step = 1,
  min,
  max
}) {
  const set = v => {
    if (typeof min === 'number' && v < min) return;
    if (typeof max === 'number' && v > max) return;
    onChange && onChange(v);
  };
  return /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      alignItems: 'center',
      gap: 'var(--space-3)'
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      minWidth: 0,
      flex: 1
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      fontFamily: 'var(--font-sans)',
      fontWeight: 'var(--weight-medium)',
      fontSize: 'var(--text-base)',
      lineHeight: 'var(--text-base-lh)',
      color: 'var(--ink)'
    }
  }, label), sign === -1 ? /*#__PURE__*/React.createElement("div", {
    style: {
      fontFamily: 'var(--font-sans)',
      fontWeight: 'var(--weight-medium)',
      fontSize: 'var(--text-sm)',
      lineHeight: 'var(--text-sm-lh)',
      color: 'var(--danger)'
    }
  }, "telt af") : null), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      alignItems: 'center',
      gap: 'var(--space-2)'
    }
  }, /*#__PURE__*/React.createElement("button", {
    type: "button",
    style: BTN,
    onClick: () => set(value - step),
    "aria-label": "minder"
  }, "\u2212"), /*#__PURE__*/React.createElement("input", {
    value: value,
    onChange: e => {
      const n = Number(e.target.value.replace(/[^\d-]/g, ''));
      if (!Number.isNaN(n)) set(n);
    },
    style: {
      width: 56,
      textAlign: 'center',
      padding: '9px 4px',
      borderRadius: 'var(--radius-md)',
      border: 'var(--border)',
      background: 'var(--surface)',
      color: 'var(--ink)',
      fontFamily: 'var(--font-sans)',
      fontWeight: 'var(--weight-semibold)',
      fontSize: 'var(--text-lg)',
      lineHeight: 'var(--text-lg-lh)',
      fontVariantNumeric: 'tabular-nums',
      outline: 'none'
    }
  }), /*#__PURE__*/React.createElement("button", {
    type: "button",
    style: BTN,
    onClick: () => set(value + step),
    "aria-label": "meer"
  }, "+")));
}
Object.assign(__ds_scope, { NumberStepper });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/forms/NumberStepper.jsx", error: String((e && e.message) || e) }); }

// components/forms/SegmentedControl.jsx
try { (() => {
/** Tab row for switching between views inside a group. Sits under the screen title. */
function SegmentedControl({
  options = [],
  value,
  onChange
}) {
  return /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      gap: 'var(--space-1)',
      background: 'var(--surface-sunken)',
      borderRadius: 'var(--radius-lg)',
      padding: 4
    }
  }, options.map(o => {
    const on = o === value;
    return /*#__PURE__*/React.createElement("button", {
      key: o,
      type: "button",
      onClick: () => onChange && onChange(o),
      style: {
        flex: 1,
        border: 'none',
        cursor: 'pointer',
        background: on ? 'var(--surface)' : 'transparent',
        color: on ? 'var(--ink)' : 'var(--ink-muted)',
        borderRadius: 'var(--radius-md)',
        padding: '9px 8px',
        fontFamily: 'var(--font-sans)',
        fontWeight: 'var(--weight-semibold)',
        fontSize: 'var(--text-sm)',
        lineHeight: 'var(--text-sm-lh)',
        transition: 'opacity var(--duration-fast) var(--ease-standard)'
      }
    }, o);
  }));
}
Object.assign(__ds_scope, { SegmentedControl });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/forms/SegmentedControl.jsx", error: String((e && e.message) || e) }); }

// ui_kits/app/DisplayNameScreen.jsx
try { (() => {
const {
  Button,
  TextField
} = DS;

/**
 * src/features/auth/screens/DisplayNameScreen.tsx — the one and only onboarding prompt.
 * Vertically centred in a keyboard-aware scroll view, 24px gutter.
 */
function DisplayNameScreen({
  onSubmit
}) {
  const [name, setName] = React.useState('');
  const [pending, setPending] = React.useState(false);
  const trimmed = name.trim();
  function submit() {
    if (!trimmed || pending) return;
    setPending(true);
    setTimeout(() => {
      setPending(false);
      onSubmit(trimmed);
    }, 650);
  }
  return /*#__PURE__*/React.createElement("div", {
    style: {
      flex: 1,
      display: 'flex',
      flexDirection: 'column',
      justifyContent: 'center',
      padding: '0 var(--screen-gutter)'
    }
  }, /*#__PURE__*/React.createElement("h1", {
    style: {
      margin: 0,
      fontFamily: 'var(--font-sans)',
      fontWeight: 700,
      fontSize: 'var(--text-3xl)',
      lineHeight: 'var(--text-3xl-lh)',
      letterSpacing: 'var(--tracking-tight)',
      color: 'var(--ink)',
      textWrap: 'pretty'
    }
  }, "Hoe mogen we je noemen?"), /*#__PURE__*/React.createElement("p", {
    style: {
      margin: 'var(--space-2) 0 0',
      fontFamily: 'var(--font-sans)',
      fontWeight: 500,
      fontSize: 'var(--text-base)',
      lineHeight: 'var(--text-base-lh)',
      color: 'var(--ink-muted)'
    }
  }, "Dit is de naam die je vrienden op het scorebord zien."), /*#__PURE__*/React.createElement(TextField, {
    value: name,
    onChange: setName,
    placeholder: "Je naam",
    maxLength: 40,
    style: {
      marginTop: 'var(--space-8)'
    }
  }), /*#__PURE__*/React.createElement("div", {
    style: {
      marginTop: 'var(--space-6)'
    }
  }, /*#__PURE__*/React.createElement(Button, {
    label: "Doorgaan",
    onClick: submit,
    disabled: !trimmed,
    isLoading: pending
  })));
}
Object.assign(window, {
  DisplayNameScreen
});
})(); } catch (e) { __ds_ns.__errors.push({ path: "ui_kits/app/DisplayNameScreen.jsx", error: String((e && e.message) || e) }); }

// ui_kits/app/GameSetupScreens.jsx
try { (() => {
const {
  Button,
  Card,
  TextField,
  SectionLabel,
  ChoiceRow,
  NumberStepper,
  Badge
} = DS;

/**
 * Define a game for this group: a name, numeric fields with a sign, a scoring direction,
 * and optional bonus rules. Any member can do this — there is no admin role.
 */
function GameTemplateScreen({
  onSave
}) {
  const [name, setName] = React.useState('Kolonisten');
  const [direction, setDirection] = React.useState('highest_total_wins');
  const [fields, setFields] = React.useState(TEMPLATES[0].fields);
  const [rules, setRules] = React.useState(TEMPLATES[0].bonus_rules);
  const flip = i => setFields(fields.map((f, j) => j === i ? {
    ...f,
    sign: f.sign === 1 ? -1 : 1
  } : f));
  const addField = () => setFields([...fields, {
    key: 'veld' + (fields.length + 1),
    label: 'Nieuw veld',
    sign: 1,
    default_value: 0
  }]);
  return /*#__PURE__*/React.createElement("div", {
    style: {
      flex: 1,
      minHeight: 0,
      overflow: 'auto',
      padding: 'var(--space-6) var(--screen-gutter) var(--space-12)'
    }
  }, /*#__PURE__*/React.createElement(TextField, {
    label: "Naam",
    value: name,
    onChange: setName,
    placeholder: "Naam van het spel"
  }), /*#__PURE__*/React.createElement("div", {
    style: {
      marginTop: 'var(--section-gap)'
    }
  }, /*#__PURE__*/React.createElement(SectionLabel, null, "Velden"), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      flexDirection: 'column',
      gap: 'var(--space-2)',
      marginTop: 'var(--space-2)'
    }
  }, fields.map((f, i) => /*#__PURE__*/React.createElement(Card, {
    key: f.key,
    padding: "12px var(--space-4)"
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      alignItems: 'center',
      gap: 'var(--space-3)'
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      flex: 1,
      minWidth: 0
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      fontFamily: 'var(--font-sans)',
      fontWeight: 600,
      fontSize: 'var(--text-base)',
      lineHeight: 'var(--text-base-lh)',
      color: 'var(--ink)',
      overflow: 'hidden',
      textOverflow: 'ellipsis',
      whiteSpace: 'nowrap'
    }
  }, f.label), /*#__PURE__*/React.createElement("div", {
    style: {
      fontFamily: 'var(--font-sans)',
      fontWeight: 500,
      fontSize: 'var(--text-sm)',
      lineHeight: 'var(--text-sm-lh)',
      color: 'var(--ink-subtle)'
    }
  }, "start op ", f.default_value)), /*#__PURE__*/React.createElement("button", {
    type: "button",
    onClick: () => flip(i),
    style: {
      border: 'none',
      background: 'none',
      padding: 0,
      cursor: 'pointer'
    }
  }, /*#__PURE__*/React.createElement(Badge, {
    tone: f.sign === 1 ? 'success' : 'danger'
  }, f.sign === 1 ? 'Telt op' : 'Telt af')))))), /*#__PURE__*/React.createElement("div", {
    style: {
      marginTop: 'var(--space-3)'
    }
  }, /*#__PURE__*/React.createElement(Button, {
    label: "Veld toevoegen",
    variant: "ghost",
    onClick: addField
  }))), /*#__PURE__*/React.createElement("div", {
    style: {
      marginTop: 'var(--section-gap)'
    }
  }, /*#__PURE__*/React.createElement(SectionLabel, null, "Scorerichting"), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      flexDirection: 'column',
      gap: 'var(--space-2)',
      marginTop: 'var(--space-2)'
    }
  }, /*#__PURE__*/React.createElement(ChoiceRow, {
    title: "Hoogste totaal wint",
    selected: direction === 'highest_total_wins',
    onSelect: () => setDirection('highest_total_wins')
  }), /*#__PURE__*/React.createElement(ChoiceRow, {
    title: "Laagste totaal wint",
    selected: direction === 'lowest_total_wins',
    onSelect: () => setDirection('lowest_total_wins')
  }))), /*#__PURE__*/React.createElement("div", {
    style: {
      marginTop: 'var(--section-gap)'
    }
  }, /*#__PURE__*/React.createElement(SectionLabel, null, "Bonusregels"), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      flexDirection: 'column',
      gap: 'var(--space-2)',
      marginTop: 'var(--space-2)'
    }
  }, rules.map((r, i) => /*#__PURE__*/React.createElement(Card, {
    key: i,
    padding: "12px var(--space-4)"
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      fontFamily: 'var(--font-sans)',
      fontWeight: 600,
      fontSize: 'var(--text-base)',
      lineHeight: 'var(--text-base-lh)',
      color: 'var(--ink)'
    }
  }, "Steden ", r.operator, " ", r.value), /*#__PURE__*/React.createElement("div", {
    style: {
      fontFamily: 'var(--font-sans)',
      fontWeight: 500,
      fontSize: 'var(--text-sm)',
      lineHeight: 'var(--text-sm-lh)',
      color: 'var(--ink-muted)'
    }
  }, r.points_delta > 0 ? '+' : '', r.points_delta, " punten aan het eind van de avond"))), rules.length === 0 ? /*#__PURE__*/React.createElement(Card, {
    tone: "muted"
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      fontFamily: 'var(--font-sans)',
      fontWeight: 500,
      fontSize: 'var(--text-base)',
      lineHeight: 'var(--text-base-lh)',
      color: 'var(--ink-muted)'
    }
  }, "Nog geen bonusregels. Een regel geeft punten bij een voorwaarde, bijvoorbeeld vier steden of meer.")) : null), /*#__PURE__*/React.createElement("div", {
    style: {
      marginTop: 'var(--space-3)'
    }
  }, /*#__PURE__*/React.createElement(Button, {
    label: "Regel toevoegen",
    variant: "ghost",
    onClick: () => setRules([...rules, {
      field_key: 'steden',
      operator: '>=',
      value: 4,
      points_delta: 2
    }])
  }))), /*#__PURE__*/React.createElement("div", {
    style: {
      marginTop: 'var(--section-gap)'
    }
  }, /*#__PURE__*/React.createElement(Button, {
    label: "Spel opslaan",
    onClick: onSave
  })));
}

/** Pick a game, pick who plays, pick tonight's scorekeeper. */
function SessionSetupScreen({
  onStart
}) {
  const {
    Avatar
  } = DS;
  const [game, setGame] = React.useState('t1');
  const [players, setPlayers] = React.useState(['u1', 'u2', 'u3']);
  const [keeper, setKeeper] = React.useState('u1');
  const toggle = id => setPlayers(players.includes(id) ? players.filter(p => p !== id) : [...players, id]);
  return /*#__PURE__*/React.createElement("div", {
    style: {
      flex: 1,
      minHeight: 0,
      overflow: 'auto',
      padding: 'var(--space-6) var(--screen-gutter) var(--space-12)'
    }
  }, /*#__PURE__*/React.createElement(SectionLabel, null, "Spel"), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      flexDirection: 'column',
      gap: 'var(--space-2)',
      marginTop: 'var(--space-2)'
    }
  }, TEMPLATES.map(t => /*#__PURE__*/React.createElement(ChoiceRow, {
    key: t.id,
    title: t.name,
    meta: t.scoring_direction === 'highest_total_wins' ? 'Hoogste totaal wint' : 'Laagste totaal wint',
    selected: game === t.id,
    onSelect: () => setGame(t.id)
  }))), /*#__PURE__*/React.createElement("div", {
    style: {
      marginTop: 'var(--section-gap)'
    }
  }, /*#__PURE__*/React.createElement(SectionLabel, null, "Wie speelt mee"), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      flexDirection: 'column',
      gap: 'var(--space-2)',
      marginTop: 'var(--space-2)'
    }
  }, MEMBERS.map(m => /*#__PURE__*/React.createElement(ChoiceRow, {
    key: m.id,
    mode: "check",
    title: m.display_name,
    left: /*#__PURE__*/React.createElement(Avatar, {
      displayName: m.display_name,
      size: 32
    }),
    selected: players.includes(m.id),
    onSelect: () => toggle(m.id)
  })))), /*#__PURE__*/React.createElement("div", {
    style: {
      marginTop: 'var(--section-gap)'
    }
  }, /*#__PURE__*/React.createElement(SectionLabel, null, "Scoreteller"), /*#__PURE__*/React.createElement("div", {
    style: {
      fontFamily: 'var(--font-sans)',
      fontWeight: 500,
      fontSize: 'var(--text-sm)',
      lineHeight: 'var(--text-sm-lh)',
      color: 'var(--ink-muted)',
      marginTop: 4
    }
  }, "Alleen de scoreteller vult de scores in. De rest kijkt live mee."), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      flexDirection: 'column',
      gap: 'var(--space-2)',
      marginTop: 'var(--space-2)'
    }
  }, MEMBERS.filter(m => players.includes(m.id)).map(m => /*#__PURE__*/React.createElement(ChoiceRow, {
    key: m.id,
    title: m.display_name,
    left: /*#__PURE__*/React.createElement(Avatar, {
      displayName: m.display_name,
      size: 32
    }),
    selected: keeper === m.id,
    onSelect: () => setKeeper(m.id)
  })))), /*#__PURE__*/React.createElement("div", {
    style: {
      marginTop: 'var(--section-gap)'
    }
  }, /*#__PURE__*/React.createElement(Button, {
    label: "Avond starten",
    onClick: onStart,
    disabled: players.length < 2
  })));
}
Object.assign(window, {
  GameTemplateScreen,
  SessionSetupScreen
});
})(); } catch (e) { __ds_ns.__errors.push({ path: "ui_kits/app/GameSetupScreens.jsx", error: String((e && e.message) || e) }); }

// ui_kits/app/GroupDetailScreen.jsx
try { (() => {
const {
  Button,
  Card,
  ListRow,
  Badge,
  SectionLabel,
  SegmentedControl,
  Avatar,
  StatTile,
  Leaderboard,
  TrendChart,
  HeadToHead,
  EmptyState
} = DS;
const ScreenTitle = ({
  children,
  right
}) => /*#__PURE__*/React.createElement("div", {
  style: {
    display: 'flex',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: 'var(--space-4)',
    padding: 'var(--space-2) var(--screen-gutter) 0'
  }
}, /*#__PURE__*/React.createElement("h1", {
  style: {
    margin: 0,
    fontFamily: 'var(--font-sans)',
    fontWeight: 700,
    fontSize: 'var(--text-3xl)',
    lineHeight: 'var(--text-3xl-lh)',
    letterSpacing: 'var(--tracking-tight)',
    color: 'var(--ink)'
  }
}, children), right);
const Scroll = ({
  children
}) => /*#__PURE__*/React.createElement("div", {
  style: {
    flex: 1,
    minHeight: 0,
    overflow: 'auto',
    padding: 'var(--space-4) var(--screen-gutter) var(--space-8)',
    display: 'flex',
    flexDirection: 'column',
    gap: 'var(--list-gap)'
  }
}, children);

/** Games tab: the group's templates, plus the way into a new session. */
function GamesTab({
  onNewGame,
  onStart
}) {
  return /*#__PURE__*/React.createElement(Scroll, null, TEMPLATES.map(t => /*#__PURE__*/React.createElement(ListRow, {
    key: t.id,
    title: t.name,
    meta: (t.scoring_direction === 'highest_total_wins' ? 'Hoogste totaal wint' : 'Laagste totaal wint') + (t.fields.length ? ' · ' + t.fields.length + ' velden' : ''),
    onClick: () => {}
  })), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      flexDirection: 'column',
      gap: 'var(--space-2)',
      marginTop: 'var(--space-4)'
    }
  }, /*#__PURE__*/React.createElement(Button, {
    label: "Avond starten",
    onClick: onStart
  }), /*#__PURE__*/React.createElement(Button, {
    label: "Spel toevoegen",
    variant: "ghost",
    onClick: onNewGame
  })));
}

/** History tab: sessions newest first, the live one flagged. */
function HistoryTab({
  onOpen
}) {
  return /*#__PURE__*/React.createElement(Scroll, null, SESSIONS.map(s => /*#__PURE__*/React.createElement(ListRow, {
    key: s.id,
    title: s.game,
    meta: s.status === 'in_progress' ? s.played_at + ' · Jasper houdt de score bij' : s.played_at + ' · ' + s.winner + ' won',
    right: s.status === 'in_progress' ? /*#__PURE__*/React.createElement(Badge, {
      tone: "warning"
    }, "Bezig") : null,
    onClick: () => onOpen(s)
  })));
}

/** Stats tab: headline numbers, per-game leaderboard, trend, head-to-head. */
function StatsTab() {
  const [game, setGame] = React.useState('Kolonisten');
  const [pair, setPair] = React.useState(['Jasper Versteeg', 'Mara de Wit']);
  return /*#__PURE__*/React.createElement(Scroll, null, /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      gap: 'var(--space-3)'
    }
  }, /*#__PURE__*/React.createElement(StatTile, {
    value: "12",
    label: "avonden"
  }), /*#__PURE__*/React.createElement(StatTile, {
    value: "25",
    unit: "%",
    label: "jouw winst"
  }), /*#__PURE__*/React.createElement(StatTile, {
    value: "8.4",
    label: "gem. score"
  })), /*#__PURE__*/React.createElement("div", {
    style: {
      marginTop: 'var(--space-4)'
    }
  }, /*#__PURE__*/React.createElement(SegmentedControl, {
    options: ['Kolonisten', 'Dartsavond', 'Alles'],
    value: game,
    onChange: setGame
  })), /*#__PURE__*/React.createElement("div", {
    style: {
      marginTop: 'var(--space-4)'
    }
  }, /*#__PURE__*/React.createElement(SectionLabel, null, "Klassement"), /*#__PURE__*/React.createElement("div", {
    style: {
      marginTop: 'var(--space-2)'
    }
  }, /*#__PURE__*/React.createElement(Leaderboard, {
    columns: ['Gespeeld', 'Winst', 'Gem.'],
    renderAvatar: r => /*#__PURE__*/React.createElement(Avatar, {
      displayName: r.name,
      size: 24
    }),
    rows: [{
      name: 'Mara de Wit',
      values: [12, '42%', 8.4]
    }, {
      name: 'Jasper Versteeg',
      values: [12, '25%', 7.1],
      highlight: true
    }, {
      name: 'Tim Boskamp',
      values: [9, '22%', 6.8]
    }, {
      name: 'Lotte Prins',
      values: [7, '14%', 6.2]
    }]
  }))), /*#__PURE__*/React.createElement("div", {
    style: {
      marginTop: 'var(--section-gap)'
    }
  }, /*#__PURE__*/React.createElement(SectionLabel, null, "Scoreverloop"), /*#__PURE__*/React.createElement(Card, {
    padding: "var(--space-3)",
    style: {
      marginTop: 'var(--space-2)'
    }
  }, /*#__PURE__*/React.createElement(TrendChart, {
    labels: TREND.labels,
    series: TREND.series,
    width: 310,
    height: 150
  }))), /*#__PURE__*/React.createElement("div", {
    style: {
      marginTop: 'var(--section-gap)'
    }
  }, /*#__PURE__*/React.createElement(SectionLabel, null, "Onderling"), /*#__PURE__*/React.createElement(Card, {
    style: {
      marginTop: 'var(--space-2)'
    }
  }, /*#__PURE__*/React.createElement(HeadToHead, {
    left: "Jasper",
    right: "Mara",
    leftWins: 4,
    rightWins: 7,
    draws: 1
  }), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      flexWrap: 'wrap',
      gap: 'var(--space-2)',
      marginTop: 'var(--space-4)'
    }
  }, MEMBERS.map(m => {
    const on = pair.includes(m.display_name);
    return /*#__PURE__*/React.createElement("button", {
      key: m.id,
      type: "button",
      onClick: () => setPair(on ? pair : [pair[1], m.display_name]),
      style: {
        border: on ? '1px solid var(--accent-line)' : 'var(--border)',
        background: on ? 'var(--accent-soft)' : 'var(--surface)',
        color: on ? 'var(--accent-soft-fg)' : 'var(--ink-muted)',
        borderRadius: 'var(--radius-full)',
        padding: '6px 12px',
        fontFamily: 'var(--font-sans)',
        fontWeight: 500,
        fontSize: 'var(--text-sm)',
        cursor: 'pointer'
      }
    }, m.display_name.split(' ')[0]);
  })))));
}

/**
 * Group detail. Three tabs, matching the domain model: the group's games, its session
 * history, and stats derived from that history.
 */
function GroupDetailScreen({
  group,
  initialTab = 'Spellen',
  onNewGame,
  onStart,
  onOpenSession
}) {
  const [tab, setTab] = React.useState(initialTab);
  return /*#__PURE__*/React.createElement("div", {
    style: {
      flex: 1,
      display: 'flex',
      flexDirection: 'column',
      minHeight: 0
    }
  }, /*#__PURE__*/React.createElement(ScreenTitle, {
    right: /*#__PURE__*/React.createElement("div", {
      style: {
        display: 'flex',
        marginTop: 6
      }
    }, MEMBERS.slice(0, 3).map((m, i) => /*#__PURE__*/React.createElement("div", {
      key: m.id,
      style: {
        marginLeft: i ? -10 : 0,
        border: '2px solid var(--surface)',
        borderRadius: 'var(--radius-full)',
        display: 'flex'
      }
    }, /*#__PURE__*/React.createElement(Avatar, {
      displayName: m.display_name,
      size: 28
    }))))
  }, group), /*#__PURE__*/React.createElement("div", {
    style: {
      padding: 'var(--space-3) var(--screen-gutter) 0'
    }
  }, /*#__PURE__*/React.createElement(SegmentedControl, {
    options: ['Spellen', 'Geschiedenis', 'Statistieken'],
    value: tab,
    onChange: setTab
  })), tab === 'Spellen' ? /*#__PURE__*/React.createElement(GamesTab, {
    onNewGame: onNewGame,
    onStart: onStart
  }) : tab === 'Geschiedenis' ? /*#__PURE__*/React.createElement(HistoryTab, {
    onOpen: onOpenSession
  }) : /*#__PURE__*/React.createElement(StatsTab, null));
}
Object.assign(window, {
  GroupDetailScreen,
  GamesTab,
  HistoryTab,
  StatsTab,
  ScreenTitle,
  Scroll
});
})(); } catch (e) { __ds_ns.__errors.push({ path: "ui_kits/app/GroupDetailScreen.jsx", error: String((e && e.message) || e) }); }

// ui_kits/app/GroupListScreen.jsx
try { (() => {
const {
  Avatar,
  ListRow,
  EmptyState
} = DS;

/**
 * src/features/groups/screens/GroupListScreen.tsx — title row with the profile avatar on the
 * right, then a FlatList of group rows with an empty state.
 *
 * The app has no create/join UI yet, so this screen offers no way in: the empty state is the
 * whole story until that flow is built. Toggle the demo data outside the phone instead.
 */
function GroupListScreen({
  profile,
  groups,
  onProfile
}) {
  return /*#__PURE__*/React.createElement("div", {
    style: {
      flex: 1,
      display: 'flex',
      flexDirection: 'column',
      minHeight: 0
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      alignItems: 'flex-start',
      justifyContent: 'space-between',
      gap: 'var(--space-4)',
      padding: 'var(--space-2) var(--screen-gutter)'
    }
  }, /*#__PURE__*/React.createElement("h1", {
    style: {
      margin: 0,
      fontFamily: 'var(--font-sans)',
      fontWeight: 700,
      fontSize: 'var(--text-3xl)',
      lineHeight: 'var(--text-3xl-lh)',
      letterSpacing: 'var(--tracking-tight)',
      color: 'var(--ink)'
    }
  }, "Jouw groepen"), /*#__PURE__*/React.createElement("button", {
    onClick: onProfile,
    "aria-label": "Naar je profiel",
    style: {
      background: 'none',
      border: 'none',
      padding: 0,
      marginTop: 4,
      cursor: 'pointer'
    }
  }, /*#__PURE__*/React.createElement(Avatar, {
    displayName: profile.display_name,
    avatarUrl: profile.avatar_url,
    size: 40
  }))), /*#__PURE__*/React.createElement("div", {
    style: {
      flex: 1,
      minHeight: 0,
      overflow: 'auto',
      display: 'flex',
      flexDirection: 'column',
      gap: 'var(--list-gap)',
      padding: 'var(--space-2) var(--screen-gutter) var(--space-8)'
    }
  }, groups.length === 0 ? /*#__PURE__*/React.createElement(EmptyState, {
    title: "Nog geen groepen",
    body: "Maak een groep voor jullie spelavonden, of sluit je aan bij een groep met een uitnodigingscode van een vriend."
  }) : groups.map(g => /*#__PURE__*/React.createElement(ListRow, {
    key: g.id,
    title: g.name,
    onClick: () => {}
  }))));
}
Object.assign(window, {
  GroupListScreen
});
})(); } catch (e) { __ds_ns.__errors.push({ path: "ui_kits/app/GroupListScreen.jsx", error: String((e && e.message) || e) }); }

// ui_kits/app/PhoneFrame.jsx
try { (() => {
const {
  Avatar
} = DS;

// iOS status bar + native stack header, recreated only as far as the screenshots need.
function StatusBar() {
  return /*#__PURE__*/React.createElement("div", {
    style: {
      height: 44,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      padding: '0 24px',
      fontFamily: 'var(--font-sans)',
      fontWeight: 600,
      fontSize: 14,
      color: 'var(--ink)',
      flex: '0 0 auto'
    }
  }, /*#__PURE__*/React.createElement("span", null, "21:40"), /*#__PURE__*/React.createElement("span", {
    style: {
      display: 'flex',
      gap: 5,
      alignItems: 'center'
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      display: 'flex',
      gap: 2,
      alignItems: 'flex-end'
    }
  }, [5, 8, 11, 14].map((h, i) => /*#__PURE__*/React.createElement("span", {
    key: i,
    style: {
      width: 3,
      height: h,
      background: 'var(--ink)',
      borderRadius: 1
    }
  }))), /*#__PURE__*/React.createElement("span", {
    style: {
      width: 20,
      height: 11,
      border: '1px solid var(--ink)',
      borderRadius: 3,
      padding: 1,
      display: 'block'
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      display: 'block',
      width: '72%',
      height: '100%',
      background: 'var(--ink)',
      borderRadius: 1
    }
  }))));
}
function NativeHeader({
  title,
  onBack
}) {
  return /*#__PURE__*/React.createElement("div", {
    style: {
      flex: '0 0 auto',
      height: 44,
      borderBottom: 'var(--border)',
      display: 'flex',
      alignItems: 'center',
      padding: '0 12px',
      position: 'relative'
    }
  }, /*#__PURE__*/React.createElement("button", {
    onClick: onBack,
    style: {
      background: 'none',
      border: 'none',
      padding: '4px 8px',
      cursor: 'pointer',
      display: 'flex',
      alignItems: 'center',
      gap: 4,
      color: 'var(--accent)',
      fontFamily: 'var(--font-sans)',
      fontWeight: 500,
      fontSize: 17
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      fontSize: 22,
      lineHeight: 1,
      marginTop: -2
    }
  }, "\u2039"), "Terug"), /*#__PURE__*/React.createElement("div", {
    style: {
      position: 'absolute',
      left: 0,
      right: 0,
      textAlign: 'center',
      fontFamily: 'var(--font-sans)',
      fontWeight: 600,
      fontSize: 17,
      color: 'var(--ink)',
      pointerEvents: 'none'
    }
  }, title));
}
function PhoneFrame({
  children,
  label
}) {
  return /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      flexDirection: 'column',
      gap: 10,
      alignItems: 'center'
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      width: 390,
      height: 760,
      background: 'var(--surface)',
      borderRadius: 44,
      border: '1px solid var(--line-strong)',
      overflow: 'hidden',
      display: 'flex',
      flexDirection: 'column',
      position: 'relative'
    }
  }, children, /*#__PURE__*/React.createElement("div", {
    style: {
      position: 'absolute',
      bottom: 8,
      left: '50%',
      transform: 'translateX(-50%)',
      width: 134,
      height: 5,
      borderRadius: 3,
      background: 'var(--ink)',
      opacity: .25
    }
  })), label ? /*#__PURE__*/React.createElement("div", {
    style: {
      fontFamily: 'var(--font-sans)',
      fontWeight: 500,
      fontSize: 12,
      color: 'var(--ink-subtle)'
    }
  }, label) : null);
}
Object.assign(window, {
  StatusBar,
  NativeHeader,
  PhoneFrame
});
})(); } catch (e) { __ds_ns.__errors.push({ path: "ui_kits/app/PhoneFrame.jsx", error: String((e && e.message) || e) }); }

// ui_kits/app/ProfileScreen.jsx
try { (() => {
const {
  Avatar,
  Card,
  SectionLabel
} = DS;

/**
 * src/features/profile/screens/ProfileScreen.tsx — avatar hero, the name as a read-only field,
 * and a muted panel standing in for personal stats. Nothing here is editable yet.
 */
function ProfileScreen({
  profile
}) {
  return /*#__PURE__*/React.createElement("div", {
    style: {
      flex: 1,
      minHeight: 0,
      overflow: 'auto',
      padding: 'var(--space-6) var(--screen-gutter) var(--space-12)'
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center'
    }
  }, /*#__PURE__*/React.createElement(Avatar, {
    displayName: profile.display_name,
    avatarUrl: profile.avatar_url,
    size: 96
  }), /*#__PURE__*/React.createElement("div", {
    style: {
      marginTop: 'var(--space-3)',
      fontFamily: 'var(--font-sans)',
      fontWeight: 500,
      fontSize: 'var(--text-sm)',
      lineHeight: 'var(--text-sm-lh)',
      color: 'var(--ink-subtle)'
    }
  }, "Profielfoto volgt later")), /*#__PURE__*/React.createElement("div", {
    style: {
      marginTop: 'var(--section-gap)'
    }
  }, /*#__PURE__*/React.createElement(SectionLabel, null, "Naam"), /*#__PURE__*/React.createElement(Card, {
    style: {
      marginTop: 'var(--space-2)'
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      fontFamily: 'var(--font-sans)',
      fontWeight: 500,
      fontSize: 'var(--text-lg)',
      lineHeight: 'var(--text-lg-lh)',
      color: 'var(--ink)'
    }
  }, profile.display_name))), /*#__PURE__*/React.createElement("div", {
    style: {
      marginTop: 'var(--section-gap)'
    }
  }, /*#__PURE__*/React.createElement(SectionLabel, null, "Statistieken"), /*#__PURE__*/React.createElement(Card, {
    tone: "muted",
    padding: "var(--space-6) var(--space-4)",
    style: {
      marginTop: 'var(--space-2)'
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      fontFamily: 'var(--font-sans)',
      fontWeight: 500,
      fontSize: 'var(--text-base)',
      lineHeight: 'var(--text-base-lh)',
      color: 'var(--ink-muted)'
    }
  }, "Je persoonlijke statistieken verschijnen hier zodra je spellen hebt gespeeld."))));
}
Object.assign(window, {
  ProfileScreen
});
})(); } catch (e) { __ds_ns.__errors.push({ path: "ui_kits/app/ProfileScreen.jsx", error: String((e && e.message) || e) }); }

// ui_kits/app/SessionScreens.jsx
try { (() => {
const {
  Button,
  Card,
  Badge,
  Avatar,
  SectionLabel,
  NumberStepper,
  ScoreBars
} = DS;
const TEMPLATE = () => TEMPLATES[0];
function total(values, fields) {
  return fields.reduce((sum, f) => sum + f.sign * (values[f.key] ?? 0), 0);
}

/** One participant's card during live entry. Collapsed unless it is the open one. */
function PlayerEntry({
  member,
  values,
  fields,
  open,
  onOpen,
  onChange,
  readOnly
}) {
  const t = total(values, fields);
  return /*#__PURE__*/React.createElement(Card, {
    padding: "0"
  }, /*#__PURE__*/React.createElement("button", {
    type: "button",
    onClick: onOpen,
    style: {
      width: '100%',
      display: 'flex',
      alignItems: 'center',
      gap: 'var(--space-3)',
      background: 'none',
      border: 'none',
      padding: '12px var(--space-4)',
      cursor: 'pointer',
      textAlign: 'left'
    }
  }, /*#__PURE__*/React.createElement(Avatar, {
    displayName: member.display_name,
    size: 36
  }), /*#__PURE__*/React.createElement("span", {
    style: {
      flex: 1,
      minWidth: 0,
      fontFamily: 'var(--font-sans)',
      fontWeight: 600,
      fontSize: 'var(--text-base)',
      lineHeight: 'var(--text-base-lh)',
      color: 'var(--ink)',
      overflow: 'hidden',
      textOverflow: 'ellipsis',
      whiteSpace: 'nowrap'
    }
  }, member.display_name), /*#__PURE__*/React.createElement("span", {
    style: {
      fontFamily: 'var(--font-sans)',
      fontWeight: 700,
      fontSize: 'var(--text-2xl)',
      lineHeight: 'var(--text-2xl-lh)',
      letterSpacing: 'var(--tracking-tight)',
      color: 'var(--ink)',
      fontVariantNumeric: 'tabular-nums'
    }
  }, t)), open && !readOnly ? /*#__PURE__*/React.createElement("div", {
    style: {
      borderTop: 'var(--border)',
      padding: 'var(--space-3) var(--space-4)',
      display: 'flex',
      flexDirection: 'column',
      gap: 'var(--space-3)'
    }
  }, fields.map(f => /*#__PURE__*/React.createElement(NumberStepper, {
    key: f.key,
    label: f.label,
    sign: f.sign,
    value: values[f.key] ?? 0,
    onChange: v => onChange(f.key, v)
  }))) : null);
}

/**
 * Live session. The scorekeeper gets the entry form; everyone else in the group gets the
 * same layout read-only, updating over Realtime.
 */
function LiveSessionScreen({
  readOnly = false,
  onFinish
}) {
  const fields = TEMPLATE().fields;
  const players = MEMBERS.slice(0, 3);
  const [scores, setScores] = React.useState({
    u1: {
      nederzettingen: 4,
      steden: 2,
      langste_weg: 2,
      strafkaarten: 1
    },
    u2: {
      nederzettingen: 5,
      steden: 3,
      langste_weg: 0,
      strafkaarten: 0
    },
    u3: {
      nederzettingen: 3,
      steden: 2,
      langste_weg: 0,
      strafkaarten: 2
    }
  });
  const [open, setOpen] = React.useState('u1');
  const change = id => (key, v) => setScores({
    ...scores,
    [id]: {
      ...scores[id],
      [key]: v
    }
  });
  return /*#__PURE__*/React.createElement("div", {
    style: {
      flex: 1,
      display: 'flex',
      flexDirection: 'column',
      minHeight: 0
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      padding: 'var(--space-2) var(--screen-gutter) 0'
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      alignItems: 'center',
      gap: 'var(--space-3)'
    }
  }, /*#__PURE__*/React.createElement("h1", {
    style: {
      margin: 0,
      flex: 1,
      fontFamily: 'var(--font-sans)',
      fontWeight: 700,
      fontSize: 'var(--text-3xl)',
      lineHeight: 'var(--text-3xl-lh)',
      letterSpacing: 'var(--tracking-tight)',
      color: 'var(--ink)'
    }
  }, "Kolonisten"), /*#__PURE__*/React.createElement(Badge, {
    tone: "warning"
  }, "Bezig")), /*#__PURE__*/React.createElement("div", {
    style: {
      marginTop: 4,
      fontFamily: 'var(--font-sans)',
      fontWeight: 500,
      fontSize: 'var(--text-sm)',
      lineHeight: 'var(--text-sm-lh)',
      color: 'var(--ink-muted)'
    }
  }, readOnly ? 'Alleen lezen · Jasper houdt de score bij' : 'Hoogste totaal wint · jij houdt de score bij')), /*#__PURE__*/React.createElement("div", {
    style: {
      flex: 1,
      minHeight: 0,
      overflow: 'auto',
      padding: 'var(--space-4) var(--screen-gutter) var(--space-8)',
      display: 'flex',
      flexDirection: 'column',
      gap: 'var(--space-2)'
    }
  }, players.map(m => /*#__PURE__*/React.createElement(PlayerEntry, {
    key: m.id,
    member: m,
    fields: fields,
    values: scores[m.id],
    open: open === m.id,
    readOnly: readOnly,
    onOpen: () => setOpen(open === m.id ? null : m.id),
    onChange: change(m.id)
  })), readOnly ? null : /*#__PURE__*/React.createElement("div", {
    style: {
      marginTop: 'var(--space-4)'
    }
  }, /*#__PURE__*/React.createElement(Button, {
    label: "Avond afronden",
    onClick: onFinish
  }))));
}

/** Locked result: winner, final totals, and the bonus rules that fired. */
function SessionResultScreen({
  onDone
}) {
  const rows = [{
    name: 'Mara de Wit',
    total: 10
  }, {
    name: 'Jasper Versteeg',
    total: 7
  }, {
    name: 'Tim Boskamp',
    total: 3
  }];
  return /*#__PURE__*/React.createElement("div", {
    style: {
      flex: 1,
      minHeight: 0,
      overflow: 'auto',
      padding: 'var(--space-6) var(--screen-gutter) var(--space-12)'
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      textAlign: 'center'
    }
  }, /*#__PURE__*/React.createElement(Avatar, {
    displayName: "Mara de Wit",
    size: 72
  }), /*#__PURE__*/React.createElement("div", {
    style: {
      marginTop: 'var(--space-3)'
    }
  }, /*#__PURE__*/React.createElement(Badge, {
    tone: "success"
  }, "Winnaar")), /*#__PURE__*/React.createElement("div", {
    style: {
      marginTop: 'var(--space-2)',
      fontFamily: 'var(--font-sans)',
      fontWeight: 700,
      fontSize: 'var(--text-2xl)',
      lineHeight: 'var(--text-2xl-lh)',
      letterSpacing: 'var(--tracking-tight)',
      color: 'var(--ink)'
    }
  }, "Mara de Wit"), /*#__PURE__*/React.createElement("div", {
    style: {
      fontFamily: 'var(--font-sans)',
      fontWeight: 500,
      fontSize: 'var(--text-base)',
      lineHeight: 'var(--text-base-lh)',
      color: 'var(--ink-muted)'
    }
  }, "Kolonisten \xB7 12 september")), /*#__PURE__*/React.createElement("div", {
    style: {
      marginTop: 'var(--section-gap)'
    }
  }, /*#__PURE__*/React.createElement(SectionLabel, null, "Eindstand"), /*#__PURE__*/React.createElement(Card, {
    style: {
      marginTop: 'var(--space-2)'
    }
  }, /*#__PURE__*/React.createElement(ScoreBars, {
    rows: rows
  }))), /*#__PURE__*/React.createElement("div", {
    style: {
      marginTop: 'var(--section-gap)'
    }
  }, /*#__PURE__*/React.createElement(SectionLabel, null, "Bonusregels"), /*#__PURE__*/React.createElement(Card, {
    tone: "muted",
    style: {
      marginTop: 'var(--space-2)'
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      fontFamily: 'var(--font-sans)',
      fontWeight: 500,
      fontSize: 'var(--text-base)',
      lineHeight: 'var(--text-base-lh)',
      color: 'var(--ink-muted)'
    }
  }, "Mara kreeg +2 punten voor vier steden of meer."))), /*#__PURE__*/React.createElement("div", {
    style: {
      marginTop: 'var(--section-gap)'
    }
  }, /*#__PURE__*/React.createElement(Button, {
    label: "Klaar",
    onClick: onDone
  })));
}
Object.assign(window, {
  LiveSessionScreen,
  SessionResultScreen
});
})(); } catch (e) { __ds_ns.__errors.push({ path: "ui_kits/app/SessionScreens.jsx", error: String((e && e.message) || e) }); }

// ui_kits/app/data.jsx
try { (() => {
// Design-system namespace, read lazily so a stale or not-yet-compiled bundle shows a
// legible notice instead of unmounting the whole tree.
const DS = new Proxy({}, {
  get(_t, key) {
    const ns = window.GameNightHQDesignSystem_d57d33 || {};
    if (ns[key]) return ns[key];
    return function MissingComponent() {
      return /*#__PURE__*/React.createElement("div", {
        style: {
          border: '1px dashed var(--danger-line)',
          borderRadius: 'var(--radius-md)',
          padding: '8px 12px',
          fontFamily: 'var(--font-sans)',
          fontWeight: 600,
          fontSize: 13,
          color: 'var(--danger)'
        }
      }, String(key), " ontbreekt in _ds_bundle.js");
    };
  }
});

// Demo data for the UI kit. Shapes follow the Supabase sketch in CLAUDE.md.
const MEMBERS = [{
  id: 'u1',
  display_name: 'Jasper Versteeg',
  color: 'var(--series-1)'
}, {
  id: 'u2',
  display_name: 'Mara de Wit',
  color: 'var(--series-2)'
}, {
  id: 'u3',
  display_name: 'Tim Boskamp',
  color: 'var(--series-3)'
}, {
  id: 'u4',
  display_name: 'Lotte Prins',
  color: 'var(--series-4)'
}];
const TEMPLATES = [{
  id: 't1',
  name: 'Kolonisten',
  scoring_direction: 'highest_total_wins',
  fields: [{
    key: 'nederzettingen',
    label: 'Nederzettingen',
    sign: 1,
    default_value: 0
  }, {
    key: 'steden',
    label: 'Steden',
    sign: 1,
    default_value: 0
  }, {
    key: 'langste_weg',
    label: 'Langste handelsroute',
    sign: 1,
    default_value: 0
  }, {
    key: 'strafkaarten',
    label: 'Strafkaarten',
    sign: -1,
    default_value: 0
  }],
  bonus_rules: [{
    field_key: 'steden',
    operator: '>=',
    value: 4,
    points_delta: 2
  }]
}, {
  id: 't2',
  name: 'Wie is de Mol',
  scoring_direction: 'lowest_total_wins',
  fields: [],
  bonus_rules: []
}, {
  id: 't3',
  name: 'Dartsavond',
  scoring_direction: 'highest_total_wins',
  fields: [],
  bonus_rules: []
}];
const SESSIONS = [{
  id: 's1',
  game: 'Kolonisten',
  played_at: '12 sep',
  status: 'in_progress',
  scorekeeper: 'u1',
  winner: null,
  totals: []
}, {
  id: 's2',
  game: 'Kolonisten',
  played_at: '2 sep',
  status: 'final',
  winner: 'Mara de Wit',
  totals: [['Mara de Wit', 11], ['Jasper Versteeg', 9], ['Tim Boskamp', 7]]
}, {
  id: 's3',
  game: 'Dartsavond',
  played_at: '29 aug',
  status: 'final',
  winner: 'Tim Boskamp',
  totals: [['Tim Boskamp', 301], ['Jasper Versteeg', 244], ['Lotte Prins', 190]]
}, {
  id: 's4',
  game: 'Kolonisten',
  played_at: '19 aug',
  status: 'final',
  winner: 'Jasper Versteeg',
  totals: [['Jasper Versteeg', 10], ['Mara de Wit', 10], ['Lotte Prins', 6]]
}, {
  id: 's5',
  game: 'Wie is de Mol',
  played_at: '5 aug',
  status: 'final',
  winner: 'Lotte Prins',
  totals: [['Lotte Prins', 3], ['Mara de Wit', 5], ['Tim Boskamp', 8]]
}];
const TREND = {
  labels: ['5/8', '19/8', '2/9', '12/9', '26/9'],
  series: [{
    name: 'Mara',
    color: 'var(--series-2)',
    points: [8, 10, 7, 11, 9]
  }, {
    name: 'Jasper',
    color: 'var(--series-1)',
    points: [6, 10, 9, 8, 12]
  }, {
    name: 'Tim',
    color: 'var(--series-3)',
    points: [5, 6, 8, 7, 7]
  }]
};
Object.assign(window, {
  DS,
  MEMBERS,
  TEMPLATES,
  SESSIONS,
  TREND
});
})(); } catch (e) { __ds_ns.__errors.push({ path: "ui_kits/app/data.jsx", error: String((e && e.message) || e) }); }

__ds_ns.Avatar = __ds_scope.Avatar;

__ds_ns.Button = __ds_scope.Button;

__ds_ns.Card = __ds_scope.Card;

__ds_ns.ListRow = __ds_scope.ListRow;

__ds_ns.EmptyState = __ds_scope.EmptyState;

__ds_ns.SectionLabel = __ds_scope.SectionLabel;

__ds_ns.TextField = __ds_scope.TextField;

__ds_ns.HeadToHead = __ds_scope.HeadToHead;

__ds_ns.Leaderboard = __ds_scope.Leaderboard;

__ds_ns.ScoreBars = __ds_scope.ScoreBars;

__ds_ns.StatTile = __ds_scope.StatTile;

__ds_ns.TrendChart = __ds_scope.TrendChart;

__ds_ns.Badge = __ds_scope.Badge;

__ds_ns.ChoiceRow = __ds_scope.ChoiceRow;

__ds_ns.NumberStepper = __ds_scope.NumberStepper;

__ds_ns.SegmentedControl = __ds_scope.SegmentedControl;

})();
