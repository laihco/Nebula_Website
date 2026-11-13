---
title: Check, build, pack and run
nav_title: Workflow
description: The everyday loop - check, build, pack, install and play - plus reloading code while the game runs and testing a mod.
order: 5
level: essential
---

This page covers the loop you'll repeat many times a day: change the mod, check it, build it, and see it in the game. It also covers the faster way, reloading your code while the game keeps running, and how to test a mod without playing it by hand.

## The loop

```sh
lumalink check --names <names> --game <game.pak> hello
lumalink build --names <names> hello
lumalink pack  --names <names> --game <game.pak> hello
```

Then install the `.luma` (drop it on the game's window, or copy it into the game's `mods` folder), switch it on on the Mods screen, and play.

| Step  | Command                               | What happens                                                                                       | When you need it                                                    |
| ----- | ------------------------------------- | -------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------- |
| Check | [`lumalink check`](lumalink/check.md) | Reads the mod folder (or a `.luma`) with the game's own validator and lists every problem          | After any change. It's fast, and it's the same check the game runs. |
| Build | [`lumalink build`](lumalink/build.md) | Compiles `source/` (LumaScript and C) to a native library for each platform, in `code/<platform>/` | After changing code                                                 |
| Pack  | [`lumalink pack`](lumalink/pack.md)   | Checks again with every rule, then writes `<id>-<version>.luma` beside the folder                  | To install or share the mod                                         |
| Run   | [`lumalink run`](lumalink/run.md)     | Starts the game with the mod and reloads its code when you save                                    | While you're working on code                                        |
| Test  | [`lumalink test`](lumalink/test.md)   | Runs the `test` blocks in your code                                                                | Before you share a version                                          |

## Check

`lumalink check` takes a mod folder or a `.luma` file and prints every finding, each with its code, file and line (and column for JSON and LumaScript). It never stops at the first problem. Fixing several at once is quicker than one per run.

```sh
lumalink check --names <names> --game <game.pak> hello
```

| Option                  | What it does                                                                                                                |
| ----------------------- | --------------------------------------------------------------------------------------------------------------------------- |
| `--names <FOLDER>`      | The game's names folder, for the rules on a mod's code: does each game function and service the code uses exist?            |
| `--game <FILE>`         | Your imported game, for the rules that compare with the game: does each game path exist, does each patch's key match a row? |
| `--platform <PLATFORM>` | Check the code for one platform (repeat for several). Default: all nine.                                                    |
| `--json`                | Print the report as JSON, for an editor or a script to read.                                                                |
| `--language <LANGUAGE>` | Print the findings in another of the game's 14 languages.                                                                   |

A finding is either an **Error** (the mod would be refused or switched off) or a **Note** (worth knowing, nothing lost). A check whose input you didn't give is listed as **not checked**, never skipped silently. See [Debugging](start/debugging.md) for how to read findings.

## Build

`lumalink build` compiles your LumaScript to C, then builds the C with clang into one library per platform:

```sh
lumalink build --names <names> hello
```

- **Every mistake is listed.** A compile error names the file, line and column, what was found and what was expected, with an `S` code. The build checks every name of the game you use against the names folder, so a misspelt function or a wrong argument type is caught here, not in the game.
- **Every platform at once.** Each platform in `code.platforms` gets its library under `code/<platform>/`.
- **Where clang and `luma.h` come from**: `--clang` (or `LUMALINK_CLANG`) and `--sdk` (or `LUMA_INCLUDE`). See [Install the tools](start/install.md).
- **Seeing the C.** `--work <FOLDER>` keeps the generated C in that folder. The C carries `#line` markers, so a debugger, a crash report or a profiler shows your `file.lum:line`.

A mod with no code (only content) needs no build.

## Pack

`lumalink pack` runs the validator with every rule and, only if nothing is refused, writes the `.luma`:

```sh
lumalink pack --names <names> --game <game.pak> hello
```

By default the file is `<id>-<version>.luma` beside the mod folder. Pass `-o <FILE>` to write it elsewhere. `pack` refuses while any rule is reported as not checked, so give it `--names` for a mod with code and `--game` for a mod with content.

## Install and play

Drop the `.luma` on the game's window, or copy it into the game's `mods` folder, then switch it on on the Mods screen. When it's installed, the game:

1. checks the whole `.luma` with every rule (the same validator as LumaLink) and keeps the report;
2. asks the player to allow the mod's code and any permissions it declares (see [Permissions](start/permissions.md));
3. at each start, checks what depends on this game, platform, options and other mods, then **cooks** the mod's content for this device, then loads its code.

A mod is either fully on (content cooked, code loaded) or off with its reasons on the Mods page and in the mod log. There is no half-on state. Content changes take effect at the next start of the game.

The order of mods on the Mods screen matters. When two mods change the same thing, the mod **higher in the list** wins, and hooks run in the player's load order.

## Reload while the game runs

`lumalink run` is the fastest way to work on code:

```sh
lumalink run hello
```

It builds the mod, installs it into the game's `mods` folder, and starts the game in a development mode for that mod. Then it watches the mod's source folder. About 300 ms after you stop saving, it rebuilds with the same check as `pack` and asks the running game to reload the mod's code. LumaLink's window shows how each reload ended. A build that fails installs nothing and shows its errors, so the game keeps the last good version.

A reload, at the start of a frame:

1. takes the mod out. Its `on stop` runs, its hooks are removed, and everything it held is freed. Mods that use it are taken out first.
2. checks the new build as a start does. If the check fails, the mod stays off with the reason on its page and in the mod log.
3. asks for any permission the new build declares that it didn't before. The answer for its code carries over, because you built it.
4. loads the new code. Its `on start` runs, and mods that use it are loaded again.

A reload is a fresh start for your code. Module variables begin again from their initial values, and services forget timers and requests. Only what you explicitly **keep** survives:

```lumascript source/main.lum
var jumps: int = 0

on stop {
    keep(jumps)                    // handed to the next load of this mod, this session
}

on start {
    if let n = kept<int>() {       // none on a normal start, or when nothing was kept
        jumps = n
    }
}
```

`keep(value)` may be used only in `on stop` and `kept<T>()` only in `on start`. The value must be JSON data and at most 1 MiB encoded. The last `keep` wins. If the type changed between builds, `kept` gives `none` and says so in the mod log.

> [!NOTE]
> Only code is reloaded. LumaLink still builds content changes (layers, models, effects), but they show the next time the game starts.

## Test

Tests live in your LumaScript, next to the code they test:

```lumascript source/main.lum
test "two balls at most" {
    expect count_after_throws(5) == 2
}
```

```sh
lumalink test hello
```

`lumalink test` compiles the mod's tests natively for your computer and runs them without the game. That suits code that doesn't touch the game: maths, parsing, rules. Tests written as `test game "..." { }` run in the game itself, through the test harness. A failing `expect` names the file and line and both sides. See [Writing tests](lumalink/testing.md).

## Looking inside the game and other mods

While you work, you'll often want to know what the game has and what a `.luma` holds:

```sh
lumalink list --game <game.pak> models            # every model in the game
lumalink list --game <game.pak> tables Kuribo     # tables whose path or column holds "Kuribo"
lumalink list you.hello-1.0.0.luma                # what's in a .luma
lumalink extract --game <game.pak> -o out ObjectData/Kuribo.arc
```

`list` with `--game` lists `tables`, `models`, `messages` or `files`, with an optional filter. `extract` writes files out of a `.luma`, or out of your imported game in the form a mod uses (tables as rows, particles as JSON...). See [`lumalink list`](lumalink/list.md) and [`lumalink extract`](lumalink/extract.md).

## See also

- [Debugging](start/debugging.md)
- [LumaLink overview](lumalink/overview.md)
- [Reloading in depth](reference/reload.md)
- [How the game loads a mod](reference/loading.md)
- [Writing tests](lumalink/testing.md)
