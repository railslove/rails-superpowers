---
name: rails-naming-conventions
description: Guidance for choosing good names for classes, methods, variables, and any other identifier in Ruby/Rails code — judging whether a name actually communicates, not syntax rules. Use whenever creating a new class, module, method, or variable; renaming something; reviewing a PR for naming quality; or when someone asks "what should I call this", "is this a good name", or mentions "naming convention". Always invoke before introducing a new identifier in Ruby code.
---

# Rails Naming Conventions

A name is the cheapest documentation you'll ever write, and the one every reader sees first. A good name means the reader never needs a comment to know what a thing is or does; a bad one means every caller has to go read the implementation to find out. That's the standard every name here is judged against — not case style, not syntax, but whether the name alone tells the truth.

## Say what it is or does, not how

A name should describe the thing's purpose or behavior, not its implementation detail or its type. `Invoice` says what it is. `InvoiceDataObject` says what it's built from — information the reader doesn't need and that becomes wrong the moment the implementation changes.

Ask: if a new reader saw only this name, with no other context, would they already know what it does or holds? If the honest answer requires "well, if you look at what it actually does..." — that's the tell the name isn't working.

## Avoid catch-all words

Some words describe nothing because they could describe almost anything: `Manager`, `Helper`, `Util`, `Handler`, `Processor`, `Data`, `Service` (used generically), `Info`, `Object`. They're what gets written when the author hasn't decided what a thing is actually responsible for — the name is a placeholder for a decision that never got made.

| Vague | Better | Why |
| --- | --- | --- |
| `UserManager` | `User`, or a class named for the one thing it does (`ArchiveUser`, `SendWelcomeEmail`) | "Manager" could mean anything; look at what the methods inside actually do and name it that |
| `DataHelper` | inline the logic where it's used, or name the specific transformation it performs | "Helper" is where code goes to avoid being named |
| `process_data` | name the actual transformation: `parse_csv_rows`, `normalize_email` | "process" and "data" are both placeholders |

The fix is always the same: look at what the thing actually does, and name that.

## One name, one concept

If a name needs "and" to describe it (`process_and_notify`, `validate_and_save`), it's doing two things and should probably be two names. A method or class that does one thing can always be named precisely; one that resists a precise name is usually a sign it's taken on more than one job.

## Don't let a name lie

A name is a promise about behavior. When the behavior changes, the name has to change with it — a method called `valid?` that has a side effect, or a class called `ReadOnlyCache` that sometimes writes, is worse than no name at all, because it actively misleads instead of just failing to help. Rename fearlessly when a name and its behavior drift apart; a stale-but-familiar name causes more bugs over time than the churn of renaming costs.

## Match the name's effort to its lifetime and reach

A variable used for two lines inside a single block can be terse (`i` in a loop, `e` for a caught exception) — the reader holds the whole context in their head anyway. Anything that outlives a few lines, gets reused elsewhere, or is visible to other callers (a public method, a class, an association) earns a name that stands on its own without the surrounding lines to explain it.

## Use one word per concept, consistently

If the codebase already calls something an `invoice`, don't introduce `bill` or `receipt` for the same concept elsewhere — and don't reuse `invoice` for something genuinely different. Consistent vocabulary means a reader who's learned one part of the codebase can trust the same word means the same thing everywhere else. Before naming something, check whether the codebase already has a word for it.

## Reviewing Names in a Diff

1. **Would a reader know what this does/holds from the name alone, with no other context?**
2. **Any `Manager`/`Helper`/`Util`/`Processor`/generic `Service` names that could instead name the actual responsibility?**
3. **Any name joined with "and" that's really doing two things?**
4. **Does every name still match what its code actually does — nothing renamed after a behavior change slipped through?**
5. **Is the same concept called by the same word everywhere it appears, and a new word only introduced for something genuinely different?**
