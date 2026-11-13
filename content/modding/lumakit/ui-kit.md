---
title: 'LumaKit: ui.kit'
nav_title: ui.kit
description: Widgets for your mod's own panels - buttons, sliders, toggles, colour pickers, lists, text fields, an item wheel, a model view, pictures and labels - with pad, mouse and touch focus.
order: 21
level: intermediate
---

`kit.ui.kit` builds panels for your mod out of ready-made widgets: buttons, sliders, toggles, colour pickers, lists, text fields, a wheel of pictures (an item wheel), a 3D model view, pictures and labels. A panel can sit in a corner of the screen or in the middle, can pause the game while it is open, and works with a pad, a mouse or touch. The module also places on-screen touch buttons on platforms with a touch screen.

## Example

A small settings panel opened from the pause menu, built from the module's documented calls:

```lumascript source/main.lum
use kit.ui.kit as ui_kit
use kit.menu

var speed: f32 = 1.0
var trail = true
var panel: ui_kit.Open? = none

on start { menu.add_pause_entry(text "Menu.Panel", open_panel) }

fn open_panel() {
    panel = ui_kit.open(ui_kit.Panel {
        title: text "Panel.Title"
        pauses: true
        widgets: [
            ui_kit.Widget.Slider(label: text "Panel.Speed", min: 0.5, max: 2.0, value: speed,
                                 on_change: fn(v: f32) { speed = v }),
            ui_kit.Widget.Toggle(label: text "Panel.Trail", on: trail, on_change: fn(on: bool) { trail = on }),
            ui_kit.Widget.Button(label: text "Panel.Close", on_press: fn() { panel?.close() })
        ]
    })
}
```

An item wheel from the [item](lumakit/item.md) inventory, with one picture per item:

```lumascript
fn open_wheel(entries: list<(draw.Texture, text)>) {
    ui_kit.open(ui_kit.Panel {
        widgets: [ui_kit.Widget.Wheel(entries: entries, on_choose: fn(i: int) { log "chose {i}" })]
    })
}
```

## Using it

Add LumaKit to your mod's `needs` in `luma.json` and `use` the module. The last part of its name is `kit`, so give it a name of its own:

```json
"needs": [ { "id": "lumakit", "version": "^1" } ]
```

```lumascript
use kit.ui.kit as ui_kit
```

The module draws with the [draw](services/draw.md) and [ui](services/ui.md) services and reads focus, text entry and touch through the [input service](services/input.md); `ModelView` renders with a draw view. It needs no permission.

> [!PLANNED]
> Not every LumaKit call can be made from a mod yet. See [What works today](lumakit/overview.md#what-works-today). A `TextField` uses the platform's keyboard, which the input service does not offer yet.

## Interface

```lumascript
pub enum Widget { Button(label: text, on_press: fn()), Slider(label: text, min: f32, max: f32, value: f32, on_change: fn(f32)),
                  Toggle(label: text, on: bool, on_change: fn(bool)), Colour(label: text, value: color, on_change: fn(color)),
                  List(rows: list<text>, on_choose: fn(int)), TextField(label: text, max_chars: u32, on_done: fn(text)),
                  Wheel(entries: list<(draw.Texture, text)>, on_choose: fn(int)), ModelView(look: model, size: vec2),
                  Picture(tex: draw.Texture, size: vec2), Label(s: text) }
pub struct Panel { title: text? = none, widgets: list<Widget>, at: hud.Corner? = none, pauses: bool = false }
pub struct Open { fn set(self, index: int, w: Widget); fn close(self); fn alive(self) -> bool }
pub fn open(p: Panel) -> Open
pub fn touch_layout(buttons: list<(input.Action, vec2, f32)>)   // on-screen buttons where the platform has touch
```

## Functions

| Name                    | Description                                                                                                                       |
| ----------------------- | --------------------------------------------------------------------------------------------------------------------------------- |
| `open(p)`               | Opens the panel `p` and returns an `Open` handle.                                                                                 |
| `touch_layout(buttons)` | On platforms with a touch screen, shows on-screen buttons: for each, the action it presses, its place on the screen and its size. |

### Open

| Name            | Description                                                                        |
| --------------- | ---------------------------------------------------------------------------------- |
| `set(index, w)` | Replaces the widget at `index` (0 for the first) with `w` while the panel is open. |
| `close()`       | Closes the panel. Safe to call more than once.                                     |
| `alive()`       | `true` while the panel is open.                                                    |

## Types

### Panel

| Field     | Description                                                        |
| --------- | ------------------------------------------------------------------ |
| `title`   | A title, or `none`.                                                |
| `widgets` | The widgets, top to bottom.                                        |
| `at`      | A [`hud.Corner`](lumakit/hud.md) to place the panel in, or `none`. |
| `pauses`  | Pauses the game while the panel is open. Default `false`.          |

### Widget

| Case                                        | Description                                                                                       |
| ------------------------------------------- | ------------------------------------------------------------------------------------------------- |
| `Button(label, on_press)`                   | A button; `on_press` runs when it is pressed.                                                     |
| `Slider(label, min, max, value, on_change)` | A slider from `min` to `max`, starting at `value`; `on_change` gets each new value.               |
| `Toggle(label, on, on_change)`              | An on/off switch starting at `on`.                                                                |
| `Colour(label, value, on_change)`           | A colour picker starting at `value`.                                                              |
| `List(rows, on_choose)`                     | A list of rows; `on_choose` gets the chosen row's index.                                          |
| `TextField(label, max_chars, on_done)`      | A text field of up to `max_chars` characters; `on_done` gets the text.                            |
| `Wheel(entries, on_choose)`                 | A wheel of pictures with names, such as an item wheel; `on_choose` gets the chosen entry's index. |
| `ModelView(look, size)`                     | A 3D view of the model `look`, `size` big.                                                        |
| `Picture(tex, size)`                        | A picture.                                                                                        |
| `Label(s)`                                  | A line of text.                                                                                   |

## Behaviour and edge cases

- **Pad, mouse and touch.** Every widget can be used with each; focus moves between widgets with the pad.
- **Callbacks** run on the game thread, only while your mod is on.
- **Text.** Use your mod's text rows for labels, so the panel is translated.
- **Your mod switched off.** Its panels close, and touch buttons it laid out are removed.

## See also

- [screen](lumakit/screen.md): simpler whole screens
- [hud](lumakit/hud.md): `Corner`
- [menu](lumakit/menu.md): opening a panel from the pause menu
- [item](lumakit/item.md): the inventory for a wheel
- [UI service](services/ui.md) and [Draw service](services/draw.md)
