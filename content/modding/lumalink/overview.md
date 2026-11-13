---
title: LumaLink overview
nav_title: Overview
description: What the LumaLink command-line tool does across a mod's life, the build environment it needs, and every command at a glance.
order: 1
level: essential
---

LumaLink is the command-line tool you make mods with. It starts a mod folder, checks it with the game's own
validator, compiles its code for every platform, packs it into a `.luma`, starts the game with it, and runs its
tests. This page shows how the commands fit together and what LumaLink needs on your machine.

## A mod's life in commands

Most mods go through the same steps. Here is the whole life of the "Hello" mod from
[Your first mod](start/first-mod.md):

```sh
lumalink new hello --id you.hello --name "Hello" --summary "Counts Mario's jumps." --author you
# write source/main.lum, add content...
lumalink check hello
lumalink build hello --names <names folder>
lumalink pack hello
lumalink run hello
lumalink test hello
lumalink verify --source hello you.hello-1.0.0.luma
```

| Step      | Command                        | What it does for you                                                                           |
| --------- | ------------------------------ | ---------------------------------------------------------------------------------------------- |
| Start     | [`new`](lumalink/new.md)       | Makes the mod folder with its `luma.json` and an empty base layer.                             |
| Add parts | [`add`](lumalink/add.md)       | Adds a character, model or other part (or a `needs` entry) by command.                         |
| Check     | [`check`](lumalink/check.md)   | Runs the game's own validator over the folder and lists every problem with its file and line.  |
| Build     | [`build`](lumalink/build.md)   | Compiles the mod's LumaScript and C to native code for every platform.                         |
| Pack      | [`pack`](lumalink/pack.md)     | Writes the folder as a `.luma`, but only once the validator passes it with every rule checked. |
| Try it    | [`run`](lumalink/run.md)       | Starts the game with the mod, and rebuilds and reloads it while the game runs as you edit.     |
| Test      | [`test`](lumalink/test.md)     | Runs the mod's tests: plain tests on your machine, game tests through the test harness.        |
| Release   | [`verify`](lumalink/verify.md) | Checks that a `.luma` is exactly what its folder packs to.                                     |

Three more commands help you look inside things, and one helps when something goes wrong:

| Command                          | What it does                                                                                            |
| -------------------------------- | ------------------------------------------------------------------------------------------------------- |
| [`list`](lumalink/list.md)       | Lists what is in a `.luma`, or a kind of thing (tables, models, messages, files) in your imported game. |
| [`explain`](lumalink/explain.md) | Says what a validator code such as `L203` means, in your language.                                      |
| [`extract`](lumalink/extract.md) | Writes files out of a `.luma`, or out of your imported game, so you can start from a copy.              |
| [`convert`](lumalink/convert.md) | Converts a published mod (Riivolution, texture pack, Gecko list...) to a `.luma`.                       |

For the everyday loop of editing, checking and trying a mod, see [Check, build, pack and run](start/workflow.md).

## The same validator as the game

`check` and `pack` use the very validator the game runs when a player imports a mod and at each start. What passes
one passes the other, with the same codes (`L100` to `L806`) and the same words. So a problem LumaLink reports is
exactly what a player would see, and you find it before you share the mod. Every code is listed in
[Error codes](reference/error-codes.md); `lumalink explain <code>` prints one.

Some checks need to know your game: which files and tables it has, which functions exist, which sound or particle
names are real. LumaLink gets that from the inputs below. A check whose input you did not give is reported as
**not checked**, by name, never skipped silently, and `pack` refuses until every rule has been checked.

## What LumaLink needs from you

Several commands share these inputs. You only need the ones a command lists.

| Option                  | Used by                            | What it is                                                                                                                                         |
| ----------------------- | ---------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------- |
| `--game <FILE>`         | `check`, `pack`, `list`, `extract` | Your imported game (Nebula's `game.pak`): its files, tables and keys. With it, content is cooked against the real game, as the game's start would. |
| `--names <FOLDER>`      | `check`, `build`, `pack`           | The game's function rows and types file (a kernel build's `luma` folder), for the rules on a mod's code.                                           |
| `--self <FILE>`         | `list`, `extract`                  | The game's self-description, for the names of table columns.                                                                                       |
| `--sdk <FOLDER>`        | `build`                            | The folder with the game's `luma.h`.                                                                                                               |
| `--clang <FILE>`        | `build`                            | The clang to build with.                                                                                                                           |
| `--platform <PLATFORM>` | `check`, `pack`                    | A platform to check the code for (repeat for several). Default: all nine.                                                                          |

The nine platforms a mod's code can be built for are `windows-x64`, `windows-arm64`, `linux-x64`, `linux-arm64`,
`macos-arm64`, `macos-x64`, `android-arm64`, `android-x64` and `ios-arm64`.

## The build environment

LumaLink compiles a mod's code with clang against the game's `luma.h`. Instead of passing the same folders on every
command, you can set them once in environment variables:

| Variable         | Used for                                                                   | Read when                                                                                                                                                                                            |
| ---------------- | -------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `LUMA_INCLUDE`   | The folder with the game's `luma.h`.                                       | `build` is run without `--sdk`.                                                                                                                                                                      |
| `LUMALINK_CLANG` | The clang to build with.                                                   | `build` is run without `--clang`. If it is not set, LumaLink looks in LLVM's own folder, then on the system's search path.                                                                           |
| `NEBULA_DXC`     | The shader compiler that `check` uses to compile a mod's shader materials. | `check` meets a shader material. If it is not set, LumaLink looks for `dxc/dxc.exe` beside its own folder or the game's. With no compiler found, each shader gets a Note saying it was not compiled. |

```sh
export LUMA_INCLUDE=/path/to/sdk/include
export LUMALINK_CLANG=/path/to/clang
lumalink build hello --names <names folder>
```

[Install the tools](start/install.md) walks through getting LumaLink, the compiler and the game's SDK and names
folder in place.

## Languages

LumaLink speaks the game's 14 languages. Every command takes `--language <LANGUAGE>`, which sets the language of
LumaLink's own messages and of the validator's findings. The default is `UsEnglish`. Name a language as the game
does:

| Prefix | Languages                                                                |
| ------ | ------------------------------------------------------------------------ |
| `Us`   | `UsEnglish`, `UsFrench`, `UsSpanish`, `UsPortuguese`                     |
| `Eu`   | `EuEnglish`, `EuFrench`, `EuSpanish`, `EuGerman`, `EuItalian`, `EuDutch` |
| Others | `JpJapanese`, `KrKorean`, `CnSimpChinese`, `TwTradChinese`               |

```sh
lumalink check hello --language EuGerman
```

The findings carry the same codes in every language, so `L203` in German is `L203` in Japanese.

## Getting help

Every command prints its own usage and options with `-h` or `--help`:

```sh
lumalink check --help
```

Each command page in this section reproduces that help text in full at the bottom.

## See also

- [Install the tools](start/install.md)
- [Your first mod](start/first-mod.md)
- [Check, build, pack and run](start/workflow.md)
- [Debugging](start/debugging.md)
- [Error codes](reference/error-codes.md)
- [How the validator works](reference/validator.md)
- [Writing tests](lumalink/testing.md)
