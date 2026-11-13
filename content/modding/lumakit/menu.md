---
title: 'LumaKit: menu'
nav_title: menu
description: Add your own entries to the game's pause menu, rename them, grey them out and remove them.
order: 13
level: essential
---

`kit.menu` adds entries to the game's pause menu. An entry has a label and a function that runs when the player chooses it; you can change its label, disable it and remove it. It is the usual way to open your mod's own screens: a replay viewer, a leaderboard, a co-op menu.

## Example

From the [ghost time trial](tutorials/ghost-time-trial.md) and [online leaderboard](tutorials/online-leaderboard.md) tutorials: an entry added when the mod starts, opening the mod's own screen.

```lumascript source/main.lum
use kit.menu
use kit.screen

on start {
    menu.add_pause_entry(text "Menu.Leaderboard", show_board)
}

fn show_board() {
    screen.list(screen.List { title: text "Board.Title", rows: [text "Board.Loading"] })
}
```

Keeping the entry to change it later:

```lumascript
var entry: menu.Entry? = none

on start { entry = menu.add_pause_entry(text "Balloon.Find", find) }

fn find() {
    entry?.enable(false)                     // greyed out until the hunt ends
}
```

## Using it

Add LumaKit to your mod's `needs` in `luma.json` and `use` the module:

```json
"needs": [ { "id": "lumakit", "version": "^1" } ]
```

```lumascript
use kit.menu
```

The module hooks the game's `PauseMenu` and draws entries with the [ui service](services/ui.md) and your text content. It needs no permission.

> [!PLANNED]
> Not every LumaKit call can be made from a mod yet. See [What works today](lumakit/overview.md#what-works-today).

## Interface

```lumascript
pub struct Entry { fn set_label(self, s: text); fn enable(self, on: bool); fn remove(self) }
pub fn add_pause_entry(label: text, on_choose: fn()) -> Entry
```

## Functions

| Name                                | Description                                                                                                                    |
| ----------------------------------- | ------------------------------------------------------------------------------------------------------------------------------ |
| `add_pause_entry(label, on_choose)` | Adds an entry labelled `label` to the pause menu. `on_choose` is called when the player chooses it. Returns an `Entry` handle. |

### Entry

| Name           | Description                                                                                                |
| -------------- | ---------------------------------------------------------------------------------------------------------- |
| `set_label(s)` | Changes the entry's label.                                                                                 |
| `enable(on)`   | Enables (`true`) or disables (`false`) the entry. A disabled entry stays in the menu but cannot be chosen. |
| `remove()`     | Takes the entry out of the menu. Safe to call more than once.                                              |

## Behaviour and edge cases

- **Order.** Entries are listed in the mod list's order, the top mod's first, and each mod's entries in the order it added them.
- **Labels.** Use your mod's text rows (`text "Menu.Leaderboard"`) so the label is in the player's language.
- **Settings are not menu entries.** Your mod's settings belong in its `luma.json` `options`, which the game shows on the Mods screen and your code reads with `option` and `on option` (see [Lifecycle, options and frames](lumascript/events.md)). Use pause entries for things the player does, not for settings.
- **Your mod switched off.** Its entries disappear from the pause menu.

## See also

- [screen](lumakit/screen.md): the screens an entry usually opens
- [ui.kit](lumakit/ui-kit.md): panels of widgets
- [Lifecycle, options and frames](lumascript/events.md): options
- [Tutorial: ghost time trial](tutorials/ghost-time-trial.md)
- [Tutorial: online leaderboard](tutorials/online-leaderboard.md)
