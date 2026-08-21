# Nuwaubian Calendar Carry-Forward

The NEO System carries the 1998 *Nuwaubian Calendar: A Daily Word From Maku* forward as a continuous sacred-cycle calendar.

## Source rule

The source states:

- 19 months per Nuwaubian year
- 19 days per month
- 4 internal weeks per month
  - Week 1: 5 days
  - Week 2: 5 days
  - Week 3: 5 days
  - Week 4: 4 days
- 19 hours per Nuwaubian day
- the 1998 source edition is Nuwaubian Year 53
- June 26, 1945 is designated Year 1

This gives a 361-day sacred year.

## Epoch

`1998-06-26 Gregorian = Nuwaubian Year 53, Month 1, Day 1`

No Gregorian leap-day correction is inserted into the sacred year. The 361-day cycle continues day by day, causing Nuwaubian year boundaries to move through Gregorian dates.

## Current carried-forward date

For `2026-08-21`:

- Nuwaubian Year: **81**
- Month: **10**
- Day: **5**
- Internal week: **1**
- Day in internal week: **5**
- Sacred-year ordinal: **176 / 361**
- Source-cycle correspondence: **1998-12-18**

The source Daily Word at that cycle position is:

> Only Your Body Is Locked Up, Not Your Soul. Now Free Your Spirit And Your Body Will Follow.

## World Credit Clock integration

`resolveTempleCalendar()` now automatically returns `nuwaubianDate`, so a World Credit Clock sacred-time snapshot can expose the carried-forward calendar position alongside NOMNI accumulation and supplied solar, lunar, stellar, Nilotic, seasonal, feast, fast and lectionary context.

The source also names observances including Munajiyy Yawum, El Mahdi Yawum, Anunnaqi Wa Neteru Yawum, Zaguanaat Yawum, A'yd Shil Hamudtud, Uwludaat Yawum, Aythr Yawum, Sadugud Yawum and Raju' Shil El Masuh Yawum. Their detailed date/ritual metadata should be transcribed as source records rather than inferred.

## Integrity rule

The source says Nuwaubian days contain 19 hours, but the supplied edition does not provide a sufficiently explicit sub-day conversion ratio for translating a modern 24-hour clock into numbered Nuwaubian hours. The NEO System therefore stores the 19-hour doctrine but does not fabricate hour/minute conversion semantics.
