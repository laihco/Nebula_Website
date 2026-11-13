---
title: lumalink pack
nav_title: lumalink pack
description: Write a mod folder as a .luma file, after the validator passes it with every rule checked.
order: 6
level: essential
---

`lumalink pack` turns a mod folder into the single `.luma` file players install. It packs only a mod the validator
passes with every rule checked, so what you share is what the game will accept.

## Usage

```text
lumalink pack [OPTIONS] <FOLDER>
```

## Example

After `check` and `build`:

```sh
lumalink pack hello
```

With the default name, this writes `you.hello-1.0.0.luma` (the mod's `<id>-<version>.luma`) beside the `hello`
folder. Drop the `.luma` on the game's window, or copy it into the game's `mods` folder, and switch it on in the
Mods screen.

Give the game and the names folder so that every rule can be checked, including the cook of your content against
the real game:

```sh
lumalink pack hello --game <game.pak> --names <names folder>
```

Choose the output file yourself:

```sh
lumalink pack hello -o dist/hello.luma
```

## Arguments

| Argument   | Description     |
| ---------- | --------------- |
| `<FOLDER>` | The mod folder. |

## Options

| Option                  | Default                                 | Description                                                                                                                        |
| ----------------------- | --------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------- |
| `-o, --output <FILE>`   | `<id>-<version>.luma` beside the folder | The .luma to write.                                                                                                                |
| `--names <FOLDER>`      |                                         | The game's function rows and types file (a kernel build's luma folder), for the rules on a mod's code.                             |
| `--platform <PLATFORM>` | all nine                                | A platform to check the code for (repeat for several).                                                                             |
| `--game <FILE>`         |                                         | Your imported game (Nebula's game.pak): its files, tables and keys.                                                                |
| `-h, --help`            |                                         | Print this help.                                                                                                                   |
| `--language <LANGUAGE>` | `UsEnglish`                             | The language LumaLink and the validator speak: one of the game's 14, by its name in the game (UsEnglish, EuGerman, JpJapanese...). |

## Notes

- **Every rule checked.** `pack` runs the same validator as [`check`](lumalink/check.md). A check that needs an input
  you did not give (usually `--game` or `--names`) is reported as not checked, and `pack` refuses until it is
  checked. Any Error finding also stops it; Notes do not.
- **Build first.** `pack` packs the code that is in `code/<platform>/`; run [`lumalink build`](lumalink/build.md)
  after changing your code.
- **One file, every platform.** A `.luma` holds the mod's content and one built library set per platform. Nothing
  in it is specific to your machine.
- **The standard form.** `pack` writes `/` between folder names inside the file. A `.luma` made by a tool that wrote
  `\` instead is read, with the Note `L108` saying so.
- **Sources.** A `.luma` may hold the mod's `source/` folder. The game never reads it; it is there for
  [`lumalink verify`](lumalink/verify.md), which confirms that a `.luma` is exactly what its folder packs to.
- What a `.luma` holds, folder by folder, is in [The .luma file format](reference/luma-format.md).
- The command speaks one of the game's 14 languages (`--language`); its findings are the validator's, with the same
  codes the game shows.

## See also

- [Check, build, pack and run](start/workflow.md)
- [Versions, dependencies and sharing](start/sharing.md)
- [The .luma file format](reference/luma-format.md)
- [lumalink check](lumalink/check.md)
- [lumalink verify](lumalink/verify.md)

## Full help text

```text
Write a mod folder as a .luma, after the validator passes it with every rule checked.

Usage: lumalink pack [OPTIONS] <FOLDER>

Arguments:
  <FOLDER>  The mod folder.

Options:
  -o, --output <FILE>        The .luma to write. Default: <id>-<version>.luma beside the folder.
      --names <FOLDER>       The game's function rows and types file (a kernel build's luma folder), for the rules on a mod's code.
      --platform <PLATFORM>  A platform to check the code for (repeat for several). Default: all nine.
      --game <FILE>          Your imported game (Nebula's game.pak): its files, tables and keys.
  -h, --help                 Print this help.
      --language <LANGUAGE>  The language LumaLink and the validator speak: one of the game's 14, by its name in the game (UsEnglish, EuGerman, JpJapanese...). Default: UsEnglish.
```
