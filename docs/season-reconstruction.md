# Generalized season reconstruction

The v5 resolver now recovers an earlier season when the requested anime is a later season, using directional prequel relationships plus conservative franchise-title matching.

Regression coverage includes:

- later-season requests with an unmarked Season 1
- explicit numeric seasons
- Roman-numeral seasons
- split cour/part handling
- parent-side sequel chains
- differently formatted season titles
- separately titled sequels such as Naruto: Shippuden, which must not become a season
- long-running and episode-source regressions already covered by the v5 suite

This deployment is intended for live validation against representative anime that were not previously tuned individually.
