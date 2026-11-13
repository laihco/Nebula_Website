---
title: Sound and music
nav_title: Sound
description: Add sound effects, music streams, voice lines and MIDI sequences with a .sound.json beside your audio file, and play them from code.
order: 6
level: intermediate
---

Every sound a mod brings is described by a small JSON file, `<path>.sound.json`, next to the audio file it uses. The
game cooks the pair into its own sound formats when it starts. This page covers sound effects, music streams, voice
lines and MIDI sequences, the formats each accepts, and how to play them.

## Quick start

```text
my-mod/
  luma.json
  source/main.lum
  layers/
    base/
      assets/
        sfx/
          ding.sound.json
          ding.wav
```

```json
{ "kind": "effect", "file": "ding.wav", "volume": 0.8, "pitch": [0.95, 1.05] }
```

```lumascript source/main.lum
use svc.audio

hook after Mario::doLanding() {
    audio.play(sound "sfx/ding")       // the path under assets/, without .sound.json
}
```

A sound's name is its path under `assets/` without `.sound.json`. Another mod's sound is `"<id>:<path>"`.

```sh
lumalink check my-mod --game path/to/game.pak
```

## Where sound files go

- `layers/<layer>/assets/<path>.sound.json` is your sound `<path>`. The audio file it names is read from the same
  folder of the same layer.
- Your `.wav`, `.flac` and `.ogg` files in `assets/` are **sources only**: they are not put in the game's store by
  themselves, only through a `.sound.json`.
- A `.sound.json` under `files/` (a game path) is refused: `Cook.Sound.NotAsset` {file}.

There are four kinds of sound, picked by `kind`:

| Kind       | Use it for                                                       | Source                                                   |
| ---------- | ---------------------------------------------------------------- | -------------------------------------------------------- |
| `effect`   | Short sounds: jumps, pickups, hits                               | WAV, FLAC, Ogg Vorbis; up to 60 s                        |
| `stream`   | Music and long sounds                                            | WAV, FLAC, Ogg Vorbis, BRSTM, BCSTM, BFSTM; up to 20 min |
| `voice`    | A line that stands in for one of the game's voice lines          | as `effect`                                              |
| `sequence` | Music played by the game's sequencer with the game's instruments | Standard MIDI                                            |

## Sound effects

```json
{
  "kind": "effect",
  "file": "jump.wav",
  "volume": 0.8,
  "pitch": [0.95, 1.05],
  "distance": [300, 3000],
  "priority": 128,
  "bus": "effects",
  "positioned": true,
  "loop": false
}
```

| Key          | Meaning                                                                                                                                                                                                      | Default       |
| ------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ------------- |
| `kind`       | `"effect"`                                                                                                                                                                                                   | required      |
| `file`       | The sound beside it: WAV, FLAC or Ogg Vorbis, recognised by its bytes, not its ending                                                                                                                        | required      |
| `volume`     | Linear gain, 0 to 4                                                                                                                                                                                          | 1             |
| `pitch`      | A number, or `[lowest, highest]`: each play picks one between, evenly. 0.25 to 4                                                                                                                             | 1             |
| `distance`   | `[near, far]` in game units: full volume within near, silent beyond far. 0 to 1,000,000, near below far                                                                                                      | `[300, 3000]` |
| `priority`   | 0 (dropped first) to 255                                                                                                                                                                                     | 128           |
| `bus`        | `effects`, `ui`, `voice` or `music`: which of the player's volume settings it follows                                                                                                                        | `effects`     |
| `positioned` | `false`: played at the listener, `distance` unused                                                                                                                                                           | `true`        |
| `loop`       | Absent: the file's own loop points. `false`: no loop. `true`: the file's loop, or the whole sound. `{"start": s, "end": e}`: in the file's sample frames; `end` is not played and defaults to the last frame | absent        |
| `replace`    | A game sound this one stands in for, by name (see [Replacing the game's sounds](#replacing-the-game-s-sounds))                                                                                               | none          |

A file's own loop points are read from a WAV's `smpl` chunk, or a FLAC or Vorbis file's `LOOPSTART` with `LOOPEND` or
`LOOPLENGTH` tags.

> [!PLANNED]
> `distance` and `positioned` are cooked into the sound, but playing a mod's sound at a place in the world (near and
> far) is a later layer of the audio service. Today a mod's sound effects play at the listener.

### What the audio file may be

| Rule                                                                     | Refusal                                                        |
| ------------------------------------------------------------------------ | -------------------------------------------------------------- |
| WAV: PCM 8, 16, 24 or 32 bit, or float 32 or 64 bit, plain or extensible | `Cook.Sound.WavKind` {uri, kind, width}                        |
| FLAC: any kind; every frame's checksums are checked                      | `Cook.Sound.Broken` {uri, value}                               |
| Ogg Vorbis (Ogg Opus is not read)                                        | `Cook.Sound.Opus` {uri}                                        |
| 1 or 2 channels                                                          | `Cook.Sound.Channels` {uri, count, max}                        |
| 8,000 to 384,000 Hz                                                      | `Cook.Sound.Rate` {uri, value, min, max}                       |
| 1 frame to 60 seconds (use a stream for longer)                          | `Cook.Sound.Empty` {uri}, `Cook.Sound.TooLong` {seconds, max}  |
| No NaN or infinite sample                                                | `Cook.Sound.NotANumber` {uri}                                  |
| A loop inside the sound and not empty                                    | `Cook.Sound.LoopOutside` {uri, value, count}                   |
| A sound file at all, whole                                               | `Cook.Sound.Unreadable` {uri}, `Cook.Sound.Cut` {uri}          |
| The file present, its path inside the folder                             | `Cook.Effect.FileMissing` {where, uri}, `Cook.Effect.FilePath` |

The JSON itself is checked with the same words as effects: an unknown key is `Cook.Effect.UnknownPart`, a wrong
kind of value `Cook.Effect.Kind`, out of range `Cook.Effect.Range`, not one of a list `Cook.Effect.Choice`, and a
pair the wrong way round `Cook.Sound.Order` {where}.

### What the cook does

- Resamples to 48,000 Hz with a high-quality windowed-sinc filter (48 kHz sources are copied). With a loop, the
  filter reads across the loop's seam, so the loop sounds as smooth as your source. Loop points are scaled to 48 kHz
  and rounded.
- Rounds to 16 bits, without dither, so the same source cooks to the same bytes every time.
- Measures the loudness (EBU R 128, integrated) and the peak. Neither changes the sound.

## Replacing the game's sounds

`"replace": "<name>"` makes your sound stand in for the game's sound of that name, everywhere the game plays it, with
your sound's volume, pitch, distances, bus and loop.

```json
{ "kind": "effect", "file": "boing.wav", "replace": "SE_PM_JUMP_M" }
```

- Names are the game's sound table's: 3,487 on the disc, made of letters, digits and `_`, such as `SE_PM_JUMP_M`
  (Mario's jump) or `SE_SY_2P_ASSIST_JUMP`.
- A name the game lacks is `Cook.Sound.NoGameSound` {where, name}, from `lumalink check --game` and at the game's
  start. Without the game, the name is not checked.

> [!PLANNED]
> The cook accepts and checks `replace` today, but the audio service playing your sound in place of the game's is a
> later layer. Until it lands, a replaced game sound still plays the game's own. When it lands, two mods replacing
> one name will be settled by load order, with the other mod named.

## Music streams

```json
{
  "kind": "stream",
  "file": "theme.ogg",
  "volume": 1,
  "loop": { "start": 88200, "end": 1323000 },
  "replace": "smg_galaxy01"
}
```

| Key       | Meaning                                                                                                                                                                    | Default  |
| --------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------- |
| `kind`    | `"stream"`                                                                                                                                                                 | required |
| `file`    | WAV, FLAC, Ogg Vorbis, BRSTM, BCSTM or BFSTM beside it, recognised by its bytes                                                                                            | required |
| `volume`  | Linear, 0 to 4                                                                                                                                                             | 1        |
| `loop`    | Absent or `true`: the file's loop, else the whole sound. `false`: plays once. `{"start", "end"}` in the file's sample frames; `end` is not played and defaults to the last | absent   |
| `replace` | A game stream to replace: its file name in `AudioRes/Stream`, without `.ast`                                                                                               | none     |

- The stream is cooked to the game's own stream file at `Luma/<id>/<path>.ast`. With `replace`, the same file also
  goes at `AudioRes/Stream/<name>.ast`, so the game's music is replaced wherever it plays.
- Sample rates up to 48 kHz are kept; higher is resampled to 48 kHz, with the loop scaled.
- A galaxy's music in LumaKit is a sound name, for example `music: sound "NebulaTheme"` (see
  [LumaKit: stage](lumakit/stage.md)).

| Refusal                                                          | When                                             |
| ---------------------------------------------------------------- | ------------------------------------------------ |
| `Cook.Sound.StreamChannels` {uri, count, max}                    | More than 6 channels                             |
| `Cook.Sound.StreamTooLong` {seconds, max}                        | Longer than 1200 seconds (20 minutes)            |
| `Cook.Sound.StreamFile` {uri, detail}                            | A BRSTM, BCSTM or BFSTM file that cannot be read |
| `Cook.Sound.StreamName`, `Cook.Sound.NoGameStream` {where, name} | A bad or unknown stream name in `replace`        |
| `Rate`, `Empty`, `Cut`, `Broken`, `LoopOutside`, `NotANumber`    | As for effects                                   |

## Voice lines

`"kind": "voice"` is an effect (the keys of [Sound effects](#sound-effects)) that **must** have `replace`: the game
voice line it stands in for, by its sound name. Its bus is `voice` unless it says otherwise.

```json
{ "kind": "voice", "file": "hello.wav", "replace": "<game sound name>" }
```

No `replace` is `Cook.Effect.Missing`; a name the game does not have is `Cook.Sound.NoGameSound`.

> [!PLANNED]
> A voice line is played in place of the game's through the same sound replacement as above, which is a later layer
> of the audio service.

## MIDI sequences

A sequence is played by the game's own sequencer with the game's instruments, so it sounds like the game's music.

```json
{
  "kind": "sequence",
  "file": "tune.mid",
  "instruments": { "0": { "bank": 0, "program": 5 }, "drums": { "bank": 3, "program": 0 } },
  "volume": 1,
  "loop": true,
  "replace": "<path in JaiSeq.arc>"
}
```

| Key           | Meaning                                                                                                                                                                             | Default  |
| ------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------- |
| `kind`        | `"sequence"`                                                                                                                                                                        | required |
| `file`        | A Standard MIDI file, format 0 or 1, timed in ticks a quarter note                                                                                                                  | required |
| `instruments` | Each MIDI program (`"0"` to `"127"`, as the file numbers them) or `"drums"` (channel 10) to a game instrument: `bank` and `program`, 0 to 255                                       | none     |
| `volume`      | 0 to 1                                                                                                                                                                              | 1        |
| `loop`        | Absent: from a `loopStart` marker (or CC 111) to `loopEnd` or the end; no loop without a marker. `true`: the markers, or the whole song. `false`: none. `{"start", "end"}` in ticks | absent   |
| `replace`     | A game sequence: its path in `AudioRes/Seqs/JaiSeq.arc`                                                                                                                             | none     |

- The song is cooked to `Luma/<id>/<path>.nseq`; with `replace`, also at `AudioRes/Seqs/JaiSeq.arc/<name>`.
- At most 16 MIDI channels with notes, and at most 7 notes held at once on one channel.
- What is played: notes, program changes, volume (CC 7), pan (CC 10), pitch bend (full bend is 2 semitones), tempo
  changes. At a loop's start each track restores its instrument, volume, pan and bend; at its end held notes are let
  go.
- Left out, and counted in a Note (`Cook.Sound.MidiDropped` {uri, detail}): key and channel pressure, every other
  controller, system exclusive messages, and an eighth note held at once on one channel.

| Refusal                                                | When                                                                                                    |
| ------------------------------------------------------ | ------------------------------------------------------------------------------------------------------- |
| `Cook.Sound.Midi` {uri, detail}                        | Not MIDI, format 2, frames-a-second timing, a running status with none before, or more than 2^20 events |
| `Cook.Sound.Empty`                                     | No notes                                                                                                |
| `Cook.Sound.NoInstrument` {uri, name}                  | A program is played with no instrument given for it                                                     |
| `Cook.Sound.InstrumentKey`                             | A bad key in `instruments`                                                                              |
| `Cook.Sound.SequenceName`, `Cook.Sound.NoGameSequence` | A bad or unknown sequence in `replace`                                                                  |
| `Cook.Sound.Cut`, `Cook.Sound.LoopOutside`             | A cut-off file, or a loop outside the song                                                              |
| `Cook.Sound.Sequence` {uri, detail}                    | The game's own sequence cook refused the result (a fault of the cook, not your file)                    |

> [!PLANNED]
> Your own samples as instruments (a mod's own instrument bank) are not built yet: a sequence plays the game's
> instruments.

## Checks

Every refusal is **L804** on the `.sound.json`, from `lumalink check` (with the game) and at the game's start. A
refused sound is not cooked, and its L804 is in the mod log.

## Run time: the audio service

Sounds are played with the [audio service](services/audio.md): `use svc.audio`.

- `audio.play(sound "<path>")` plays your cooked sound effect. Optional settings multiply the sound's own: `volume`
  (0 to 4), `pitch` (0.25 to 4), `bus`, and `loop` (the sound's loop points, once, or looped).
- `sound_named(name)` looks a sound up by a name made while the game runs; it gives `none` when your mod has no
  such sound:

  ```lumascript
  if let voice = sound_named("voice/{id}") {
      audio.play(voice, bus: audio.Bus.Voice)
  }
  ```

- A mod plays at most **32 sounds at once**. A 33rd stops the playing sound with the lowest `priority` (the oldest
  of equals first), and the mod log says so (`Audio.Dropped`, 351).
- Each bus follows the player's volume setting for it: `effects` and `ui` follow Sound effects, `voice` follows
  Voices, `music` follows Music.

| Code | Row                    | When                                                          |
| ---- | ---------------------- | ------------------------------------------------------------- |
| 624  | `Content.MissingSound` | The sound does not exist: a soft two-note chime plays instead |
| 350  | `Audio.NotASound`      | The name given is not a cooked sound                          |
| 351  | `Audio.Dropped`        | More than 32 sounds at once                                   |

## See also

- [Services: audio and capture](services/audio.md)
- [Content overview](content/overview.md)
- [LumaKit: stage](lumakit/stage.md)
- [Recipes](tutorials/recipes.md) (voice-acted dialogue)
- [Tutorial: a new galaxy](tutorials/a-new-galaxy.md)
