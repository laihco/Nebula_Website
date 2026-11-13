---
title: How the validator works
nav_title: The validator
description: The one validator LumaLink and the game share - what it reads, when the game runs it, what it keeps between starts, how findings are reported, and which mod wins an overlap.
order: 4
level: advanced
---

The validator is the part of Nebula that decides whether a mod is well formed and can run. This page explains how it
works, so you can predict what the player will see from what `lumalink check` shows you. For the codes themselves,
see [Error codes](reference/error-codes.md).

## One validator, two places

There is exactly one validator. LumaLink runs it before it packs (`check`, `pack`), and the game runs the same
library when a player imports a mod and when the game starts. The game and LumaLink of one release are always built
from the same validator. So:

- **what passes one passes the other**, and
- **the messages are the same**, word for word, in each of the game's 14 languages.

If `lumalink check` is clean with every input given, the player's import will be clean too, except for the checks
that depend on the player's own game, device and other mods (below).

The validator never stops at the first problem. One run reports every finding it can, sorted, and two runs on the
same input give identical reports.

## What it reads

| Input                  | When LumaLink runs it                                                                                       | When the game runs it                 |
| ---------------------- | ----------------------------------------------------------------------------------------------------------- | ------------------------------------- |
| The mod                | your mod folder or a `.luma`                                                                                | the `.luma` being imported or started |
| The game's description | the names folder you give with `--names`, and your imported game with `--game` (its files, tables and keys) | its own                               |
| The other mods         | the mods in your `needs`, as found in LumaLink's mod folder                                                 | every installed mod                   |
| The platform           | every platform you build for (`--platform`, default all nine)                                               | its own                               |
| Options                | the defaults                                                                                                | the player's values                   |

### Not checked

A rule that needs an input that is not there is reported as **not checked**, by name; it is never skipped silently.
For example, without `--game`, LumaLink cannot know whether a game path or a table row exists, and without `--names`
it cannot check the names your code imports. `lumalink pack` writes a `.luma` only after the validator passes it with
every rule checked, so give `check` and `pack` both inputs.

Some rules are only ever checked by the game, because only the player's machine has the input:

- **L806**, a graphics feature the device lacks: LumaLink has no device.
- **L504** on macOS and iOS (the system imports allowed there), and **L511** (what iOS signing allows): not checked
  until those platforms' lists exist.

## When the game runs it

### At import

When a player imports a `.luma`, the game runs **every** rule over the whole file. The report is kept beside the
installed mod, with a fingerprint of the `.luma`, and the import screen shows each finding.

### At each start, and each change of the mod list or options

The game checks again, because the answer can change without the mod changing: the player may have turned another mod
on, changed an option, updated Nebula, or moved to another device. This check is quick. It uses the kept report when
all of these hold:

- it is for the same `.luma` (the fingerprint of its zip directory: each entry's name, method, checksum, sizes and
  place);
- it was made by the same validator version;
- it was made against the same game: release, region, platform, languages, LumaCore version, the game's names, the
  services catalog and the store of game files.

Then the rules that need to read the whole `.luma` are not run again; their findings are taken from the kept report
(L106, and every finding about patches: L302 from a patch, L400 to L403, L405 to L407). **Every other rule runs
again**, including:

| Depends on                                   | Rules                                                    |
| -------------------------------------------- | -------------------------------------------------------- |
| The player's region and languages            | L208, L214                                               |
| The player's options                         | L301                                                     |
| This game's names and services               | L505, L506, L507, L508                                   |
| The installed versions of library mods       | L700 to L702                                             |
| The other mods that are on, and this release | L800 to L803, L805, L806, and the overlaps L305 and L404 |

If anything does not match, or the kept report is damaged in any byte (it ends with a checksum of everything before
it), every rule runs, as at import. A mod with an Error from the start check is **off for this session**, and the
Mods page and the mod log say why. See [How the game loads a mod](reference/loading.md).

A new graphics card is noticed at once: the rules on `luma.json` run at every start, and L806 reads the device's
features each time.

## A finding

| Field            | Meaning                                                                                                     |
| ---------------- | ----------------------------------------------------------------------------------------------------------- |
| `code`           | The rule, such as L203                                                                                      |
| `level`          | Error (the mod is refused, or off) or Note (shown, not refused)                                             |
| `mod`            | The mod's id; empty only when `luma.json` cannot be read, and then `file` names the `.luma`                 |
| `file`           | The entry inside the mod: `luma.json`, `layers/base/patches/...`                                            |
| `line`, `column` | The place in a text file                                                                                    |
| `pointer`        | A JSON pointer into the file, such as `/options/2/default`                                                  |
| values           | The message's named values: `{mod}`, `{file}`, `{line}`, `{found}`, `{expected}`, `{why}` and per-rule ones |

`lumalink check --json` prints these fields.

### Messages

Every code has one message template, short and plain, in all 14 of the game's languages. The place (mod, file and
line) is always part of the message, so you never have to guess where. Values that are words, such as the `{why}` of
L211, are themselves translated phrases (`Perm.NoWhy`, `Expect.Host`...), so no English reaches a player who plays in
another language.

The wording of a message may be improved in a later version; its code and its named values never change. A code is
never reused for another meaning.

## Errors, Notes and who wins

An **Error** means the mod, as it is, cannot be used: it is refused at import, or off at this start, with the reason.
A **Note** is shown but changes nothing: an overlap the order settled, a permission you may not need, a selector that
matched no row.

When two mods that are on touch the same thing, one rule decides, and it is the player's to set: **the mod higher in
the Mods list wins**.

| Overlap                                                                | Result                                            | Code                          |
| ---------------------------------------------------------------------- | ------------------------------------------------- | ----------------------------- |
| Two mods replace the same file                                         | The higher mod's file is used                     | Note L305                     |
| Two mods change the same table cell, or one adds a row another removes | The higher mod's change is used                   | Note L404                     |
| Two mods replace the same game function                                | The higher mod keeps it; the lower mod is refused | Error L805, naming the higher |

File and cell overlaps are Notes because the player chose the order, and the Mods screen shows every overlap. A
function can only be replaced once, so the lower mod cannot work as written and is refused. (Wraps stack instead: see
[Hooking the game's functions](lumascript/hooks.md).)

## Versions

The validator's version is `<format major>.<rules minor>`. A new minor adds rules for things the format gained or for
new content kinds. It never makes a mod that passed an earlier minor fail, unless the mod uses something the new
minor added.

## In depth: which checks need what

| `lumalink check` option | What it lets the validator check                                                                         |
| ----------------------- | -------------------------------------------------------------------------------------------------------- |
| `--names <FOLDER>`      | The rules on a mod's code: the names it imports (L505), the services and their permissions (L506)        |
| `--game <FILE>`         | Your imported game's files, tables and keys: game paths (L302, L303), patch keys and rows (L401 to L403) |
| `--platform <PLATFORM>` | Which platforms' code to check (repeat for several; default all nine)                                    |
| `--language <LANGUAGE>` | The language of the messages                                                                             |
| `--json`                | The report as JSON                                                                                       |

## See also

- [Error codes](reference/error-codes.md)
- [lumalink check](lumalink/check.md)
- [lumalink pack](lumalink/pack.md)
- [How the game loads a mod](reference/loading.md)
- [The .luma file format](reference/luma-format.md)
