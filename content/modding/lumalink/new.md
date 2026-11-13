---
title: lumalink new
nav_title: lumalink new
description: Start a mod - a new folder with its luma.json and an empty base layer.
order: 2
level: essential
---

`lumalink new` starts a mod: it makes a folder holding the mod's `luma.json` and an empty base layer, ready for you
to add code and content.

## Usage

```text
lumalink new --id <ID> --name <NAME> --summary <TEXT> --author <AUTHOR>... [OPTIONS] <FOLDER>
```

## Example

Start the "Hello" mod from [Your first mod](start/first-mod.md):

```sh
lumalink new hello --id you.hello --name "Hello" --summary "Counts Mario's jumps." --author you
```

This makes the folder `hello` with its `luma.json` (id, name, summary and authors filled in from the options) and
an empty base layer, `layers/base/`. Next, add your code as `source/main.lum` and check the folder:

```sh
lumalink check hello
```

A mod with several authors repeats `--author`:

```sh
lumalink new gold-flower --id you.gold-flower --name "Gold Flower" --summary "A flower that lets Mario throw gold balls." --author you --author friend
```

## Arguments

| Argument   | Description                            |
| ---------- | -------------------------------------- |
| `<FOLDER>` | The folder to make; it must not exist. |

## Options

| Option                  | Default     | Description                                                                                                                        |
| ----------------------- | ----------- | ---------------------------------------------------------------------------------------------------------------------------------- |
| `--id <ID>`             | required    | The mod's id: 3 to 64 of a-z, 0-9, '-' and '.', starting with a letter.                                                            |
| `--name <NAME>`         | required    | The mod's name, as players see it.                                                                                                 |
| `--summary <TEXT>`      | required    | One line on what the mod does.                                                                                                     |
| `--author <AUTHOR>`     | required    | Who made it (repeat for several).                                                                                                  |
| `-h, --help`            |             | Print this help.                                                                                                                   |
| `--language <LANGUAGE>` | `UsEnglish` | The language LumaLink and the validator speak: one of the game's 14, by its name in the game (UsEnglish, EuGerman, JpJapanese...). |

## Notes

- **The id is the mod's identity.** Needs, conflicts, save data and the mod's folders are all keyed by it, so pick
  it once and keep it. Besides the rules in the table, an id may not contain `..`, and its part before the first `.`
  may not be a name Windows keeps (`con`, `prn`, `aux`, `nul`, `com1` to `com9`, `lpt1` to `lpt9`); the validator
  refuses such an id with `L206`. A dotted form such as `you.hello` keeps your mods apart from other people's.
- **Name and summary are what players see** on the Mods screen. In `luma.json` the name may be 1 to 64 characters
  and the summary 1 to 200, each on one line. You can add translations later under `text` in `luma.json`.
- **Authors:** `luma.json` holds 1 to 16 of them.
- The folder must not exist yet, so `new` never writes over your work.
- The rest of `luma.json` (version, regions, options, permissions, layers...) is yours to edit afterwards; see
  [luma.json](reference/luma-json.md) for every field and [Anatomy of a mod](start/mod-anatomy.md) for the folder
  layout.
- Like every command, `new` speaks one of the game's 14 languages (`--language`); its findings are the validator's,
  with the same codes the game shows.

## See also

- [Your first mod](start/first-mod.md)
- [Anatomy of a mod](start/mod-anatomy.md)
- [luma.json](reference/luma-json.md)
- [lumalink add](lumalink/add.md)
- [lumalink check](lumalink/check.md)

## Full help text

```text
Start a mod: a folder with its luma.json and an empty base layer.

Usage: lumalink new --id <ID> --name <NAME> --summary <TEXT> --author <AUTHOR>... [OPTIONS] <FOLDER>

Arguments:
  <FOLDER>  The folder to make; it must not exist.

Options:
      --id <ID>              The mod's id: 3 to 64 of a-z, 0-9, '-' and '.', starting with a letter.
      --name <NAME>          The mod's name, as players see it.
      --summary <TEXT>       One line on what the mod does.
      --author <AUTHOR>      Who made it (repeat for several).
  -h, --help                 Print this help.
      --language <LANGUAGE>  The language LumaLink and the validator speak: one of the game's 14, by its name in the game (UsEnglish, EuGerman, JpJapanese...). Default: UsEnglish.
```
