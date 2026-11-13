---
title: 'LumaKit: screen'
nav_title: screen
description: Whole screens for your mod - a message, a choice, a list you can update while it is open, a loading screen, and your own layout shown as a screen.
order: 12
level: essential
---

`kit.screen` shows whole screens: a message the player closes, a choice among rows, a list whose rows you can change while it is open, a loading screen with tips, and a layout of your own shown as a screen. Screens work with a pad, a keyboard or touch, and pause the game while they are up unless you say otherwise.

## Example

From the [online leaderboard tutorial](tutorials/online-leaderboard.md): a list that says "loading" while the mod fetches the scores, and is filled in when they arrive.

```lumascript source/main.lum
use kit.screen

struct Entry { name: text, frames: u32 }

var board: screen.ListScreen? = none

fn show_board() {
    board = screen.list(screen.List { title: text "Board.Title", rows: [text "Board.Loading"] })
    // ... ask the server for the scores here
}

fn scores_arrived(top: list<Entry>) {
    board?.set_rows(top.indexed().map(fn(p: (int, Entry)) -> text {
        return "{p.0 + 1}. {p.1.name}"
    }))
}

fn server_failed() { board?.set_rows([text "Board.Unreachable"]) }
```

A choice, waited on, from [Balloon World](tutorials/balloon-world.md):

```lumascript
task pick(hints: list<text>) {
    let choice = wait screen.choose(text "Balloon.Pick", hints)
    guard let i = choice else { return }     // none: the player backed out
    log "picked {hints[i]}"
}
```

A list whose rows are acted on when chosen, closing when one is picked:

```lumascript
fn open_menu() {
    screen.list(screen.List {
        title: text "Coop.Title"
        rows: [text "Coop.Host", text "Coop.Join", text "Coop.Back"]
        on_choose: fn(i: int) { match i { 0 => host(), 1 => join() else => {} } }
        closes: true
    })
}

fn host() { log "hosting" }
fn join() { log "joining" }
```

## Using it

Add LumaKit to your mod's `needs` in `luma.json` and `use` the module:

```json
"needs": [ { "id": "lumakit", "version": "^1" } ]
```

```lumascript
use kit.screen
```

The module uses the [ui](services/ui.md), [draw](services/draw.md), [input](services/input.md) and [time](services/time.md) services (time to hold the game while a screen pauses it), with layout and text content. It needs no permission.

> [!PLANNED]
> Not every LumaKit call can be made from a mod yet. See [What works today](lumakit/overview.md#what-works-today).

## Interface

```lumascript
pub fn message(line: text) -> pending                  // closes with A or B
pub fn choose(title: text, rows: list<text>) -> pending<int?>  // none: the player backed out
pub struct List { title: text, rows: list<text>, on_choose: fn(int)? = none, closes: bool = false }
pub struct ListScreen { fn set_rows(self, rows: list<text>); fn close(self); fn alive(self) -> bool }
pub fn list(l: List) -> ListScreen
pub fn layout(l: layout, pauses: bool = true) -> ui.Open   // your layout as a screen
pub fn loading(tips: list<text>, picture: draw.Texture? = none)   // shown while stages load
```

## Functions

| Name                     | Description                                                                                                                                            |
| ------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `message(line)`          | Shows a message until the player closes it with A or B. `wait` on it to continue when it closes.                                                       |
| `choose(title, rows)`    | Shows `rows` under `title` and lets the player pick one. `wait` gives the index of the chosen row, or `none` if the player backed out.                 |
| `list(l)`                | Opens a list screen and returns a `ListScreen` handle, so you can change its rows while it is open.                                                    |
| `layout(l, pauses)`      | Shows one of your mod's layouts as a screen, pausing the game unless `pauses` is `false`. Returns the [ui service](services/ui.md)'s `ui.Open` handle. |
| `loading(tips, picture)` | Sets the loading screen shown while stages load: tips to show and an optional picture.                                                                 |

### ListScreen

| Name             | Description                                     |
| ---------------- | ----------------------------------------------- |
| `set_rows(rows)` | Replaces the rows while the screen is open.     |
| `close()`        | Closes the screen. Safe to call more than once. |
| `alive()`        | `true` while the screen is open.                |

## Types

### List

| Field       | Description                                                                        |
| ----------- | ---------------------------------------------------------------------------------- |
| `title`     | The screen's title.                                                                |
| `rows`      | The rows to show.                                                                  |
| `on_choose` | Called with the chosen row's index (0 for the first). `none`: rows are only shown. |
| `closes`    | Closes the screen when a row is chosen. Default `false`: it stays open.            |

## Behaviour and edge cases

- **Waiting.** `message` and `choose` return a `pending` result, which you read with `wait` in a task, a state or an event handler (see [Tasks, states and wait](lumascript/tasks.md)). A `pending` result you never `wait` on is a compiler warning.
- **When `on_choose` runs.** On the game thread at the start of a frame; with `closes: true`, after the screen has closed.
- **Pad, keyboard and touch.** Every screen can be answered and backed out of with each.
- **Text.** Pass your mod's text rows (`text "Board.Title"`) so the screen is in the player's language.
- **Your mod switched off.** A screen your mod opened is closed, and if it paused the game, the game goes on.

## See also

- [hud](lumakit/hud.md): elements in the corners instead of a whole screen
- [menu](lumakit/menu.md): opening a screen from the pause menu
- [ui.kit](lumakit/ui-kit.md): panels with sliders, toggles and text fields
- [UI service](services/ui.md)
- [Screens and fonts](content/screens.md)
- [Tasks, states and wait](lumascript/tasks.md)
