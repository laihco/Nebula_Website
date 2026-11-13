---
title: lumalink add
nav_title: lumalink add
description: Add a character, model or other part to a mod by command, instead of writing its files by hand.
order: 3
level: intermediate
---

`lumalink add` adds a part to a mod by command: a character, a model, or another part, written into the mod folder
in the form the game reads, so you don't have to lay out its files by hand.

## Usage

```text
lumalink add [OPTIONS] <ITEM> <FOLDER>
```

## Example

A mod that uses LumaKit must list it in `needs`. The [LumaKit overview](lumakit/overview.md) gives the command that
writes that entry:

```sh
lumalink add need lumakit
```

It adds `{ "id": "lumakit", "version": "^1" }` to the mod's `needs` in `luma.json`. If you write `use kit.<module>`
without that entry, the compiler stops, naming the `use` line and the `needs` entry to add.

The content a mod's code names, such as `model "GoldMario"` or `effect "GoldAura"`, is made by `lumalink add` from
your sources. In the [Gold Flower tutorial](tutorials/a-new-power-up.md), the gold Mario model is added as a
character, which binds it to Mario's skeleton:

```lumascript source/main.lum
pub let gold = form.define(form.Form {
    id: "gold"
    look: model "GoldMario"                  // bound to Mario's skeleton (LumaLink add character)
    aura: effect "GoldAura"
    ends_on_damage: true
    on_spin: throw_ball
})
```

After adding a part, check the folder so the validator can tell you about anything the part is missing:

```sh
lumalink check gold-flower
```

## Arguments

| Argument   | Description     |
| ---------- | --------------- |
| `<ITEM>`   | What to add.    |
| `<FOLDER>` | The mod folder. |

## Options

| Option                  | Default     | Description                                                                                                                        |
| ----------------------- | ----------- | ---------------------------------------------------------------------------------------------------------------------------------- |
| `-h, --help`            |             | Print this help.                                                                                                                   |
| `--language <LANGUAGE>` | `UsEnglish` | The language LumaLink and the validator speak: one of the game's 14, by its name in the game (UsEnglish, EuGerman, JpJapanese...). |

## Notes

- `add` writes into an existing mod folder; start one with [`lumalink new`](lumalink/new.md) first.
- What each kind of part becomes inside the mod (a model's file, an animation, an effect) is described on the
  [Content](content/overview.md) pages, for example [Models](content/models.md) and
  [Animation](content/animation.md).
- The command speaks one of the game's 14 languages (`--language`); its findings are the validator's, with the same
  codes the game shows.

## See also

- [Content overview](content/overview.md)
- [Models](content/models.md)
- [Animation](content/animation.md)
- [LumaKit overview](lumakit/overview.md)
- [lumalink new](lumalink/new.md)
- [lumalink check](lumalink/check.md)

## Full help text

```text
Add a character, model or other part to a mod by command.

Usage: lumalink add [OPTIONS] <ITEM> <FOLDER>

Arguments:
  <FOLDER>  The mod folder.
  <ITEM>    What to add.

Options:
  -h, --help                 Print this help.
      --language <LANGUAGE>  The language LumaLink and the validator speak: one of the game's 14, by its name in the game (UsEnglish, EuGerman, JpJapanese...). Default: UsEnglish.
```
