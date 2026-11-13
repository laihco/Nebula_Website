---
title: lumalink test
nav_title: lumalink test
description: Run a mod's tests - plain tests natively on your machine, game tests through the test harness.
order: 8
level: intermediate
---

`lumalink test` runs a mod's tests. Plain tests run on your own machine without the game, so they are fast; tests
that need the game run through the test harness, which starts the game, drives it and checks what happened.

## Usage

```text
lumalink test [OPTIONS] <FOLDER>
```

## Example

Write a test next to your code:

```lumascript source/main.lum
fn count_after_throws(throws: int) -> int {
    return min(throws, 2)
}

test "two balls at most" {
    expect count_after_throws(5) == 2
}
```

Then run the mod's tests:

```sh
lumalink test gold-flower
```

Each failing `expect` names its file, its line and both sides of the comparison, so you can see what the code gave
and what you expected.

## Arguments

| Argument   | Description     |
| ---------- | --------------- |
| `<FOLDER>` | The mod folder. |

## Options

| Option                  | Default     | Description                                                                                                                        |
| ----------------------- | ----------- | ---------------------------------------------------------------------------------------------------------------------------------- |
| `-h, --help`            |             | Print this help.                                                                                                                   |
| `--language <LANGUAGE>` | `UsEnglish` | The language LumaLink and the validator speak: one of the game's 14, by its name in the game (UsEnglish, EuGerman, JpJapanese...). |

## Notes

### Two kinds of test

| Kind       | Written as                 | Runs                                                         | Good for                                                                           |
| ---------- | -------------------------- | ------------------------------------------------------------ | ---------------------------------------------------------------------------------- |
| Plain test | `test "name" { ... }`      | Compiled natively for your machine and run without the game. | Your own logic: counting, timing, choosing, anything that does not touch the game. |
| Game test  | `test game "name" { ... }` | Through the test harness, with the game.                     | Hooks, objects, the player, the screen: anything that needs the game running.      |

- `expect <condition>` states what must hold.
- A plain test may not `wait`; a `test game` may (`wait` is a build error, `S0105`, in a plain test).
- A game test sees what your mod logs as facts: `log fact "key" value` in LumaScript writes a fact the harness can
  check. [Writing tests](lumalink/testing.md) shows how a game test is set up and what it can check.

### Before a game test

The harness does not build your mod. A mod's code must already be built for the platform the test runs on, so run
[`lumalink build`](lumalink/build.md) after changing your code.

### Results

Only `pass` proves anything. Every other verdict (`fail`, `setup-failed`, `crashed`, `timeout`, `harness-error`)
names what went wrong; see [Writing tests](lumalink/testing.md#results).

The command speaks one of the game's 14 languages (`--language`); its findings are the validator's, with the same
codes the game shows.

## See also

- [Writing tests](lumalink/testing.md)
- [Check, build, pack and run](start/workflow.md)
- [Functions, structs, enums and closures](lumascript/functions.md)
- [Tasks, states and wait](lumascript/tasks.md)
- [lumalink build](lumalink/build.md)

## Full help text

```text
Run a mod's tests.

Usage: lumalink test [OPTIONS] <FOLDER>

Arguments:
  <FOLDER>  The mod folder.

Options:
  -h, --help                 Print this help.
      --language <LANGUAGE>  The language LumaLink and the validator speak: one of the game's 14, by its name in the game (UsEnglish, EuGerman, JpJapanese...). Default: UsEnglish.
```
