---
title: lumalink check
nav_title: lumalink check
description: Check a mod folder or a .luma with the game's own validator and list every problem, with its file and line.
order: 4
level: essential
---

`lumalink check` runs the game's own validator over a mod folder or a `.luma` and lists every problem it finds. Run
it after every change: it tells you, on your machine, exactly what the game would tell a player.

## Usage

```text
lumalink check [OPTIONS] <PATH>
```

## Example

From the folder above your mod:

```sh
lumalink check hello
```

`check` reads the folder as the game will and prints every finding with its code, its file and, for text files, its
line. For example, a `luma.json` without its `summary` is reported with `L203`, whose words are
`{mod}: luma.json line {line}: "{key}" is missing.`, filled in with your mod's id, the line and `summary`.

Give it your imported game and the game's names folder, and it also cooks your content against the real game, as
the game's start would:

```sh
lumalink check hello --game <game.pak> --names <names folder>
```

Check only the code for the platforms you care about while you work:

```sh
lumalink check hello --platform windows-x64 --platform linux-x64
```

Check a packed file, for example one you downloaded or are about to share:

```sh
lumalink check you.hello-1.0.0.luma
```

Get the report as JSON, for an editor or a script:

```sh
lumalink check hello --json
```

## Arguments

| Argument | Description                   |
| -------- | ----------------------------- |
| `<PATH>` | A mod folder or a .luma file. |

## Options

| Option                  | Default     | Description                                                                                                                        |
| ----------------------- | ----------- | ---------------------------------------------------------------------------------------------------------------------------------- |
| `--names <FOLDER>`      |             | The game's function rows and types file (a kernel build's luma folder), for the rules on a mod's code.                             |
| `--platform <PLATFORM>` | all nine    | A platform to check the code for (repeat for several).                                                                             |
| `--game <FILE>`         |             | Your imported game (Nebula's game.pak): its files, tables and keys.                                                                |
| `--json`                |             | Print the report as JSON.                                                                                                          |
| `-h, --help`            |             | Print this help.                                                                                                                   |
| `--language <LANGUAGE>` | `UsEnglish` | The language LumaLink and the validator speak: one of the game's 14, by its name in the game (UsEnglish, EuGerman, JpJapanese...). |

## Notes

### What it reports

`check` uses the same validator library the game uses at import and at each start, so a finding has the same code
and the same words in both places. Each finding is either an **Error** (the game would refuse the mod, or turn it
off) or a **Note** (shown, not refused). The codes come in groups:

| Codes         | About                                                                                   |
| ------------- | --------------------------------------------------------------------------------------- |
| `L100`-`L108` | The container: the `.luma` file itself and the names inside it.                         |
| `L200`-`L221` | `luma.json`.                                                                            |
| `L300`-`L307` | Layers and files.                                                                       |
| `L400`-`L407` | Table patches.                                                                          |
| `L500`-`L512` | Code: the built libraries, the game names they ask for, permissions they need (`L506`). |
| `L700`-`L702` | Saves a mod brings, and module data such as LumaKit's.                                  |
| `L800`-`L806` | Cook, loader and start: needs, conflicts, and content the cook refuses (`L804`).        |

Every code, with its meaning and fix, is in [Error codes](reference/error-codes.md). `lumalink explain <code>`
prints one in your language.

### With and without the game

Some checks need to know your game. Without `--game`:

- content is not cooked against the game, so a sound, particle or object name the game lacks is not caught
  (an animation inside a game archive is reported as needing the game);
- a check that needs an input you did not give is reported as **not checked**, by name, never skipped silently.

With `--game` (and `--names` for stages and code), `check` cooks each file of the mod the way the game's start does
(models, animation, effects, sound, screens, stage tables) and reports a refusal as `L804` on that file. See
[Content overview](content/overview.md) for what is cooked.

A shader material is compiled during the check. LumaLink uses the compiler named by `NEBULA_DXC`, or `dxc/dxc.exe`
beside its own folder or the game's; with none found, each shader gets a Note that it was not compiled.

### A folder or a .luma

You can check either. A folder is the usual case while you work. Some checks need the folder: a screen's texture
check, for example, cannot look inside a packed `.luma`, and the game does it at start instead.

### Platforms

The nine platforms are `windows-x64`, `windows-arm64`, `linux-x64`, `linux-arm64`, `macos-arm64`, `macos-x64`,
`android-arm64`, `android-x64` and `ios-arm64`. `check` checks the code for all nine unless you name some with
`--platform`.

### Languages

The command speaks one of the game's 14 languages (`--language`); its findings are the validator's, with the same
codes the game shows.

```sh
lumalink check hello --language JpJapanese
```

## See also

- [Check, build, pack and run](start/workflow.md)
- [Debugging](start/debugging.md)
- [Error codes](reference/error-codes.md)
- [How the validator works](reference/validator.md)
- [lumalink explain](lumalink/explain.md)
- [lumalink pack](lumalink/pack.md)

## Full help text

```text
Check a mod folder or a .luma with the game's own validator and list every problem.

Usage: lumalink check [OPTIONS] <PATH>

Arguments:
  <PATH>  A mod folder or a .luma file.

Options:
      --names <FOLDER>       The game's function rows and types file (a kernel build's luma folder), for the rules on a mod's code.
      --platform <PLATFORM>  A platform to check the code for (repeat for several). Default: all nine.
      --game <FILE>          Your imported game (Nebula's game.pak): its files, tables and keys.
      --json                 Print the report as JSON.
  -h, --help                 Print this help.
      --language <LANGUAGE>  The language LumaLink and the validator speak: one of the game's 14, by its name in the game (UsEnglish, EuGerman, JpJapanese...). Default: UsEnglish.
```
