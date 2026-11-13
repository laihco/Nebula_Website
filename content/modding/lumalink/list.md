---
title: lumalink list
nav_title: lumalink list
description: List what is in a .luma, or the tables, models, messages or files of your imported game.
order: 10
level: intermediate
---

`lumalink list` shows what is inside a `.luma`, or, with `--game`, what your imported game has of one kind: its
tables, models, messages or files. Use it to find the exact name of the thing you want to change.

## Usage

```text
lumalink list [OPTIONS] <ITEM> [FILTER]
```

## Example

See what a packed mod holds:

```sh
lumalink list you.hello-1.0.0.luma
```

Find a model of the game by part of its path, for example the Goomba (`Kuribo`):

```sh
lumalink list models Kuribo --game <game.pak>
```

List the game's tables whose path or a column holds `EggStarGalaxy`, with column names from the game's
self-description:

```sh
lumalink list tables EggStarGalaxy --game <game.pak> --self <self-description file>
```

List the game's files in one folder, or its messages in one language:

```sh
lumalink list files StageData --game <game.pak>
lumalink list messages UsEnglish --game <game.pak>
```

## Arguments

| Argument   | Description                                                                                               |
| ---------- | --------------------------------------------------------------------------------------------------------- |
| `<ITEM>`   | A .luma file; or, with --game: tables, models, messages or files.                                         |
| `[FILTER]` | Only those whose path or column holds this (tables, models); the folder (files); the language (messages). |

## Options

| Option                  | Default     | Description                                                                                                                        |
| ----------------------- | ----------- | ---------------------------------------------------------------------------------------------------------------------------------- |
| `--game <FILE>`         |             | Your imported game (Nebula's game.pak): its files, tables and keys.                                                                |
| `--self <FILE>`         |             | The game's self-description, for the names of table columns.                                                                       |
| `-h, --help`            |             | Print this help.                                                                                                                   |
| `--language <LANGUAGE>` | `UsEnglish` | The language LumaLink and the validator speak: one of the game's 14, by its name in the game (UsEnglish, EuGerman, JpJapanese...). |

## Notes

- **What `FILTER` means** depends on the kind: for `tables` and `models` it matches a path or a column; for `files`
  it is the folder to list; for `messages` it is the language.
- **Game paths** are the disc's paths, such as `ObjectData/Kuribo.arc` or
  `StageData/EggStarGalaxy/EggStarGalaxyMap.arc`. A file inside an archive is written as
  `ObjectData/Kuribo.arc/Kuribo.bdl`. Use these paths in your mod's `files/` and `patches/`.
- **Column names** come from the game's self-description (`--self`). A few cells in the game's tables hold bytes
  that are not text; LumaLink shows such a cell as `{ "bytes": "<hex>" }`, the same form a patch uses to name it.
- To get a copy of something you found, use [`lumalink extract`](lumalink/extract.md).
- The command speaks one of the game's 14 languages (`--language`); its findings are the validator's, with the same
  codes the game shows.

## See also

- [lumalink extract](lumalink/extract.md)
- [Content overview](content/overview.md)
- [Table patches](content/table-patches.md)
- [The .luma file format](reference/luma-format.md)

## Full help text

```text
List what is in a .luma, or (with --game) a kind of thing in your imported game.

Usage: lumalink list [OPTIONS] <ITEM> [FILTER]

Arguments:
  [FILTER]  Only those whose path or column holds this (tables, models); the folder (files); the language (messages).
  <ITEM>    A .luma file; or, with --game: tables, models, messages or files.

Options:
      --game <FILE>          Your imported game (Nebula's game.pak): its files, tables and keys.
      --self <FILE>          The game's self-description, for the names of table columns.
  -h, --help                 Print this help.
      --language <LANGUAGE>  The language LumaLink and the validator speak: one of the game's 14, by its name in the game (UsEnglish, EuGerman, JpJapanese...). Default: UsEnglish.
```
