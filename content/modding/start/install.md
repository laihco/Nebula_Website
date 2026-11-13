---
title: Install the tools
nav_title: Install
description: What you need on your computer to make mods - LumaLink, the clang compiler it builds with, the game's SDK and names folders, and your imported game.
order: 2
level: essential
---

Set up LumaLink and the files it needs to validate, build, and package a mod.

> [!NOTE]
> Download links for LumaLink and the game's SDK and names folders will be published with the toolkit's release. This page describes what each part is and how LumaLink finds it.

## What you need

| Part                   | What it's for                                                                                                                                                                          | How LumaLink finds it                                                                                                            |
| ---------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------- |
| **LumaLink**           | The command-line tool that checks, builds, packs, runs and tests mods.                                                                                                                 | On your system's search path (`PATH`), so you can type `lumalink` in a terminal.                                                 |
| **clang (LLVM)**       | The C compiler and linker LumaLink uses to turn a mod's code into a native library for each platform.                                                                                  | `--clang <FILE>`, else the `LUMALINK_CLANG` environment variable, else LLVM's own install folder, else the system's search path. |
| **The SDK folder**     | The folder that holds the game's `luma.h`, the C header every mod's library is built against.                                                                                          | `--sdk <FOLDER>`, else the `LUMA_INCLUDE` environment variable.                                                                  |
| **The names folder**   | The game's description of itself for mods: its function rows and types (and the services and renderer features it offers). LumaLink checks your code against it.                       | `--names <FOLDER>` on `build`, `check` and `pack`.                                                                               |
| **Your imported game** | Nebula's `game.pak`, made when you imported your copy of the game. LumaLink reads its files, tables and keys to check content and patches, and to list and extract what's in the game. | `--game <FILE>` on `check`, `pack`, `list` and `extract`.                                                                        |
| **Nebula**             | The game itself, to play and test your mods.                                                                                                                                           | `lumalink run` starts it with your mod.                                                                                          |

You only need clang and the SDK folder to **build code**. A mod with only content (textures, models, table patches) can be checked and packed without them.

## LumaLink

LumaLink is a single command, `lumalink`, with one subcommand per job. Every subcommand prints its own help:

```sh
lumalink check --help
```

| Command                          | What it does                                                                            |
| -------------------------------- | --------------------------------------------------------------------------------------- |
| [`new`](lumalink/new.md)         | Start a mod: a folder with its `luma.json` and an empty base layer.                     |
| [`check`](lumalink/check.md)     | Check a mod folder or a `.luma` with the game's own validator and list every problem.   |
| [`build`](lumalink/build.md)     | Build a mod's code (LumaScript and C) for every platform.                               |
| [`pack`](lumalink/pack.md)       | Write a mod folder as a `.luma`, after the validator passes it with every rule checked. |
| [`run`](lumalink/run.md)         | Start the game with a mod.                                                              |
| [`test`](lumalink/test.md)       | Run a mod's tests.                                                                      |
| [`verify`](lumalink/verify.md)   | Check that a `.luma` is exactly what its folder packs to.                               |
| [`add`](lumalink/add.md)         | Add a character, model or other part to a mod by command.                               |
| [`list`](lumalink/list.md)       | List what's in a `.luma`, or (with `--game`) a kind of thing in your imported game.     |
| [`extract`](lumalink/extract.md) | Write files out of a `.luma`, or (with `--game`) out of your imported game.             |
| [`convert`](lumalink/convert.md) | Convert a published mod (Riivolution, texture pack, Gecko list...) to a `.luma`.        |
| [`explain`](lumalink/explain.md) | Say what a validator code (`L203`, or `203`) means.                                     |

A good first test of your install is `explain`, because it needs nothing else set up:

```sh
lumalink explain L203
```

### LumaLink in your language

LumaLink and the validator speak all 14 of the game's languages. Pass `--language` to any command with the game's own name for the language:

```sh
lumalink check --language EuGerman hello
```

The names are `UsEnglish` (the default), `EuEnglish`, `UsFrench`, `EuFrench`, `UsSpanish`, `EuSpanish`, `EuGerman`, `EuItalian`, `EuDutch`, `UsPortuguese`, `JpJapanese`, `KrKorean`, `CnSimpChinese` and `TwTradChinese`. Findings keep the same codes in every language, so `L203` means the same thing whatever language you read it in.

## clang

LumaLink compiles LumaScript to C and then builds the C with clang and LLVM's linker (lld) for each platform. It builds all nine platforms from one machine. A mod's library uses no system libraries, so you don't need each platform's SDK.

LumaLink looks for clang in this order:

1. the file given with `--clang <FILE>` on `lumalink build`;
2. the `LUMALINK_CLANG` environment variable;
3. LLVM's own install folder;
4. the system's search path.

Each LumaLink release is built and tested with one pinned LLVM version. Using that version matters if you want reproducible builds: the same sources, the same LumaLink release and the same game description give byte-identical libraries, which is what [`lumalink verify`](lumalink/verify.md) relies on.

## The SDK folder

The SDK folder holds `luma.h`, the header that defines how a mod's library talks to the game. Code generated from LumaScript includes it, and so does any C you write in a mod. Point LumaLink at it once with an environment variable:

```sh
export LUMA_INCLUDE=/path/to/sdk/include
```

On Windows, set `LUMA_INCLUDE` in System Properties > Environment Variables (or with `setx` in a terminal), then open a new terminal. You can also pass `--sdk <FOLDER>` to `lumalink build` each time.

## The names folder

The names folder is the game's description of itself for mods: its function rows and types. It also lists the services the game offers (`luma_services.json`) and the graphics features its renderer knows (`luma_renderer.json`). LumaLink uses it to:

- check that every game function, field and class your code names exists, with the types you use;
- check that every service your code imports exists in this version of the game;
- write your library's import list.

Pass it with `--names <FOLDER>`. `lumalink build` requires it. `check` and `pack` take it too, and need it for the rules on a mod's code:

```sh
lumalink build --names /path/to/names hello
```

Use the names folder that matches the Nebula release you're modding. In these docs, `<names>` stands for the path to your names folder.

## Your imported game

Many checks compare your mod with the game: does this game path exist, is that file a table with rows, does this patch's key match a row? For those, LumaLink reads your imported game, Nebula's `game.pak`, with `--game <FILE>`:

```sh
lumalink check --names <names> --game <game.pak> hello
lumalink list --game <game.pak> models
```

In these docs, `<game.pak>` stands for the path to your imported game.

> [!WARNING]
> When an input a check needs is missing, LumaLink doesn't skip the check silently. It reports the check as **not checked** and names it, and `lumalink pack` refuses to pack until every rule has been checked. If `pack` refuses with "not checked" findings, add `--names` and `--game`.

## Environment variables

| Variable         | Used by          | Meaning                                                                 |
| ---------------- | ---------------- | ----------------------------------------------------------------------- |
| `LUMA_INCLUDE`   | `lumalink build` | The SDK folder with the game's `luma.h`. Used when `--sdk` isn't given. |
| `LUMALINK_CLANG` | `lumalink build` | The clang to build with. Used when `--clang` isn't given.               |

## Check your setup

Run this command in a new terminal to check that LumaLink is on your `PATH`.

```sh
lumalink explain L203
```

To verify that the names folder, imported game, compiler, and SDK work together, [build the Hello mod](start/first-mod.md#check-build-and-package-the-mod) after creating its files.

| Problem                                 | Fix                                                                                      |
| --------------------------------------- | ---------------------------------------------------------------------------------------- |
| `lumalink` isn't found                  | Add the folder holding LumaLink to your `PATH`, then open a new terminal.                |
| clang isn't found                       | Install LLVM, or set `LUMALINK_CLANG` to the clang file, or pass `--clang`.              |
| `luma.h` isn't found                    | Set `LUMA_INCLUDE` to the SDK folder, or pass `--sdk`.                                   |
| Findings say "not checked"              | Pass `--names` (code rules) and `--game` (content and patch rules).                      |
| Every game name in your code is unknown | `--names` points at the wrong folder, or at the description of a different game release. |

> [!TIP]
> Keep the generated C when you want to see what the compiler made of your code: `lumalink build --work <folder>` keeps it in that folder instead of a temporary one.

## See also

- [Your first mod](start/first-mod.md)
- [LumaLink overview](lumalink/overview.md)
- [`lumalink build`](lumalink/build.md)
- [`lumalink check`](lumalink/check.md)
