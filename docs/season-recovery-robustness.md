# Generic season-recovery robustness

The v5 resolver uses a generalized later-season recovery path when the normal AniList/Jikan sequel graph is incomplete.

## Covered title patterns

- `Season 2` / `Season 3` and higher
- `2nd Season` / ordinal season forms
- numeric suffixes such as `... Mobs 2`
- Roman-numeral suffixes such as `II` through `X`
- `Part 2` / `Cour 2`
- provider synopsis/background text explicitly identifying an entry as a later season

## Safety rules

- Ordinary numeric titles do not trigger recovery without season context.
- Standalone `I` is not treated as a Roman-numeral season marker.
- Franchise matching strips recognized season markers before comparison.
- Separately titled sequels such as `Naruto: Shippuden` remain distinguishable from unrelated similarly prefixed titles.
- Candidate discovery is limited to TV entries and is merged back into the existing franchise graph rather than replacing it.

## Regression fixtures

The automated suite covers Hell Mode, Trapped in a Dating Sim, From Old Country Bumpkin to Master Swordsman, Roman-numeral seasons, parent-side sequel traversal, split cours, separately titled sequels, and unrelated similarly named titles.
