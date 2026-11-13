---
title: Animation
description: Bring animation clips as glTF, replace the game's clips, add frame events, and play clips from code with the anim service.
order: 3
level: intermediate
---

Animation clips come into a mod as glTF animations. They are cooked into the game's own clip files, so the game
plays them exactly as it plays its own. You can ship clips inside a model's file, replace one of the game's clips
with an animation-only file, mark frames with named events, and play any clip from code.

## Quick start

To replace the Goomba's walk with your own, export only the animation, on the Goomba's skeleton, into the Goomba's
archive:

```text
my-mod/
  luma.json
  layers/
    base/
      files/
        ObjectData/Kuribo.arc/walk.anim.glb     an animation named "Walk"
```

The animation's name (`Walk`) picks the clip it replaces; the file's own name is free. No code is needed: every
Goomba now walks your way. Check it against your imported game, which the cook needs to read the skeleton:

```sh
lumalink check my-mod --game path/to/game.pak
```

To play a clip from code, use the game's own calls or the `anim` service:

```lumascript
MR::startAction(self, "Hurt")      // the game's way: start the actor's action by name
```

## Three ways to bring clips

| You want to                                              | Put this                             | Section                                             |
| -------------------------------------------------------- | ------------------------------------ | --------------------------------------------------- |
| Ship a model with its own clips                          | Animations inside the model's `.glb` | [Clips in a model's file](#clips-in-a-model-s-file) |
| Replace a game model's clips without replacing the model | `files/<Arc>.arc/<any>.anim.glb`     | [Animation files](#animation-files)                 |
| Mark frames of a clip with named events                  | `files/<Arc>.arc/<clip>.anim.json`   | [Frame events](#frame-events)                       |

## Clips in a model's file

Each glTF animation of a model's `.glb` or `.gltf` becomes clip files beside the model in its archive, named by the
animation's name (an unnamed one is `animation<N>`). A clip named like one of the game's in that archive replaces
it; the game's other clips stay.

| What moves                     | In glTF                                                                    | Clip file    |
| ------------------------------ | -------------------------------------------------------------------------- | ------------ |
| Joints                         | node `translation`, `rotation`, `scale` channels                           | `<name>.bck` |
| A material's texture transform | `KHR_animation_pointer` to `KHR_texture_transform` offset, scale, rotation | `<name>.btk` |
| A material's colour            | `KHR_animation_pointer` to `baseColorFactor` or `emissiveFactor`           | `<name>.bpk` |
| A material's texture (swaps)   | `extras.nebula.texture_swaps` (`material`, `keys` as [time, texture])      | `<name>.btp` |

### How a clip plays

Set the play mode in the animation's extras: `animations[i].extras.nebula.play`.

| Value                 | Meaning                                     |
| --------------------- | ------------------------------------------- |
| `loop`                | Loops (the default)                         |
| `once`                | Plays once                                  |
| `once_then_first`     | Plays once, then returns to the first frame |
| `there_and_back`      | Plays forward, then backward                |
| `loop_there_and_back` | Plays forward and backward, looping         |

Any other value is refused (`Cook.Clip.Plays`).

## Animation files

A file `files/<archive>.arc/<any>.anim.glb` (or `.anim.gltf`) holds animations only. Each animation becomes a clip
of the archive's game model, by the animation's name, and replaces the game's clip of that name. Names compare
without case: `Walk` replaces `walk.bck`. The game's other clips stay.

**The model** is the archive's one model. If the archive has several, it is the one named like the archive
(`Kuribo.arc/Kuribo.bdl`). Otherwise the file is refused with `Cook.Anim.WhichModel` {archive, models}.

**The skeleton.** The file's nodes carry the model's skeleton, as a Blender export of the armature does:

- Each of the game model's joints is the node of the same name. A missing one is `Cook.Model.MissingJoint`.
- Each such node hangs, through any nodes between, from the node of its game parent joint. Otherwise:
  `Cook.Anim.ParentDiffers` {joint, parent, found}, `Cook.Anim.ParentMissing` {joint, parent} or
  `Cook.Anim.RootDiffers` {joint, found}.
- A joint no channel moves keeps its node's rest place.
- Units and turns are the models': 1 m is 100 game units, rotations composed as the game composes them.

**Channels.** Joint `translation`, `rotation` and `scale`, and the material tracks below. A channel on a node that is
not a joint is `Cook.Anim.NotAJoint` {animation, node, model}. Morph weights, a pointer to anything but a material,
or anything else is `Cook.Anim.OnlyJoints` {animation, path}.

**Material tracks.** The file's materials stand for the game model's materials of the same name (exact, else without
case). You can animate:

- `baseColorFactor` through `KHR_animation_pointer` (a `.bpk` clip);
- the base colour texture's `KHR_texture_transform` offset, scale and rotation (a `.btk` clip);
- texture swaps through `extras.nebula.texture_swaps` (a `.btp` clip, on the material's first texture slot).

A swapped-in texture stands for one of the game model's textures, found by the image's `name`, else by the image's
file name without its last ending (the game's names have dots, such as `KuriboAll.2`). Your file's material needs no
texture of its own. Parts of a texture transform that no channel moves keep your file material's still
`KHR_texture_transform` (glTF's default without one), not the game material's.

An animation of materials only makes no joint clip: the game's joint clip of that name stays.

Refused by name:

| Reason                                                  | When                                                                                             |
| ------------------------------------------------------- | ------------------------------------------------------------------------------------------------ |
| `Cook.Anim.NoGameMaterial` {material, model, materials} | An animation moves a material the game model lacks                                               |
| `Cook.Anim.NoGameTexture` {texture, model, textures}    | A swapped-in texture the game model lacks                                                        |
| `Cook.Anim.TextureUnnamed` {texture, model}             | A swapped-in image with neither name nor file name                                               |
| `Cook.Anim.ModelUnread` {model}                         | A store imported by an older Nebula, whose model cannot be read for names: import the game again |
| `Cook.Clip.Pointer`                                     | Any other material pointer                                                                       |
| `Cook.Model.Invalid`                                    | A material number the file lacks                                                                 |

**Names.** Every animation is named (`Cook.Anim.NoName` {animation}), no two share a name (`Cook.Anim.Twice`
{name}), and the file has at least one (`Cook.Anim.None` {file}).

**Place.** Only inside a game archive (`Cook.Anim.NotInArchive` {file}), and only with the game known: the cook
numbers joints by the game's model, so `lumalink check` without `--game` refuses the file with `Cook.Anim.NoGame`
{file}.

## Frame events

A file `files/<archive>.arc/<clip>.anim.json` names events at frames of the archive's clip `<clip>`. Use events to
time footsteps, sounds and effects to the animation:

```json
{
  "events": [
    { "frame": 12, "event": "step_left" },
    { "frame": 30, "event": "step_right" }
  ]
}
```

When the clip plays through the `anim` service, each event arrives as a mark carrying the event's name (see
[Events while a clip plays](#events-while-a-clip-plays)).

| Rule                                          | Limit                                                             | Refusal                                                                                   |
| --------------------------------------------- | ----------------------------------------------------------------- | ----------------------------------------------------------------------------------------- |
| Keys                                          | `events` only; each event `frame` and `event` only, both required | `Cook.Effect.UnknownPart`, `Cook.Effect.Missing`                                          |
| `frame`                                       | A whole number, 0 to 65,534, and below the clip's frame count     | `Cook.Effect.Kind`, `Cook.Effect.Range`, `Cook.Events.PastEnd` {where, frame, clip, last} |
| `event`                                       | 1 to 63 of `A-Z a-z 0-9 _ .`                                      | `Cook.Events.Name` {where, name, max}                                                     |
| The same event twice at one frame             | not allowed (two different events at one frame are fine)          | `Cook.Events.Twice` {where, event, frame}                                                 |
| Count                                         | 1 to 64 events                                                    | `Cook.Events.None`, `Cook.Events.TooMany` {file, count, max}                              |
| Place                                         | Only inside a game archive                                        | `Cook.Events.NotInArchive` {file}                                                         |
| Clip name (the file name before `.anim.json`) | 1 to 127 bytes                                                    | `Cook.Events.ClipName` {file, max}                                                        |

Events at one frame keep the file's order. The frame is checked against the clip the game plays first for that name
(the first present of `.bck`, `.btk`, `.brk`, `.bpk`, `.btp`, `.bva`).

What cannot be checked is said, as a Note:

- `Cook.Events.ClipUnknown` {file, clip, archive}: the game's archive has no clip of that name (a clip your mod
  brings itself). Frames are then checked only against 65,534.
- `Cook.Events.GameUnknown` {file}: no game was given to the check.

## Timing and limits

- The game counts **60 frames a second**. Joints are sampled every other frame and on the last; rotations take the
  shorter way.
- A clip lasts at most **65,535 frames** (18 min 12 s at 60 a second). Longer is `Cook.Anim.TooLong` {animation,
  seconds, max}.
- A clip of no length is one frame.
- Every key, time and value must be a finite number (`Cook.Anim.NotANumber` {animation}).

Every refusal is **L804** on the file, from `lumalink check --game` and at the game's start. See
[Content overview](content/overview.md#checks-before-a-pack).

> [!PLANNED]
> Not built yet:
>
> - texture swaps on a material's second texture slot or later;
> - layered, masked and additive animation (the game's actions that start several clip kinds together, and blends).
>   Today you can reach both as [table patches](content/table-patches.md) of the game's `ActorAnimCtrl` and `.banmt`
>   tables;
> - morph weights;
> - visibility tracks (`KHR_node_visibility`).

## Run time: the anim service

The `anim` service plays clips from code: `use svc.anim`. It plays on a game actor, or on a model your mod attached
with [`content.model`](content/models.md#run-time-the-content-model-service).

| Member                            | Description                                                                                                                |
| --------------------------------- | -------------------------------------------------------------------------------------------------------------------------- |
| `play(actor, clip, how)`          | Plays the clip named `clip` on a game actor. Gives a play handle                                                           |
| `play_on_model(model, clip, how)` | The same on a model your mod attached                                                                                      |
| `stop(play)`                      | Stops the play: every clip kind it started stays on its current frame until the actor's code or another play starts a clip |
| `frame(play)`                     | Reads the lead clip's current frame and last frame                                                                         |

**What plays.** Every kind of clip of that name the model has starts together, as the game starts its own, so the
actor's effects and sounds keyed to a joint clip follow. The first present of `.bck`, `.btk`, `.brk`, `.bpk`, `.btp`,
`.bva` **leads**: its frame is the play's frame, its end the play's end, and marks are read on it. A game clip your
mod replaced is your clip.

### How

`how` (null or zeroed: as the game plays the clip):

| Field   | Meaning                                                                         |
| ------- | ------------------------------------------------------------------------------- |
| `rate`  | Frames moved per game frame. 0 means 1; above 0, at most 16                     |
| `blend` | For joint clips: 0 uses the model's clip table, -1 none, N blends over N frames |
| `loop`  | 0 as the clip says, 1 once, 2 loop                                              |
| `start` | The first frame, 0 to the clip's last frame                                     |
| `marks` | Up to 16 frames at which you want a mark event                                  |

**One play per kind and actor.** A new play ends an earlier play on the same actor (from any mod) that plays a kind
it plays. A colour clip and a joint clip of different names play side by side.

### Events while a clip plays

Events arrive at a frame's start. A paused game moves no frame, so it gives no marks and no end.

- **Mark** (value: the mark's index), each time the lead clip's frame moves onto or past a mark: on every loop
  (a loop's wrap counts the marks it passes), going backward as well, and at once for a mark on the start frame.
  Rows of the clip's [frame events](#frame-events) file come as marks after your own: the value is your mark count
  plus the row, and the event carries the row's name.
- **End**, the play's last event: success when a once clip ended; otherwise cancelled, with the reason in its value:
  1 stopped, 2 replaced (another play, or the actor's own code starting another clip of the lead's kind), 3 the actor
  died or the model was detached, 4 the scene ended.

When your mod stops, its plays give no event, and the clips keep running as the actor's own.

### Limits and messages

| Limit             | Value                                              |
| ----------------- | -------------------------------------------------- |
| Plays at once     | 64 a mod                                           |
| Marks a play      | 16                                                 |
| Clip names        | under 128 bytes                                    |
| Event rows a clip | 64 (more: the first 64 are used, and it is logged) |

| Code | Row                        | When                                                                      |
| ---- | -------------------------- | ------------------------------------------------------------------------- |
| 627  | `Content.MissingAnimation` | The model has no clip of that name, or shows nothing; the play is refused |
| 670  | `Content.EventPastEnd`     | A frame event row is past the lead clip's last frame; it never comes      |

## See also

- [Models](content/models.md)
- [Materials](content/materials.md)
- [Table patches](content/table-patches.md)
- [Content overview](content/overview.md)
- [LumaKit: actor](lumakit/actor.md), [LumaKit: player.state](lumakit/player-state.md)
- [Services overview](services/overview.md)
