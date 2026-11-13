---
title: Debugging
nav_title: Debugging
description: Where problems show up, how to read a finding, what happens on a script error or a crash, and how to find out why a mod is off.
order: 6
level: essential
---

When something goes wrong, Nebula always tells you what, where and which mod. Nothing fails silently. This page shows where those messages appear, how to read them, and what the game does when a mod's code fails, so you can go from "it doesn't work" to the file and line quickly.

## Where problems show up

| Where                             | What you see there                                                                                    | When                                     |
| --------------------------------- | ----------------------------------------------------------------------------------------------------- | ---------------------------------------- |
| **LumaLink's output**             | Every finding of `check`, `build` and `pack`, with code, file, line and column                        | Before you ever start the game           |
| **The notice**                    | One line at the bottom-left of the screen for each new error: the mod's id and what happened          | While you play                           |
| **Mods > Log**                    | The whole mod log: every entry, grouped by mod, with its file and line and how many times it happened | Any time, from the Mods screen           |
| **A mod's own page**              | That mod's entries, and why it's off if it is                                                         | From the Mods screen                     |
| **The game's log** (`nebula.log`) | Every mod-log line in English, your mod's `log` lines, and the guard's reports                        | Any time; useful when you share a report |

The same validator runs in LumaLink and in the game, so a problem has the same code and the same words in both places. Fix what `lumalink check` reports and the game won't report it either.

## The mod log

The mod log is one record of everything said about each mod this session: refusals, findings, errors in its code, and content that's missing. It's shown in the player's language.

- **The notice.** A new error appears once as a line at the bottom-left, held for a few seconds. At most three lines show at once. More are folded into "{count} more: Mods > Log". The notice takes no input and never pauses the game. Problems found while the game starts (before the title screen) are summed up in one notice at the title: "{count} mod problems: Mods > Log".
- **The page.** Mods > Log lists every entry under its mod's name. Each row shows the message and `file:line`, and "×N" when it happened more than once. The help line names where the entry came from and its code. Select a row and press A (or Space) to read the whole entry, page by page.
- **Repeats are counted, not repeated.** The same problem at the same place is one entry with a count, so an error in a hook that runs every frame doesn't flood the log.
- **Limits.** The log keeps up to 256 entries per mod. Past that, one last line says how many more were not kept. Each mod's first entries are always kept, so one noisy mod can't hide another's problems.

Each entry says where it came from:

| Source (as the page says it)          | What it means                                                                            |
| ------------------------------------- | ---------------------------------------------------------------------------------------- |
| Found when checking the mod           | A validator finding (an `L` code) at install or at start                                 |
| Found when starting the mod's code    | The mod's code couldn't be started: a missing game function, a permission not allowed... |
| Found when preparing the mod's files  | Cooking the mod's content failed for a file, or two mods overlapped                      |
| Reported by the mod's code            | A script error, a mistake in a service call, or an error from the kernel                 |
| Found while playing                   | Content the game couldn't find or show at run time (a placeholder stands in)             |
| The mod's code failed and was stopped | The guard caught a crash in the mod's native code                                        |

## Reading a finding

A finding names the mod, the file inside it, the place, and what was expected:

```text
you.hello: luma.json line 1: "summary" is missing.
```

That's L203, a required key missing. Findings about files with lines (JSON, LumaScript) give the line and column. Findings about other files name the entry inside the mod, such as `layers/base/assets/aura.json`.

Every finding has a **code** and a **level**:

- **Error**: the mod is refused, or off this session, or something it meant to do didn't happen.
- **Note**: shown so you know, but nothing is lost. For example, two mods replace the same file and the order settled it, or you declared a permission no code uses.

Ask LumaLink what any validator code means, in any of the game's languages:

```sh
lumalink explain L204
lumalink explain 204 --language EuFrench
```

### The families of codes

| Codes                                                     | About                                    | Typical cause                                                                                                                  |
| --------------------------------------------------------- | ---------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------ |
| `L100`-`L108`                                             | The `.luma` container                    | A file that isn't a `.luma`, a bad file name, an unknown top-level folder (L107)                                               |
| `L200`-`L221`                                             | `luma.json`                              | A missing key (L203), a value not allowed (L204), an unknown key (L202), an option (L210) or permission (L211) written wrongly |
| `L300`-`L307`                                             | Layers and files                         | A game path that doesn't exist (L302), a table replaced instead of patched (L303)                                              |
| `L400`-`L407`                                             | Table patches                            | The wrong key for a table (L401), a row that isn't there, a change to another mod's file without `needs` (L405)                |
| `L500`-`L512`                                             | Code                                     | A game function the game doesn't have (L505), a service used without its permission (L506), no code for this platform (L507)   |
| `L700`-`L702`                                             | Data for library mods (`kit/`)           | Data that doesn't match the module's schema, or a data version the installed module doesn't know                               |
| `L800`-`L806`                                             | Starting with other mods and this device | A needed mod missing (L800), a conflict (L801), two mods with one id (L802), a function another mod already replaces (L805)    |
| `S0001` and up                                            | LumaScript                               | Compile errors at build time; script errors while the game runs                                                                |
| Named rows such as `Service.Argument`, `Hook.OutOfMemory` | Services and the kernel                  | A mistake in a call, such as a wrong argument or a closed handle                                                               |

Every code, with its meaning and fix, is in [Error codes](reference/error-codes.md).

## Build errors

LumaScript errors are found when you build, not when you play. Each one names the file, line and column, what was found and what was expected, with an `S` code. All of them are listed in one run. Many mistakes that would crash a mod in other languages are build errors here: a game function that doesn't exist or has a different signature, a wrong type, a service used without its permission, a `skip` without the result a function needs.

## Script errors while the game runs

Some mistakes can only be found while the game runs: an index outside a list, an empty handle, a division by zero, a number that overflows. Each one is a **script error**, and it does this, and only this:

1. The statement stops, and the hook, task or event handler it's in ends.
2. One line goes to the mod log and the game's log: the mod, `file.lum:line`, and what happened, such as `index 7 outside a list of 5` or `division by zero`.
3. The same line again is counted, not repeated.
4. **The mod keeps running.** A script error can't damage memory, so the mod stays on.

The game's own behaviour goes on around the failed hook:

| Hook                                  | After a script error                   |
| ------------------------------------- | -------------------------------------- |
| `before`                              | Doesn't skip: the game's function runs |
| `after`                               | The result stays as it was             |
| `wrap` that hadn't called `proceed()` | Proceeds: the game's function runs     |
| `replace`                             | The game's own result is given         |

A script error in `on start` is different. The mod doesn't start, and the log line names where it failed.

See [Errors at build time and while the game runs](lumascript/errors.md).

## The guard: when native code crashes

LumaScript can't crash the game, but C code in a mod can. So can a library the mod brings. The **guard** catches a crash inside a mod's own code (an invalid memory access, an illegal instruction, an integer division by zero) and:

- switches **that mod off for the rest of the session**. None of its code runs again until the next start, not even its `on stop`. Its hooks are taken out, and so are mods that use it.
- writes a mod-log entry ("The mod's code failed and was stopped") and a line in the game's log naming the mod, the hook or event it was in, the fault and the place in its library;
- lets the game carry on as if the mod's call did nothing: a `before` doesn't skip, a `wrap` or `replace` that hadn't proceeded proceeds.

> [!WARNING]
> Whatever the mod was changing when it crashed may be half done. The game goes on, but test again from a fresh start before you trust the result.

The guard resumes only when it's safe. A crash it can't safely recover from, such as a stack overflow or a crash outside the mod's code, ends the game. The crash report or the error output names the mod. It's never a silent crash. See [The guard in depth](reference/guard.md).

## Why is my mod off?

A mod that's switched on but not running always has a reason, on its page and in the mod log. The common ones:

| Reason                                                     | Code or message                                            | Fix                                                                     |
| ---------------------------------------------------------- | ---------------------------------------------------------- | ----------------------------------------------------------------------- |
| The player's game is another region                        | L208 (Note)                                                | Add the region to `game.regions`, if the mod works there                |
| No code for this platform                                  | L507 (Note)                                                | Build for that platform (`code.platforms`)                              |
| Made for a newer format or Nebula                          | L205, L803                                                 | Update the game, or lower `format` / `nebula`                           |
| A needed mod is missing, off, or the wrong version         | L800                                                       | Install and switch on the mod named, at a version in your range         |
| A conflicting mod is on                                    | L801                                                       | Switch one off                                                          |
| A function is already replaced by a mod higher in the list | L805                                                       | Only one mod may `replace` a function. Use `wrap`, or change the order. |
| Its content couldn't be prepared                           | "Off: its files could not be prepared (see Mods > Log)"    | Read the cook errors in the log for each file                           |
| Waiting for the player's answer                            | "Off: waiting for your answer"                             | Allow the mod's code on the Mods screen                                 |
| A required permission was declined                         | "Off: you did not allow {permission}"                      | Allow it on the mod's page, or make the service optional                |
| This device's graphics lack a feature                      | L806                                                       | Ask at run time instead of listing it in `renderer.features`            |
| A game part is missing                                     | "{part} is missing or damaged, so mods are off this time." | Reinstall the game: every mod is off until it's fixed                   |

## Tracing with log

`log` writes a line to the game's log as your mod, and `{expression}` puts a value in:

```lumascript
hook after MR::getStarPieceNum() -> n {
    log "star pieces: {n}"
}
```

It's the quickest way to see whether a hook runs and with what values. Remove noisy `log` lines before you share a mod.

> [!TIP]
> A native debugger works too. `lumalink build --work <folder>` keeps the generated C, and its `#line` markers make the debugger, crash reports and profiles show your `.lum` file and line.

## See also

- [Error codes](reference/error-codes.md)
- [The mod log in depth](reference/mod-log.md)
- [The guard in depth](reference/guard.md)
- [Errors in LumaScript](lumascript/errors.md)
- [`lumalink explain`](lumalink/explain.md)
