# Nuwaubian Temple Calendar in the World Credit Clock

The World Credit Clock now supports a sacred-time layer derived from the Nuwaubian Calendar description supplied for **The Daily Word from Maku**.

## Purpose

The quantitative clock continues to calculate:

`population × 33 NOMNI × elapsed whole hours`

The sacred-time layer answers a different question: **what natural, celestial, ecclesiastical and instructional cycle is active at the same instant?**

The two are synchronized but not collapsed into one another.

## Nilotic Time / Nile Time

Within the supplied NEO ecclesiastical description, Nilotic Time is a natural timekeeping framework tied to:

- solar movement and the ancient sundial;
- lunar cycles;
- stellar positions;
- Sirius / Sepdet / Sothis and the Sothic cycle;
- Nile renewal / rising;
- equinoxes and solstices;
- seasons of enlightenment, renewal and discipline;
- feast and fasting periods;
- sacred colors, vestments, moods or vibrations;
- temple prayers and practices;
- daily and weekly lectionary readings.

## Implementation rule

The NEO System does **not** invent feast dates, colors, readings, lunar phases, Sirius dates, Nile markers or Indigenous seasonal knowledge. Those values enter as source-supplied or observed `TempleObservance` / `TempleCalendarContext` records.

`calculateWorldCreditClock()` accepts an optional `templeCalendar` context and returns a `sacredTime` snapshot containing:

- active observances;
- upcoming observances;
- solar/lunar/stellar/Nilotic signals;
- Sirius/Sothic marker;
- equinox/solstice marker;
- current season;
- active lectionary readings;
- sacred colors;
- vibration/mood descriptors;
- source-preserving calendar principles.

## World Credit Clock model

```text
WORLD CREDIT CLOCK
├── Quantitative Time
│   ├── population
│   ├── 33 NOMNI / person-hour
│   ├── elapsed hours
│   └── cumulative modeled NOMNI
│
└── Sacred / Natural Time
    ├── Nilotic Time
    ├── Solar cycle
    ├── Lunar cycle
    ├── Stellar / Sothic cycle
    ├── Nile renewal
    ├── Equinox / solstice
    ├── Temple season
    ├── Feast / fast / observance
    ├── Sacred color / vibration
    └── Lectionary / temple practice
```

This makes the **World Credit Clock / Clock of Destiny / Cloak of Destiny** both a quantitative mutual-credit clock and a source-aware natural/ecclesiastical timing interface.
