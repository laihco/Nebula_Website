---
title: Audio and capture
nav_title: audio
description: Play your mod's sound effects, stream sound you make yourself, and hear the microphone or see the camera with the player's permission.
order: 10
level: intermediate
---

The `audio` service plays sound: your mod's own cooked sound effects, and sound your code makes and streams in. Two
more services, `audio.microphone` and `capture.camera`, let a mod hear the player's microphone or see their camera,
each only with the player's permission.

## Example

A sound effect is content: put `thud.sound.json` (and the WAV, FLAC or Ogg file it names) in
`layers/base/assets/`, and the game cooks it into the sound `"thud"`. See [Sound](content/sound.md). Then play it:

```lumascript source/main.lum
use svc.audio

// volume and pitch 1: as cooked; bus 255: the sound's own; loop -1: the sound's own loop points
let as_cooked = audio.Play { volume: 1.0, pitch: 1.0, bus: 255, loop: -1 }

var hum: audio.Voice? = none

hook after Mario::doLanding() {
    audio.play("thud", as_cooked, fn(e: audio.EndedEvent) { })
}

fn start_hum() {
    let how = audio.Play { volume: 0.5, pitch: 1.0, bus: 255, loop: 1 }      // loop until stopped
    hum = audio.play("hum", how, fn(e: audio.EndedEvent) { hum = none })
}

fn stop_hum() {
    if let v = hum { audio.voice_stop(v, 500); hum = none }                   // fade out over 500 ms
}
```

`audio` needs no permission: playing sound shows nothing outside the game.

## Playing sounds

| Operation                          | Description                                                                                                         |
| ---------------------------------- | ------------------------------------------------------------------------------------------------------------------- |
| `audio.play(name, how, fn)`        | Plays a cooked sound and gives its voice. `fn` gets ENDED once, when it finishes.                                   |
| `audio.voice_set(voice, ...)`      | Replaces the voice's volume and pitch (ramped over 10 ms).                                                          |
| `audio.voice_stop(voice, fade_ms)` | Fades the voice out over `fade_ms` (0 means 10 ms; at most 10 s). The voice is closed at once and no ENDED follows. |
| `audio.bus_volume`                 | Sets your mod's share (0 to 1) of a bus's volume, for all its voices and streams on that bus.                       |

### Which sound

`name` is the sound's path in your mod's `assets` folder without the `.sound.json`: `"thud"` for
`layers/<layer>/assets/thud.sound.json`. Write `"<mod id>:<path>"` to play another mod's sound. The cooked sound is
read in place; nothing is copied. A name that is not a cooked sound is a mistake: nothing plays and the mod log says
so (`Audio.NotASound`).

### How it plays

| Field of `how` | Meaning                                                                                          | Range     |
| -------------- | ------------------------------------------------------------------------------------------------ | --------- |
| `volume`       | Times the sound's own volume.                                                                    | 0 to 4    |
| `pitch`        | Times this play's pick from the sound's pitch range.                                             | 0.25 to 4 |
| `bus`          | 0 effects, 1 ui, 2 voice, 3 music; 255 the sound's own.                                          |           |
| `loop`         | -1 the sound's own loop points; 0 play once; 1 loop between its loop points, or the whole sound. |           |

The **bus** decides which of the player's volume settings the sound follows: effects and ui follow **Sound effects**,
voice follows **Voices**, and music follows **Music**. The game's master volume, mute in the background and mono
setting then apply as to every sound of the game's own.

### When a sound ends

ENDED comes once, at the start of a frame after the sound finished: status OK when it played to its end, or `Limit`
when it was dropped (below). The voice is closed after it.

A voice that ended this frame, but whose ENDED has not been given yet, is still open: `voice_set` changes nothing,
and `voice_stop` closes it without the ENDED.

### 32 voices at once

A mod plays at most 32 voices. When you play a 33rd, the voice with the lowest priority (the sound's `priority`, 0
to 255) ends, the oldest first among equals. If that is the new sound itself, it does not play and `play` answers
`Limit`. Either way the mod log names the sound that was stopped (`Audio.Dropped`).

## Streaming your own sound

A stream plays samples your code makes: a synthesiser, a decoder, a voice chat.

| Operation                            | Description                                                                                         |
| ------------------------------------ | --------------------------------------------------------------------------------------------------- |
| `audio.stream_open(...)`             | Opens a stream: rate 8,000 to 192,000 Hz, 1 or 2 channels (interleaved), bus 0 to 3, volume 0 to 4. |
| `audio.stream_push(stream, samples)` | Adds samples; gives the number of frames taken (all, or as many as fit).                            |
| `audio.stream_close(stream, drain)`  | Ends the stream: `drain` 1 plays what it still holds, 0 fades it over 10 ms. No event follows.      |

The stream holds half a second of sound. NEED comes at once when the stream opens, and again whenever less than 0.1 s
is left and you have pushed since the last NEED; its value is how many frames `stream_push` will take now. So: on
each NEED, make that many frames and push them.

- A stream that runs dry plays silence, and starts again from silence when you push.
- A sample that is not a finite number plays as silence, and the mod log says how many (`Audio.NotANumber`, once a
  push).
- A mod has at most 4 streams open; the 5th is refused.

## The mix

Every voice and stream is mixed after the game's own sound and before the master volume, each times its volume,
your mod's bus share and the player's volume for its bus. Sounds are resampled from 48 kHz (times the pitch) or from
the stream's rate. Every volume change ramps over 10 ms, so there are no clicks.

The mix never runs your code and never waits on it. With no mod sound playing, it costs the game one check a frame.

## When your mod stops

All of a stopped mod's voices and streams go silent in the same audio frame. Nothing of `audio` is kept between
sessions.

## Microphone and camera

| Service            | Permission                          | The player reads         |
| ------------------ | ----------------------------------- | ------------------------ |
| `audio.microphone` | `audio.microphone` (**Microphone**) | "Hears your microphone." |
| `capture.camera`   | `capture.camera` (**Camera**)       | "Sees your camera."      |

```json
{
  "permissions": [{ "name": "audio.microphone", "why": "Lets you shout to make Mario jump." }]
}
```

Each is a service of its own, granted on the consent screen; see [Permissions](start/permissions.md). A mod may have
one open of each.

| Operation                    | Description                                                                                                                                            |
| ---------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `audio.microphone.open(...)` | Starts hearing the default microphone at a rate of 8,000 to 192,000 Hz (0 means 48,000), 1 or 2 channels. SAMPLES events follow.                       |
| `capture.camera.open(...)`   | Starts seeing the camera at a width, height and frame rate (0 for the camera's own; a size it cannot give falls back to its own). FRAME events follow. |
| `close`                      | Stops it. No event follows.                                                                                                                            |

- **SAMPLES** gives 1,024 frames of float samples at your rate and channel count (mono is the average of left and
  right). At most eight blocks wait; if one was lost, the next SAMPLES says `Busy`.
- **FRAME** gives the newest picture once per game frame: RGBA, rows from the top, `width x 4` bytes a row, with the
  time it was taken. Pictures in between are skipped (`Busy`).
- **ENDED** comes when the device goes: `Absent` (no device, or the system's privacy settings refuse it) or `Io`
  (unplugged, or taken by another program). The handle is closed after it.
- Nothing waits for a device: `open` starts the device on its own thread, and closing only marks it.

Capture works on Windows today; on other systems `open` answers `Absent`.

## Messages in the mod log

| Row                | Says                                                                                                      |
| ------------------ | --------------------------------------------------------------------------------------------------------- |
| `Audio.NotASound`  | {mod}: {where} was given {name}, which is not a cooked sound; it did nothing.                             |
| `Audio.Dropped`    | {mod} plays more than 32 sounds at once: {name}, its sound of the lowest priority, was stopped ({where}). |
| `Audio.NotANumber` | {mod}: {where} was given {count} samples that are not numbers; they play as silence.                      |

> [!PLANNED]
> Later versions of `audio` add: playing the game's own sounds by name; positioned voices (using a sound's near and
> far distances); replacing one of the game's sounds; music, including replacing the game's music; and reading the
> game's own mix (`audio.tap`). Microphone and camera capture on Android, Apple systems and Linux are planned too.

## From C

The headers are `luma_audio.h` and `luma_capture.h`.

- `play(mod, name, how, fn, user, &voice)`: `how` is a `LumaAudioPlay`, or null to play the sound as cooked. ENDED
  is event kind 1, NEED kind 2.
- Capture: SAMPLES is kind 1 (the rate in `flags`), FRAME kind 2 with a `LumaCameraFrame`, ENDED kind 3.
- Mistakes use the general rows: a wrong argument, a closed handle, a struct of the wrong size, a limit.

## See also

- [Sound](content/sound.md): making a sound effect your mod can play
- [Services overview](services/overview.md)
- [Time](services/time.md): the game's clocks and frames
- [Permissions](start/permissions.md)
