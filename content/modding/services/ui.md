---
title: 'Service: ui'
nav_title: ui
description: Open layouts as screens, the game's and your own, change their text, play their animations and scale their panes.
order: 5
level: intermediate
---

The `ui` service puts **layouts** on screen: the game's own screens and the ones you make as content in your mod
(see [Content: screens and fonts](content/screens.md)). While a screen is open your mod can change its text, play its
animations and scale its panes.

`ui` needs no permission: it works with the game's layouts and your mod's own.

Most mods never call `ui` directly. LumaKit's [hud](lumakit/hud.md) (counters, timers, text and pictures in corners),
[screen](lumakit/screen.md) (messages, choices, lists, loading screens, your layout as a screen),
[menu](lumakit/menu.md) (pause menu entries) and [ui.kit](lumakit/ui-kit.md) (widgets) are built on it and handle
input, pausing and cleaning up for you. Reach for `ui` when you want your own layout and full control of it.

## Example: your layout as a screen

Your layout lives in your mod at `layers/base/files/LayoutData/Card.arc/Card.layout.json`. LumaKit's `screen` opens
it as a screen, and `ui.alive` tells you when it has gone:

```lumascript source/main.lum
use kit.screen
use svc.ui

var card: ui.Open? = none

fn show_card() {
    card = screen.layout(layout "Card", pauses: false)
}

on frame {
    if let c = card {
        if not ui.alive(c) {
            card = none
            log "the card was closed"
        }
    }
}
```

`layout "Card"` is checked when you build, like every content name: a layout your mod does not have is a build
error.

## Operations

| Name                       | What it does                                                                                     |
| -------------------------- | ------------------------------------------------------------------------------------------------ |
| `ui.open`                  | Opens a layout as a screen. For a layout named `<Name>`, the archive is `LayoutData/<Name>.arc`. |
| `ui.close`                 | Closes a screen your mod opened.                                                                 |
| `ui.set_text`              | Sets the words of a text pane. Text longer than the pane's `length` is cut there.                |
| `ui.play`                  | Plays one of the layout's animations (the game's own layout animations).                         |
| `ui.set_scale(pane, x, y)` | Scales a pane, and the panes under it, about the pane's origin.                                  |
| `ui.alive(screen) -> bool` | Whether a screen your mod opened is still open.                                                  |

### `ui.alive`

`true` while the screen is open. `false` once `close`, the end of its scene, or the end of your mod has ended it; to
show it again, open it again.

- A handle that was given to something else (a pane, another mod's screen) answers `false`.
- A handle this session never gave out is a mistake (`Service.Handle` in the mod log).

A screen ends with the scene it was opened in, so check `ui.alive` before you change a screen you opened on an
earlier frame.

### `ui.set_scale`

```lumascript
// `pane` is a pane of a screen your mod opened
ui.set_scale(pane, 1.5, 1.5)      // half as large again
ui.set_scale(pane, -1.0, 1.0)     // mirrored left to right
```

- 1 is the layout's own scale; a negative value mirrors.
- The scale applies to the pane and every pane under it, about the pane's origin.
- It lasts until you set it again, or until an animation that moves the pane's scale plays.
- A value that is not a finite number, or is past 64 either way, is a mistake: `Service.Argument` naming `x` or `y`,
  and nothing changes.

### Text in a pane

A text pane holds at most its `length` (in UTF-16 units, 1 to 255; 255 by default), set in the layout file.
`ui.set_text` cuts text longer than that. The pane's font is the one the layout names: one of the game's fonts or a
font your mod cooked (see [Content: screens and fonts](content/screens.md)).

## Edge cases

- **Your mod switched off.** Every screen it opened ends, as `ui.alive` then says; nothing of your mod stays on
  screen. LumaKit's modules also remove their elements and resume the game when a screen of theirs was pausing it.
- **Threads.** Call `ui` from the game thread.
- **Window panes** in the game's own layouts (frames with content) are drawn by the game's layout drawer.
- **Held world.** A screen inside the scene follows the world clock: when a mod holds the world, the scene's layouts
  are held with it (see [time](services/time.md#slow-motion-and-pause)).

> [!PLANNED]
> Not built yet:
>
> - focus and menu entries driven by [input](services/input.md) actions;
> - window panes with a 9-slice frame in your own layout files;
> - animations as named tracks in your own layout files (today `ui.play` plays the game's own layout animations);
> - changing one of the game's layouts by pane name, so two mods changing one HUD combine;
> - text by message key (today: the layout's literal text, or `ui.set_text`);
> - a check for text that overflows its pane.

## See also

- [Content: screens and fonts](content/screens.md)
- [LumaKit: hud](lumakit/hud.md)
- [LumaKit: screen](lumakit/screen.md)
- [LumaKit: menu](lumakit/menu.md)
- [LumaKit: ui.kit](lumakit/ui-kit.md)
- [draw](services/draw.md)
- [Services overview](services/overview.md)
