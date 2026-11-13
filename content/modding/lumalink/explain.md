---
title: lumalink explain
nav_title: lumalink explain
description: Say what a validator code such as L203 means, in any of the game's 14 languages.
order: 11
level: essential
---

`lumalink explain` tells you what a validator code means. When `check`, `pack` or the game's Mods screen gives you a
code such as `L203`, ask LumaLink about it.

## Usage

```text
lumalink explain [OPTIONS] <CODE>
```

## Example

```sh
lumalink explain L203
```

LumaLink says what `L203` means. In the validator's table it is an Error: `luma.json` is missing a key it must
have. Its words are `{mod}: luma.json line {line}: "{key}" is missing.`, where a real finding fills in the mod, the
line and the key.

The `L` is optional, and you can ask in another language:

```sh
lumalink explain 203 --language EuGerman
```

## Arguments

| Argument | Description            |
| -------- | ---------------------- |
| `<CODE>` | The code: L203 or 203. |

## Options

| Option                  | Default     | Description                                                                                                                        |
| ----------------------- | ----------- | ---------------------------------------------------------------------------------------------------------------------------------- |
| `-h, --help`            |             | Print this help.                                                                                                                   |
| `--language <LANGUAGE>` | `UsEnglish` | The language LumaLink and the validator speak: one of the game's 14, by its name in the game (UsEnglish, EuGerman, JpJapanese...). |

## Notes

- The codes are the validator's, the same in LumaLink and in the game, so you can explain a code a player reports
  from their Mods screen or mod log.
- Codes run from `L100` to `L806`, in groups: the container (`L1xx`), `luma.json` (`L2xx`), layers and files
  (`L3xx`), table patches (`L4xx`), code (`L5xx`), saves and module data (`L7xx`), and cook, loader and start
  (`L8xx`). Every code with its meaning and fix is in [Error codes](reference/error-codes.md).
- Each code is either an **Error** (the mod is refused or off) or a **Note** (shown, not refused).
- The command speaks one of the game's 14 languages (`--language`); its findings are the validator's, with the same
  codes the game shows.

## See also

- [Error codes](reference/error-codes.md)
- [Debugging](start/debugging.md)
- [lumalink check](lumalink/check.md)
- [How the validator works](reference/validator.md)

## Full help text

```text
Say what a validator code (L203, or 203) means, in a language.

Usage: lumalink explain [OPTIONS] <CODE>

Arguments:
  <CODE>  The code: L203 or 203.

Options:
  -h, --help                 Print this help.
      --language <LANGUAGE>  The language LumaLink and the validator speak: one of the game's 14, by its name in the game (UsEnglish, EuGerman, JpJapanese...). Default: UsEnglish.
```
