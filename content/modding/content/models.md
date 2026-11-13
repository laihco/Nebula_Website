---
title: Models
description: Bring your own 3D models as glTF, replace the game's models, and attach models to actors at run time.
order: 2
level: essential
---

Models come into a mod as glTF 2.0 files. The game cooks each one into its own model format and draws it with the
same code that draws its own models, so a mod's model costs no more than a game model and looks the same on every
renderer. This page covers where model files go, how to export them, the checks they must pass, and the
`content.model` service that attaches models to actors while the game runs.

## Quick start

To add a new model of your own, put a `.glb` under `assets/` and name it from code:

```text
my-mod/
  luma.json
  source/main.lum
  layers/
    base/
      assets/
        ring.glb
```

```lumascript source/main.lum
use kit.actor

hook after GameScene::startStagePlayFirst() {
    // draws the ring on Mario's right hand, following it every frame
    actor.attach(MarioAccess::getPlayerActor(), model "ring", joint: "HandR")
}
```

To replace one of the game's models, put your glTF at the game model's place, named after it:

```text
layers/
  base/
    files/
      ObjectData/Kuribo.arc/Kuribo.glb     replaces the Goomba's model
```

No code is needed: wherever the game draws a Goomba, it now draws yours. Then check against your imported game:

```sh
lumalink check my-mod --game path/to/game.pak
```

## Where a model goes

| Your file                                                       | What it is                                                                         | The game knows it as                          |
| --------------------------------------------------------------- | ---------------------------------------------------------------------------------- | --------------------------------------------- |
| `files/ObjectData/<Arc>.arc/<Name>.glb` (or `.gltf`)            | A replacement for whichever of `<Name>.bdl` or `<Name>.bmd` the game's archive has | The game model's own path                     |
| `files/ObjectData/<Arc>.arc/<Name>.bdl.glb` or `<Name>.bmd.glb` | A replacement for exactly that file                                                | The game model's own path                     |
| `assets/<path>.glb` (or `.gltf`)                                | A new model of your own                                                            | `<id>:<path>`; in LumaScript `model "<path>"` |

- If the archive has **neither** `<Name>.bdl` nor `<Name>.bmd`, a plain `<Name>.glb` is refused with
  `Cook.Model.NoGameModel`, which lists the archive's models. A new model goes in `assets/`, not `files/`.
- If the archive has **both**, a plain `<Name>.glb` is refused with `Cook.Model.TwoGameModels`: name the file
  `<Name>.bdl.glb` or `<Name>.bmd.glb` to say which.
- `<Name>.kcl.glb` is collision (it becomes `.kcl` and `.pa`) and `<Name>.canm.glb` is a camera. Neither is a model.
- A replacement changes only the model entry. The archive's other files (animations, other models' materials,
  collision) stay the game's.
- Every glTF animation in your model's file becomes a clip beside it. A clip named like one of the game's clips in
  that archive replaces it; the game's other clips stay. See [Animation](content/animation.md).

A new model is cooked as an object archive of its own, the same layout as every game object
(`ObjectData/Coin.arc/Coin.bdl`), with its clips inside.

## Exporting from your tool

| Setting | Rule                                                                                                                  |
| ------- | --------------------------------------------------------------------------------------------------------------------- |
| Format  | glTF 2.0 only: `.glb` (binary) or `.gltf` with its buffer and image files beside it                                   |
| Units   | 1 glTF metre is **100 game units**, for models and collision alike                                                    |
| Axes    | As glTF says: +Y up, the model faces +Z, right-handed. No axis is turned                                              |
| Winding | Export as glTF says (counter-clockwise). The cook turns each triangle for the game                                    |
| Origin  | The model's root is its origin. A replacing model stands where the game model stood: a character's feet at the origin |
| Scene   | The file's `scene`, or scene 0                                                                                        |

> [!TIP]
> A 1 m cube in Blender is a 100-unit cube in the game, the same size as the placeholder cube a missing model
> shows.

## Joints

### Replacing a game model

A replacing model is cooked against the game model's own joints, because the game's clips, the game's code and
LumaKit find joints by number and by name:

- If the game model has **one** joint (props and most map parts), your file's root is joint 0, whatever its name.
- Otherwise each of your joints takes the game model's number for the joint of the same name. A joint the game model
  has and your file lacks is refused with `Cook.Model.MissingJoint` {joint, model}.
- Extra joints of yours are numbered after the game's, parents before children. They move with their parents and
  play no game animation.
- If the cook has to add a root (your scene has several roots), it takes the game's joint 0 name.

> [!TIP]
> To see a game model's joint names, extract its archive with [`lumalink extract --game`](lumalink/extract.md).
> Keep those names in your armature and the game's own animations will drive your model.

### A new model

A new model numbers its joints depth-first from the skin's root, parents first.

### Rest pose, billboards and bounds

- The rest pose comes from each glTF node's translation, rotation and scale. Rotations are composed in the order
  the game composes a joint's (Z, then Y, then X).
- A node may be a billboard, turning to face the camera as the game's billboard joints do: give it
  `"extras": {"nebula": {"billboard": "y"}}` or `"xy"`. Any other value is `Cook.Model.Billboard` {node, value}.
- Each joint's bounds come from the vertices it moves at rest. The game culls by them.

### Skins

- At most **4 weights** a vertex (`JOINTS_0` / `WEIGHTS_0`). Weights are renormalised.
- A second set (`JOINTS_1` / `WEIGHTS_1`) with any weight over 0.001 is `Cook.Model.WeightsOver4` {mesh, vertices}.
  Limit weights to 4 a vertex in your exporter.
- A skinned node whose primitive has no `JOINTS_0` / `WEIGHTS_0` is `Cook.Model.SkinNoWeights` {mesh}.
- Vertices whose weights are all 0.001 or less go on the skin's root, with a Note `Cook.Model.Unweighted`
  {mesh, count}.
- One skin a mesh: a second skin is `Cook.Model.TwoSkins` {mesh, mesh}.

## Meshes

- One mesh is made for each glTF primitive, attached to its node's joint (static) or the skin's root (skinned).
- **Triangles** (glTF mode 4). Strips (5) and fans (6) are turned into triangles in glTF's vertex order. Points and
  lines (modes 0 to 3) are `Cook.Model.NotTriangles` {mesh, mode}.
- **Normals** come from the file. Without them the cook makes flat normals, as glTF 2.0 tells a reader to, with a
  Note `Cook.Model.FlatNormals` {mesh}. Export normals if you want smooth shading.
- **Tangents** are read from `TANGENT` when the material has a normal map, else computed with MikkTSpace, the
  generator glTF names.
- **Vertex colours**: `COLOR_0` and `COLOR_1` (vec3 or vec4; float or normalised 8 or 16 bit), written in the game's
  8-bit colour space as its own vertex colours are. `COLOR_2` and up are `Cook.Model.ColorSets`.
- **Texture coordinate sets**: up to the game's material slot count. More is `Cook.Model.CoordSets` {mesh, n,
  limit}, which names the limit.

Materials and textures are on their own page: [Materials](content/materials.md).

## Levels of detail

The game swaps far objects for simpler models by distance. Its levels are named `<Name>Middle` and `<Name>Low`.

- **Replacing a game model's level**: it is another replacing model at its own path,
  `files/ObjectData/<Name>Low.arc/<Name>Low.glb` (and `Middle` likewise).
- **Levels of a new model**: put `assets/<path>Middle.glb` and `assets/<path>Low.glb` beside `assets/<path>.glb`.
  They are levels of `<path>`, not models of their own: you cannot attach `<path>Low` by name. When the model is
  attached, the game picks the level by its own distance rule for the actor that draws it.
- The endings `Middle` and `Low` must be written with those capitals: `yellow.glb` is not a level of `yel`.
- A level whose base model is missing is `Cook.Model.LevelAlone` {file, model}.

## Sockets

A **socket** is a named point on a model where effects and other models can be bound: a sword's tip, a hand's
grip. Make one with an empty node (no mesh) named `socket:<name>`:

- It becomes an extra joint named `<name>` (without `socket:`), parented to its nearest joint ancestor (the root if
  none).
- Two sockets of one name are `Cook.Model.SocketTwice` {name}. A socket named like a joint is
  `Cook.Model.SocketIsJoint` {name}.
- Effects bind to a socket by name with `content.fx.start_on_model` (see [Effects](content/effects.md)).

## Mario's parts

Mario's hands, face and shadow are models of their own, which the game swaps (open hand, fist, pointing; the face's
expressions). Replace each like any model, at `ObjectData/<Name>.arc/<Name>.glb`, keeping its joint names:

| Part                                           | Drawn at the body's joint    |
| ---------------------------------------------- | ---------------------------- |
| `MarioHandL`, `MarioHandR`                     | `HandL`, `HandR`             |
| `IceMarioHandL`, `IceMarioHandR`               | `HandL`, `HandR`             |
| `InvincibleMarioHandL`, `InvincibleMarioHandR` | `HandL`, `HandR`             |
| `MarioFace`, `LuigiFace`                       | `Face0`                      |
| `MarioShadow`, `LuigiShadow`                   | the base (the simple shadow) |

To draw a model of your own over one of them, attach it to the player at that joint. `player_parts` (below) lists
the parts and joints at run time.

## Limits and checks

Every limit is refused with the limit named. Nothing is cut silently.

| Limit                                | Value                          |
| ------------------------------------ | ------------------------------ |
| Elements in one accessor             | at most 2^22                   |
| Images or coordinate sets a material | at most 240                    |
| Image size                           | at most 16384 pixels a side    |
| Weights a vertex                     | 4                              |
| Texture coordinate sets              | the game's material slot count |
| Models attached at once              | 64 a mod (`content.model`)     |

Reading rules:

- Buffers are embedded (`data:` base64) or files beside the glTF. A path with `..`, a leading `/` or a `:` is
  `Cook.Model.Leaves` {uri}.
- Every accessor component type is read, including normalised integers, strides and sparse values.
- Required extensions that are read: `KHR_texture_transform`, `KHR_animation_pointer` and `KHR_mesh_quantization`.
  Any other required extension is `Cook.Model.Extension` {name}.
- A damaged file is refused: a cut-off `.glb`, a view past its buffer, an accessor past its view, a triangle naming
  a vertex past the mesh, a node the scene lacks, a skin naming a node outside the scene, no triangles at all.

Every refusal is **L804** on your file, with a `Cook.Model.<Kind>` reason in the player's language. It names the file
and the mesh, node or material by its glTF name (else by its number). Notes do not refuse the model.

| Reason                                               | Level | What to fix                                                         |
| ---------------------------------------------------- | ----- | ------------------------------------------------------------------- |
| `Cook.Model.NoGameModel`                             | Error | The archive has no model of that name: put a new model in `assets/` |
| `Cook.Model.TwoGameModels`                           | Error | Name the file `.bdl.glb` or `.bmd.glb`                              |
| `Cook.Model.MissingJoint`                            | Error | Add the game model's joint to your armature                         |
| `Cook.Model.WeightsOver4`                            | Error | Limit weights to 4 a vertex                                         |
| `Cook.Model.SkinNoWeights`                           | Error | Export skin weights for the mesh                                    |
| `Cook.Model.TwoSkins`                                | Error | Use one skin a mesh                                                 |
| `Cook.Model.Unweighted`                              | Note  | Some vertices have no weight; they follow the root                  |
| `Cook.Model.NotTriangles`                            | Error | Export triangles, not points or lines                               |
| `Cook.Model.FlatNormals`                             | Note  | Export normals for smooth shading                                   |
| `Cook.Model.ColorSets`                               | Error | Use at most two vertex colour sets                                  |
| `Cook.Model.CoordSets`                               | Error | Use fewer texture coordinate sets                                   |
| `Cook.Model.Billboard`                               | Error | Use `"y"` or `"xy"`                                                 |
| `Cook.Model.SocketTwice`, `Cook.Model.SocketIsJoint` | Error | Give each socket its own name                                       |
| `Cook.Model.LevelAlone`                              | Error | Add the base model for the level                                    |
| `Cook.Model.Leaves`                                  | Error | Keep buffer and image paths inside the mod                          |
| `Cook.Model.Extension`                               | Error | Do not require that extension                                       |

If a **replacing** model fails, the game keeps its own model; if a **new** model fails, the placeholder cube is
drawn. Either way the mod is off for the session if the failure happens at the game's start; see
[Content overview](content/overview.md#cooking).

When two mods replace the same model, the mod higher in the Mods list is used and both are named (L305).

## Run time: the content.model service

Most mods attach models through LumaKit (for example `actor.attach` in [actor](lumakit/actor.md), or a form's
`look` in [player.form](lumakit/player-form.md)). Those are built on the game's `content.model` service, which you
can also use directly with `use svc.content.model`. It needs no permission. Calls are made on the game thread.

| Member                                       | Description                                                                                                                              |
| -------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------- |
| `attach(actor, model, follow, joint, place)` | Draws `model` with `actor`, following it as `follow` says. Gives a model handle owned by your mod. A missing model draws the placeholder |
| `detach(model)`                              | Stops drawing it. The handle ends                                                                                                        |
| `show(model, on)`                            | Shows or hides it. The game's own hide calls on the actor hide it too                                                                    |
| `player_parts(...)`                          | Lists the player's parts (name and the body joint each is drawn at)                                                                      |
| `set_param(model, material, param, rgba)`    | Sets a hand-written shader's parameter on the attached model's own copy of a material (1.1; see [Materials](content/materials.md))       |

`model` is a model name (`model "ring"`), checked when you build. `actor` must be a live `LiveActor`; anything
else is an argument error.

### Follow modes

| Mode     | Value | What the model does                                                                                                    |
| -------- | ----- | ---------------------------------------------------------------------------------------------------------------------- |
| Actor    | 0     | Follows the actor's base matrix                                                                                        |
| Joint    | 1     | The whole model sits on one joint or socket of the actor, named by `joint`                                             |
| Skeleton | 2     | Each joint of the model takes the actor's same-named joint every frame. A joint the actor lacks follows its own parent |

`place` offsets and turns the model from where it follows: an offset in game units and a turn in degrees about X, Y
and Z, in the joint's space. It is ignored for Skeleton.

Skeleton mode is how a whole new body is put on a character: give your model the same joint names as the
character's skeleton and every animation the character plays moves your model too.

### When a handle ends

A model handle ends at `detach`, when its actor ends, at a scene change, and when your mod stops. A call on an ended
handle is an error (`LUMA_E_HANDLE`) that is reported, never a crash. The model is hidden whenever its actor is
hidden or clipped.

### Messages while the game runs

| Code | Row                    | When                                                                      |
| ---- | ---------------------- | ------------------------------------------------------------------------- |
| 621  | `Content.MissingModel` | The model does not exist: the placeholder is drawn                        |
| 626  | `Content.MissingJoint` | Joint mode on a joint the actor lacks: the model follows the actor's base |
| 671  | `Content.MissingParam` | `set_param` names a material or parameter the model lacks                 |

More than 64 attached models in one mod is a limit error.

## See also

- [Animation](content/animation.md)
- [Materials](content/materials.md)
- [Effects](content/effects.md)
- [Content overview](content/overview.md)
- [LumaKit: actor](lumakit/actor.md), [LumaKit: player.form](lumakit/player-form.md),
  [LumaKit: player.character](lumakit/player-character.md)
- [Services overview](services/overview.md)
- [`lumalink add`](lumalink/add.md), [`lumalink extract`](lumalink/extract.md)
- [Tutorial: a new power-up](tutorials/a-new-power-up.md)
