---
title: 'Service: system'
nav_title: system
description: Facts about the machine and the game, the game window's size and safe area, the clipboard, and opening a web page in the player's browser.
order: 6
level: intermediate
---

The `system` services tell your mod about the machine it runs on and let it reach two things outside the game:

- **`system`**: facts about the platform, the game and the player's language, and the game window's display (size,
  scale, safe area). No permission.
- **`system.clipboard`**: reading and writing the clipboard, text and pictures. Permission `system.clipboard`.
- **`system.links`**: opening a web page in the player's browser. Permission `system.links`.

Each is its own service, so a mod that only needs facts never asks the player for anything.

## Example

```lumascript source/main.lum
use svc.system

on start {
    let f = system.facts()
    log "Nebula {f.game_version} on {f.os}, playing in {f.language} ({f.game_id})"
    if f.platform == system.Platform.Windows {
        log "a Windows build"
    }

    let d = system.display()
    log "window {d.width} x {d.height}, safe area insets {d.safe_left} {d.safe_top} {d.safe_right} {d.safe_bottom}"
}
```

## Facts

`system.facts() -> system.Facts` gives what does not change during a session. You may call it from any thread.

| Field                              | Meaning                                                                                                        |
| ---------------------------------- | -------------------------------------------------------------------------------------------------------------- |
| `platform`                         | `system.Platform`: `Windows`, `Linux` (SteamOS included), `Android`, `Macos`, `Ios`                            |
| `arch`                             | `system.Arch`: `X64`, `Arm64`                                                                                  |
| `renderer`                         | `system.Renderer` the game draws with this session: `D3d12`, `Vulkan`, `Metal`                                 |
| `region`                           | `system.Region` of the game disc: `Us` (RMGE01), `Eu` (RMGP01), `Jp` (RMGJ01)                                  |
| `game_id`                          | The disc's id, such as `"RMGE01"`                                                                              |
| `language`                         | The language the game plays in, by the game's folder name: `"UsEnglish"`, `"JpJapanese"`... Fixed at boot.     |
| `game_version`                     | Nebula's version, such as `"2.0.0"`                                                                            |
| `lumacore_major`, `lumacore_minor` | The mod loader's version: 1 and 0                                                                              |
| `locale`                           | The player's system locale in BCP 47 form: `"en-US"`, `"pt-BR"`, `"zh-Hant-TW"`; `"und"` when unknown          |
| `os`                               | The system's name and version for people, such as `"Windows 11 (26200)"`; `""` when unknown                    |
| `gpu`                              | The graphics device, such as `"NVIDIA GeForce RTX 4070"`; `""` until the renderer has started, or when unknown |
| `clipboard_images`                 | 1 when this platform's clipboard carries pictures; 0 when it does not                                          |

`language` is what the game shows; `locale` is what the player's system is set to. Use `language` to match the
game's text, and `locale` for things like date formats.

## The display

`system.display() -> system.Display` gives the game window's display now. Sizes are the window's drawable pixels,
the pixels the game renders into. Call it on the game thread.

| Field                                                | Meaning                                                                                                                                              |
| ---------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------- |
| `changes`                                            | Grows by 1 each time any field below changes (1 at the first snapshot). Compare it with the last value you saw to know when to lay things out again. |
| `width`, `height`                                    | The window's drawable size                                                                                                                           |
| `display_width`, `display_height`                    | The display the window is on, in pixels, at its current mode                                                                                         |
| `scale`                                              | Content scale in thousandths: 1000 is 96 dpi on Windows, 1x on Apple and Android                                                                     |
| `refresh_mhz`                                        | The display's refresh rate in thousandths of a hertz; 0 when unknown                                                                                 |
| `safe_left`, `safe_top`, `safe_right`, `safe_bottom` | Insets of the safe area (notches, rounded corners, system bars) from each edge of the window, in its pixels; 0 where there are none                  |
| `fullscreen`                                         | 1 when the window fills its display                                                                                                                  |
| `focused`                                            | 1 when the game window is in front                                                                                                                   |

Reading the display costs no system call: the game keeps a copy that the window's own events update.

```lumascript
use svc.system

var seen = 0

on frame {
    let d = system.display()
    if d.changes != seen {
        seen = d.changes
        log "the window is now {d.width} x {d.height}"
    }
}
```

## The clipboard

`use svc.system.clipboard` needs the permission `system.clipboard`. The player reads: "Reads what you copy, text and
pictures, and can replace it."

```json luma.json
"permissions": [
  { "name": "system.clipboard", "why": "Pastes a level code you copied from the website." }
]
```

```lumascript source/main.lum
use svc.system.clipboard

task paste_code() {
    guard let code = wait system.clipboard.get_text() else {
        log "nothing to paste"
        return
    }
    log "pasted {code}"
}
```

Every clipboard call is a request: it never holds up the game, and the answer arrives at a later frame's start.
`wait` it in a task; the result is `none` when the clipboard could not give or take it.

| Operation                            | What it does                                                                                                                 |
| ------------------------------------ | ---------------------------------------------------------------------------------------------------------------------------- |
| `system.clipboard.get_text()`        | Asks for the clipboard's text.                                                                                               |
| `system.clipboard.get_image()`       | Asks for the clipboard's picture, with its width and height.                                                                 |
| `system.clipboard.set_text(t: text)` | Puts text on the clipboard.                                                                                                  |
| `system.clipboard.set_image(...)`    | Puts a picture of width x height RGBA pixels on the clipboard.                                                               |
| `system.clipboard.cancel(request)`   | Ends a request: nothing more arrives for it. A text or picture already handed to the system may still land on the clipboard. |

Why a request can come back empty:

| Answer     | When                                                                                |
| ---------- | ----------------------------------------------------------------------------------- |
| `NotFound` | There is no text, or no picture, on the clipboard.                                  |
| `TooLarge` | More than 16 MiB of text, or a picture over 8192 pixels a side or 64 MiB of pixels. |
| `Busy`     | The game window was not in front.                                                   |
| `Io`       | The system refused, for example another program held the clipboard for 250 ms.      |
| `Format`   | A picture the game cannot decode.                                                   |
| `Absent`   | Pictures on a platform whose clipboard carries none (`clipboard_images` 0).         |

Rules and limits:

- **Only while the player is looking.** The clipboard is read only while the game window is in front; otherwise the
  answer is `Busy`. The rule is the same on every platform.
- **Text** is UTF-8 with no NUL inside, at most 16 MiB either way. Line ends are kept as the clipboard holds them.
  Setting text that is not valid UTF-8 or holds a NUL is a mistake; a literal text holding U+0000 is a build error.
- **Pictures** are RGBA, 8 bits a channel, straight alpha, rows top to bottom, tightly packed: at most 8192 pixels a
  side and 64 MiB of pixels. The game writes PNG to the clipboard (on Windows also a DIB), and reads PNG, or the
  platform's other forms (DIB on Windows; BMP, JPEG or TIFF elsewhere).
- **Open requests:** at most 4 at once per mod. A 5th is a mistake (`Service.Limit`).
- **The player is told.** Each read that gives your mod text or a picture adds the Note `System.ClipboardRead` to the
  mod log ("{mod} read your clipboard."). Repeats are counted on one line.

## Opening a web page

`use svc.system.links` needs the permission `system.links`. The player reads: "Opens web pages in your browser."

```lumascript source/main.lum
use svc.system.links

task open_guide() {
    wait system.links.open("https://example.org/guide")
}
```

`system.links.open(url)` opens the page in the system's browser. It is a request; the answer says whether the
system took the link.

A link must be:

- `https://` or `http://`;
- at most 2048 bytes, with no space or control character;
- without a user part (an `@` before the host);
- with an ASCII host. An internationalised name must be written in its `xn--` form.

Anything else is a mistake reported in the mod log. A literal URL that breaks these rules is a build error.

When it opens:

- only while the game window is in front;
- at most one link per mod every 10 seconds, and only one open request at a time. Otherwise the answer is `Busy`.

**The player always sees it.** When the system takes the link, the mod log gets the Note `System.LinkOpened`,
"{mod} opened a page on {site} in your browser.", shown as a notice. `{site}` is the link's host in lower case,
without port or path, so the player sees where the page really is. Each site is its own entry; the same site again
is a counted repeat. The whole URL goes only to the game's own log file, `nebula.log`.

## Edge cases

- **Your mod switched off.** Its clipboard and link requests are closed and give no event. A link the system already
  took still opens, and its Note is still written.
- **A request ends after its answer** whether or not your mod used what it gave.
- **iOS** does not report the display yet: `system.display()` gives zeros and `changes` 0 there, and the window
  counts as in front, so clipboard and link requests are not refused as `Busy`.
- **Linux without clipboard pictures.** A Linux session whose clipboard offers no picture formats has
  `clipboard_images` 0.
- **Deterministic test runs.** In the test harness's deterministic mode the machine's clipboard and browser are never
  touched: the clipboard is a private one, empty at the start, and a link is "opened" by writing its Note only. The
  window counts as in front, `os` and `gpu` are empty and `locale` is `en-US`, so runs compare. See
  [Writing tests](lumalink/testing.md).
- **Cost.** Nothing runs until a mod calls. The clipboard's worker starts at the first clipboard or link call.

## Messages in the mod log

| Code | Row                    | Text                                                                         |
| ---- | ---------------------- | ---------------------------------------------------------------------------- |
| 140  | `System.LinkOpened`    | `{mod} opened a page on {site} in your browser.` (a Note, shown as a notice) |
| 141  | `System.ClipboardRead` | `{mod} read your clipboard.` (a Note, in the log only)                       |

Mistakes use the shared rows of [the overview](services/overview.md#messages-in-the-mod-log): `Service.Argument`
(`url`, `text`, `width`, `height`, `size`...), `Service.Limit` (4 requests, 1 link), `Service.Handle` and
`Service.StructSize`.

## From C

The header is `luma_system.h`; it holds three tables, each imported on its own:
`LUMA_SERVICE(slot, "system", "1.0")`, `LUMA_SERVICE(slot, "system.clipboard", "1.0")` and
`LUMA_SERVICE(slot, "system.links", "1.0")`.

**`LumaSystemService`**

| Function            | Behaviour                                                                                                                                                                                       |
| ------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `facts(mod, out)`   | Any thread. Fills `LumaSystemFacts` (version 1.0: 320 bytes). A null `out` or a smaller `size`: `LUMA_E_ARGUMENT`, reported. Strings are NUL-terminated UTF-8, cut at a character's end to fit. |
| `display(mod, out)` | Game thread. Fills `LumaSystemDisplay` (version 1.0: 56 bytes), as `facts`.                                                                                                                     |

**`LumaSystemClipboardService`** (game thread)

| Function                                             | Behaviour                                                                                                                                                                                                                                |
| ---------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `get_text(mod, fn, user, out)`                       | `LUMA_PENDING`, the request in `*out`. A `LUMA_SYSTEM_CLIPBOARD_EVENT_TEXT` (1) event follows; with status OK, `value` is the text's length in bytes (no NUL).                                                                           |
| `take_text(mod, request, buf, size)`                 | Only inside that TEXT event's call, once: copies `min(value, size - 1)` bytes and a NUL into `buf` and returns `value`. Outside the call, another handle or a second time: `LUMA_E_HANDLE`; a null `buf` or `size` 0: `LUMA_E_ARGUMENT`. |
| `get_image(mod, fn, user, out)`                      | As `get_text`. An IMAGE (2) event follows; `value` is `width << 32 \| height`. Where `clipboard_images` is 0: `LUMA_E_ABSENT`, not reported.                                                                                             |
| `take_image(mod, request, rgba, size)`               | Only inside that IMAGE event's call, once: copies the pixels; `size` must be at least `width * height * 4`.                                                                                                                              |
| `set_text(mod, text, bytes, fn, user, out)`          | Copies the text before returning; `LUMA_PENDING`, a SET (3) event follows. Not UTF-8 or a NUL inside: `LUMA_E_ARGUMENT`; over 16 MiB: `LUMA_E_TOO_LARGE`.                                                                                |
| `set_image(mod, rgba, width, height, fn, user, out)` | As `set_text`, for `width` x `height` RGBA pixels (copied). 0 or over 8192 a side, or over 64 MiB: `LUMA_E_ARGUMENT`.                                                                                                                    |
| `cancel(mod, request)`                               | No event for it after this returns. Not this mod's open request: `LUMA_E_HANDLE`.                                                                                                                                                        |

A 5th open request is `LUMA_E_LIMIT`. An event's status is `LUMA_OK`, `LUMA_E_NOT_FOUND`, `LUMA_E_TOO_LARGE`,
`LUMA_E_BUSY`, `LUMA_E_IO` or `LUMA_E_FORMAT`; a cancelled request has no event. The request is closed after its
event's call whether or not you called `take_text` or `take_image`.

**`LumaSystemLinksService`** (game thread)

| Function                        | Behaviour                                                                                                                                                                                                                                                                                                                                       |
| ------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `open(mod, url, fn, user, out)` | `LUMA_PENDING`; a `LUMA_SYSTEM_LINKS_EVENT_LINK` (1) event follows, status OK when the system took the link, `LUMA_E_IO` when it refused it. A URL breaking the rules above: `LUMA_E_ARGUMENT`, reported. Another of this mod's links in the last 10 seconds, one still open, or the game not in front: `LUMA_E_BUSY`, an answer, not reported. |
| `cancel(mod, request)`          | As the clipboard's. It stops the event, not the browser.                                                                                                                                                                                                                                                                                        |

The enums are `LumaSystemPlatform` (`LUMA_SYSTEM_WINDOWS` 0, `LINUX` 1, `ANDROID` 2, `MACOS` 3, `IOS` 4),
`LumaSystemArch` (`X64` 0, `ARM64` 1), `LumaSystemRenderer` (`D3D12` 0, `VULKAN` 1, `METAL` 2) and
`LumaSystemRegion` (`US` 0, `EU` 1, `JP` 2).

## See also

- [Services overview](services/overview.md)
- [Permissions](start/permissions.md)
- [time](services/time.md)
- [draw](services/draw.md)
- [The mod log in depth](reference/mod-log.md)
- [Tutorial: a LiveSplit link](tutorials/livesplit-link.md)
