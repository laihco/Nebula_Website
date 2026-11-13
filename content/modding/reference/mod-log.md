---
title: The mod log in depth
nav_title: The mod log
description: Everything the in-game mod log records about a mod - where entries come from, Errors and Notes, how repeats are counted, the limits, the on-screen notices and the Mods > Log page.
order: 8
level: advanced
---

The mod log is the game's record of everything said about mods in this session: refusals, validator findings,
script errors, service mistakes, missing content and crashes. It is in the player's language, readable inside the game
without opening a file, and it says the mod, the file and the line. This page explains what goes into it and how it
is shown, so you know where to look and what a player will report to you.

## Where to read it

- **While playing:** a short notice at the bottom left of the screen for each new Error.
- **Mods > Log:** the whole log, grouped by mod. Open the Mods page and choose the LOG row, which shows how many
  entries there are ("LOG (3)").
- **A mod's own page:** that mod's entries, under its options.
- **The game's log file (`nebula.log`):** every line in English, for you and for bug reports.

## Where entries come from

| Source    | Shown as                                | What it records                                                                               |
| --------- | --------------------------------------- | --------------------------------------------------------------------------------------------- |
| Validator | "Found when checking the mod"           | A finding at import or at a start (L codes)                                                   |
| Loader    | "Found when starting the mod's code"    | A refusal when binding the mod's code, or the start order (a need that did not start)         |
| Cook      | "Found when preparing the mod's files"  | A file that failed to cook (L804), an overlap the list order settled (L305, L404)             |
| Code      | "Reported by the mod's code"            | The kernel's codes 1 to 99, a service's 100 to 619, LumaScript's script errors (S0901 and up) |
| Content   | "Found while playing"                   | A name not found, a placeholder standing in, an effect that draws nothing (620 to 699)        |
| Guard     | "The mod's code failed and was stopped" | A crash in the mod's code that [the guard](reference/guard.md) caught                         |

The codes are listed on [Error codes](reference/error-codes.md).

## Errors and Notes

Each entry is an **Error** (something the mod meant does not happen: it was refused or switched off, a placeholder
stands in, a call did nothing) or a **Note** (shown, nothing lost: an overlap the order settled, a selector that
matched no row).

| Source    | Level                                                                                                                            |
| --------- | -------------------------------------------------------------------------------------------------------------------------------- |
| Validator | The finding's own level                                                                                                          |
| Loader    | Error, except "Off: you did not allow {permission}", which is the player's own choice and a Note                                 |
| Cook      | Error for a failed file, Note for an overlap                                                                                     |
| Code      | Error, except the Notes a service writes to tell the player something (a page the mod opened in the browser, the clipboard read) |
| Content   | Error                                                                                                                            |
| Guard     | Error                                                                                                                            |

## One entry per problem, counted

An entry is identified by its mod, source, code, file, line and column. When the same problem happens again, the
entry's count grows; nothing else changes and it is not shown again. A script error in a hook that runs every frame
is therefore one entry with a large count, not thousands of lines. The values in the message are those of the first
time.

The game's log gets one English line the first time, then again at the 10th, 100th, 1,000th time and so on, with
"(seen N times)":

```text
[mod <id>] <file>:<line>: <text>
```

## Limits

| Limit                                                    | Value              |
| -------------------------------------------------------- | ------------------ |
| Entries per mod                                          | 256                |
| Entries per session, all mods together                   | 1,024              |
| Entries always kept per mod, even past the session limit | the mod's first 16 |

So one mod with many problems never hides another mod's first ones. Past a limit, one line for that mod says how many
were not kept: "`{mod}: {count} more problems; only the first are kept`". A message's values are always kept whole,
never cut.

The log lasts for the session. Nothing is written to disk by it; `nebula.log` already has every line in English. A
mod that is [reloaded](reference/reload.md) keeps its earlier entries, marked with the reload's number.

## The notice

- **Which entries.** Each new Error is shown once. Notes are not, except a page a mod opened in the browser, so a
  player coming back to the game sees which mod did it.
- **Before the title.** Entries from the start (the start check, the loader, the cook) are not shown one by one: when
  the title appears, one notice says "`{count} mod problems: Mods > Log`".
- **What.** One line: the mod's id, a colon, and the message (just the message when it already begins with the id).
  A line too long for the notice ends in "…"; the log page has it whole.
- **Where and how long.** Bottom left, above the game's own bottom row, in the game's message font. At most three
  lines at once, the newest at the bottom; each stays 6 seconds, then fades. When more than three wait, the oldest
  waiting fold into one line: "`{count} more: Mods > Log`".
- **Never in the way.** A notice takes no input, pauses nothing and plays no sound. It is drawn over the game but under
  the settings menu and the game's pause screens, so it never covers a choice the player must read. Lines carry over
  scene changes and wait through scenes such as the star select.
- **In pictures.** The notice is part of the frame: screenshots and recordings show it.

## The log page

Mods > Log lists every entry, grouped under each mod's name, mods in the Mods list's order:

| Part      | What it shows                                                                                                     |
| --------- | ----------------------------------------------------------------------------------------------------------------- |
| Label     | The message, on one line                                                                                          |
| Value     | `file:line` (or just the file), and "×N" when the entry was counted more than once                                |
| Help line | For the selected row: where it came from in words, the code (`L203`, `S0904`, `Hook.OutOfMemory`) and the message |

Press A (or Space) on an entry to open it whole, a page at a time: the source, the code, the place, and the full
message. Use this for long messages, such as an L505 that lists every signature the game has for a name. Back (B or
Escape) returns to the list.

The page is read with the pad, keyboard, mouse or touch, and nothing on it changes anything. With no entries, the LOG
row reads "Nothing to report."

## When text is missing

Messages are worded by Nebula's importer library. If it is missing, entries show their code and values instead of
words (for example `L505 kind=P:Name.Function found=T:Mario::foo sig=T:void()`), and the log adds one Error: "`Mod
messages are shown as codes: the importer library is missing`". The player sees that words are missing, never a blank
line. Reinstalling Nebula fixes it.

A message that names a value the entry does not give shows `{name}` in its place, visible rather than blank.

## No mod, no cost

With no mod in the session, the log is never created and nothing is done per frame. With mods but nothing said, the
notice costs one read a frame.

## See also

- [Debugging](start/debugging.md)
- [Error codes](reference/error-codes.md)
- [The guard in depth](reference/guard.md)
- [Errors at build time and while the game runs](lumascript/errors.md)
