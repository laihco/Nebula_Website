---
title: lumalink extract
nav_title: lumalink extract
description: Write files out of a .luma, or out of your imported game, so you can read them or start from a copy.
order: 12
level: intermediate
---

`lumalink extract` writes files out of a `.luma`, or, with `--game`, out of your imported game. Use it to look inside
a mod, or to get a copy of the game's own table, stage placement or particle effect to start your change from.

## Usage

```text
lumalink extract --output <FOLDER> [OPTIONS] <PATH> [ENTRY]...
```

## Example

Unpack a whole `.luma` into a folder:

```sh
lumalink extract -o hello-unpacked you.hello-1.0.0.luma
```

Write only some entries or folders of it:

```sh
lumalink extract -o hello-unpacked you.hello-1.0.0.luma luma.json layers/base
```

Get the game's particle effects as an `effects.json` you can copy from:

```sh
lumalink extract --game <game.pak> -o extracted ParticleData/Effect.arc
```

Get a stage's archive, with its placement tables written as JSON and their columns named:

```sh
lumalink extract --game <game.pak> --self <self-description file> -o extracted StageData/EggStarGalaxy/EggStarGalaxyMap.arc
```

## Arguments

| Argument     | Description                                               |
| ------------ | --------------------------------------------------------- |
| `<PATH>`     | A .luma file; or, with --game, a path in the game.        |
| `[ENTRY]...` | Entries or folders of the .luma to write (all when none). |

## Options

| Option                  | Default     | Description                                                                                                                        |
| ----------------------- | ----------- | ---------------------------------------------------------------------------------------------------------------------------------- |
| `-o, --output <FOLDER>` | required    | The folder to write into.                                                                                                          |
| `--game <FILE>`         |             | Your imported game (Nebula's game.pak): its files, tables and keys.                                                                |
| `--self <FILE>`         |             | The game's self-description, for the names of table columns.                                                                       |
| `-h, --help`            |             | Print this help.                                                                                                                   |
| `--language <LANGUAGE>` | `UsEnglish` | The language LumaLink and the validator speak: one of the game's 14, by its name in the game (UsEnglish, EuGerman, JpJapanese...). |

## Notes

### Starting a change from the game's own data

`extract` writes the game's data in the same forms a mod uses, so you can copy what you need:

- **Tables** (such as a stage's placement, `StageData/<Stage>.arc/jmp/placement/<layer>/objinfo`) are written as
  JSON rows, with column names from `--self`. A mod never replaces a table with rows; it changes rows by key with a
  patch. See [Table patches](content/table-patches.md) and [Stages](content/stages.md).
- **Particle effects**: extracting `ParticleData/Effect.arc` writes the game's particles as an `effects.json`, each
  under `replace` by its name, with every value and its textures by role. Copy one into your mod and change what you
  need; see [Effects](content/effects.md).
- A cell holding bytes that are not text is written as `{ "bytes": "<hex>" }`, which a patch can use to name the
  same cell.

### Game paths

Paths in the game are the disc's paths (`ObjectData/Kuribo.arc`, `StageData/EggStarGalaxy/EggStarGalaxyMap.arc`); a
file inside an archive is written as `ObjectData/Kuribo.arc/Kuribo.bdl`. Find them with
[`lumalink list`](lumalink/list.md).

The command speaks one of the game's 14 languages (`--language`); its findings are the validator's, with the same
codes the game shows.

## See also

- [lumalink list](lumalink/list.md)
- [Table patches](content/table-patches.md)
- [Stages](content/stages.md)
- [Effects](content/effects.md)
- [The .luma file format](reference/luma-format.md)

## Full help text

```text
Write files out of a .luma, or (with --game) out of your imported game.

Usage: lumalink extract --output <FOLDER> [OPTIONS] <PATH> [ENTRY]...

Arguments:
  <PATH>      A .luma file; or, with --game, a path in the game.
  [ENTRY]...  Entries or folders of the .luma to write (all when none).

Options:
  -o, --output <FOLDER>      The folder to write into.
      --game <FILE>          Your imported game (Nebula's game.pak): its files, tables and keys.
      --self <FILE>          The game's self-description, for the names of table columns.
  -h, --help                 Print this help.
      --language <LANGUAGE>  The language LumaLink and the validator speak: one of the game's 14, by its name in the game (UsEnglish, EuGerman, JpJapanese...). Default: UsEnglish.
```
