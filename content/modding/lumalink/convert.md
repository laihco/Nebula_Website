---
title: lumalink convert
nav_title: lumalink convert
description: Convert a published mod - a Riivolution mod, a texture pack, a Gecko list - to a .luma.
order: 13
level: intermediate
---

`lumalink convert` turns a mod published in an older form (a Riivolution mod, a texture pack, a Gecko code list...)
into a `.luma`, so it installs and is checked like any other mod.

## Usage

```text
lumalink convert [OPTIONS] <PATH>
```

## Example

Convert a texture pack folder:

```sh
lumalink convert my-texture-pack
```

Convert a mod published as a single file, such as a Gecko code list:

```sh
lumalink convert <file>
```

Then check the result as you would any mod:

```sh
lumalink check <the converted .luma>
```

## Arguments

| Argument | Description                            |
| -------- | -------------------------------------- |
| `<PATH>` | The published mod: a folder or a file. |

## Options

| Option                  | Default     | Description                                                                                                                        |
| ----------------------- | ----------- | ---------------------------------------------------------------------------------------------------------------------------------- |
| `-h, --help`            |             | Print this help.                                                                                                                   |
| `--language <LANGUAGE>` | `UsEnglish` | The language LumaLink and the validator speak: one of the game's 14, by its name in the game (UsEnglish, EuGerman, JpJapanese...). |

## Notes

- **Files with rows become patches.** A `.luma` never replaces a file that has rows (tables, stage placement,
  scenario data, message files); it changes rows by key. A Wii mod often ships the whole file, so `convert` makes
  the patches by comparing that file with the player's game. See [Table patches](content/table-patches.md).
- **Texture packs** go into a layer's `textures/` folder, the game's by-name texture replacement. It holds `.png` or
  `.dds` files named `<model>/<texture>`, or Dolphin's `tex1_...` names.
- **Today's `luma.json`.** `convert` writes `luma.json` in its current form, so the result passes the validator like
  a mod you made with [`lumalink new`](lumalink/new.md).
- The command speaks one of the game's 14 languages (`--language`); its findings are the validator's, with the same
  codes the game shows.

## See also

- [The .luma file format](reference/luma-format.md)
- [Table patches](content/table-patches.md)
- [luma.json](reference/luma-json.md)
- [lumalink check](lumalink/check.md)

## Full help text

```text
Convert a published mod (Riivolution, texture pack, Gecko list...) to a .luma.

Usage: lumalink convert [OPTIONS] <PATH>

Arguments:
  <PATH>  The published mod: a folder or a file.

Options:
  -h, --help                 Print this help.
      --language <LANGUAGE>  The language LumaLink and the validator speak: one of the game's 14, by its name in the game (UsEnglish, EuGerman, JpJapanese...). Default: UsEnglish.
```
