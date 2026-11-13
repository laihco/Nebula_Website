---
title: Materials and textures
nav_title: Materials
description: How glTF materials and textures are cooked, how to replace the game's textures by name, and how to write your own material shader.
order: 4
level: intermediate
---

A model's look comes from its glTF materials and textures, cooked with the model. This page covers the material
features the cook reads, texture formats and limits, replacing the game's textures as a texture pack, and
hand-written material shaders for looks glTF cannot describe.

## Quick start

Most of the time you do nothing special: give your model ordinary glTF materials in your 3D tool, embed or place
the textures beside it, and export.

```text
layers/
  base/
    assets/
      ring.glb                     materials and textures inside the .glb
    textures/
      <model>/<texture>.png        one of the game's textures, replaced by name
```

```lumascript
actor.attach(MarioAccess::getPlayerActor(), model "ring", joint: "HandR")   // drawn with its own materials
```

## What the cook reads from a glTF material

| glTF                                                          | What it does                                                                                                           |
| ------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------- |
| `pbrMetallicRoughness.baseColorFactor` and `baseColorTexture` | The base colour                                                                                                        |
| `extras.nebula.textures` (an array)                           | Extra texture layers multiplied over the base colour                                                                   |
| `alphaMode` `BLEND`, or `MASK` with `alphaCutoff`             | See-through and cut-out materials                                                                                      |
| `doubleSided`                                                 | Drawn from both sides                                                                                                  |
| `KHR_texture_transform`                                       | Moves, scales and turns a texture. Scales must be even in X and Y (unequal is `Cook.Model.UnevenTransform` {material}) |
| `KHR_animation_pointer`                                       | Animates the texture transform and colours (see [Animation](content/animation.md))                                     |
| A normal map                                                  | Tangents are read from the mesh's `TANGENT`, or computed with MikkTSpace                                               |
| Vertex colours (`COLOR_0`)                                    | Multiply the base colour factor                                                                                        |

Each glTF primitive gets its own material; primitives that share a glTF material share the cooked one.

> [!NOTE]
> Colours are display-encoded (sRGB), 0 to 1, as the game's own colours are. Vertex colours are written in the
> game's 8-bit colour space, as its own vertex colours are.

## Textures

- **Formats**: PNG or JPEG, embedded in the glTF or as files beside it.
- Each image is cooked once, with generated mip levels. Grey images are stored as one channel, grey with alpha as
  two, the rest as RGBA.
- **Limits**: at most 16384 pixels a side; at most 240 images or coordinate sets in one material. Each is refused by
  name (L804), never cut.
- A missing or unreadable image is drawn as the texture placeholder, a 64 x 64 magenta and black checker, and the
  mod log names it (`Content.MissingTexture`, 622).

## Replacing the game's textures

To change how a game model looks without touching its shape, replace its textures by name in a layer's
`textures/` folder. This works like a texture pack:

```text
layers/
  base/
    textures/
      <model>/<texture>.png       a game texture, by its model and texture name
      <model>/<texture>.dds       a DDS keeps its own mip levels
      tex1_....png                Dolphin's texture names work too
```

- Names are the game's `<model>/<texture>.png` (or `.dds`), or Dolphin's `tex1_...` names, which the game matches
  to the player's game once, at install.
- Anything else in `textures/` is refused (L306).
- A texture of **your own** model goes inside the model's file or in `assets/`, not here.
- A published Dolphin texture pack can be turned into a mod with [`lumalink convert`](lumalink/convert.md), which
  puts it in `textures/`.

## Hand-written material shaders

When glTF's materials cannot make the look you want (scrolling stripes, a glow that pulses, a custom fresnel), you
can write the material's surface yourself in HLSL. The game still lights it: your code fills in the surface, and the
game's own lighting, shadows, fog and reflections use the result.

### Quick start

```text
layers/
  base/
    assets/
      stripes.hlsl
      stripes.shader.json
      cube.glb                  a material in it picks "stripes"
```

```json
{
  "stage": "material",
  "params": [{ "name": "speed", "type": "float", "default": 1 }],
  "textures": [{ "slot": 0, "name": "paint" }],
  "reads": ["time"]
}
```

```c
// stripes.hlsl: parameters and textures are named as in stripes.shader.json
void surface(in SurfaceIn i, inout Surface s)
{
    float band = frac(i.uv0.x * 8.0 + i.time * speed);
    s.base = paint(i.uv0) * (band < 0.5 ? 0.5 : 1.0);
}
```

In the glTF, the material picks the shader and gives its values:

```json
"materials": [ {
  "name": "Stripes",
  "extras": { "nebula": {
    "shader": "stripes",
    "params": { "speed": 2 },
    "textures": { "paint": 0 }
  } }
} ]
```

### The shader description

`<name>.shader.json` beside `<name>.hlsl`, both in `assets/`:

| Key        | Meaning                                                                                |
| ---------- | -------------------------------------------------------------------------------------- |
| `stage`    | `material`                                                                             |
| `params`   | A list of `{name, type, default}`; `type` is `float` or `float4`                       |
| `textures` | A list of `{slot, name}`; `slot` 0 to 7                                                |
| `reads`    | Which extra inputs the shader reads: any of `normal`, `world_position`, `view`, `time` |

`<name>` is parts of letters, digits, `_` and `-`, joined by `/`. The cook looks for the files from the glTF's folder
up to the folder holding `luma.json`, in the first layer (by name order) whose `assets/<name>.shader.json` exists.

### Picking a shader in glTF

| glTF material extras     | Meaning                                                                                             |
| ------------------------ | --------------------------------------------------------------------------------------------------- |
| `extras.nebula.shader`   | The shader's name: its `assets/` path without the ending                                            |
| `extras.nebula.params`   | `{name: value}` for this material. A parameter not given takes the description's `default`          |
| `extras.nebula.textures` | `{name: glTF texture index}` for each texture the shader declares. A missing one is refused by name |

With a shader, `extras.nebula.textures` is this object. Without one, it stays the array of extra layers described
above.

### What your function sees

The HLSL defines one function:

```c
void surface(in SurfaceIn i, inout Surface s)
```

**`SurfaceIn i`**:

| Field            | Meaning                                                                  |
| ---------------- | ------------------------------------------------------------------------ |
| `uv0`, `uv1`     | The mesh's `TEXCOORD_0` and `TEXCOORD_1` (0 where the mesh has none)     |
| `color`          | The mesh's `COLOR_0`                                                     |
| `normal`         | Only with `reads: normal`. Eye space, unit length                        |
| `world_position` | Only with `reads: world_position`. In game units                         |
| `view`           | Only with `reads: view`. Eye space, unit length, pointing toward the eye |
| `time`           | Only with `reads: time`                                                  |

Reading a field you did not list in `reads` is a compile error at its line.

**Parameters** are globals of their own names (a `float` parameter `speed` is `static float speed;`, a `float4`
parameter `tint` is `static float4 tint;`), set before `surface` runs. A texture `paint` gives two functions: `float4 paint(float2 uv)` and `float4 paint_level(float2 uv, float lod)`.

**`Surface s`** starts as the glTF material would draw:

| Field                | Starts as                                                                      |
| -------------------- | ------------------------------------------------------------------------------ |
| `base`, `alpha`      | The glTF base colour: the factor, times `COLOR_0` with vertex colours          |
| `normal`             | The interpolated normal, turned by the glTF normal map if the material has one |
| `roughness`, `metal` | The factors, times the metal-roughness map                                     |
| `emission`           | The emissive factor                                                            |

The glTF base colour map and emissive map are **not** sampled for a shader material: your shader samples what it
declares. Colours are display-encoded (sRGB), 0 to 1.

**Order.** `surface()` runs first. Its normal is used by every light, highlight and reflection. Then the lights are
summed, `base` and `alpha` are lit with your `metal` and `roughness` and the material's occlusion map, then
`emission` is added, then the material's alpha test and fog. Shadow and mask passes keep the material's own stages.

### Parameter places and ranges

Parameters are stored in the material's own colour registers, so there are only a few, and their values have a
range:

- Each parameter, in `params` order, takes the next free place. A material's own vertex colours and glow use some
  places first.
- Register places hold **-4 to 4**; constant-colour places hold **0 to 1**. Values are stored in 255ths, so expect
  that precision.
- A `float` uses the place's first value and leaves the other three at 0.
- More parameters than free places is `Cook.Shader.TooManyParams`. A value outside its place's range is
  `Cook.Shader.ParamRange`.

### What a shader may not use

The cook refuses (`Cook.Shader.Forbidden`, with the line and the word): `register`, `cbuffer`, `tbuffer`,
`ConstantBuffer`, any `Texture`, `RWTexture`, sampler or `Buffer` type, `groupshared`, `globallycoherent`,
`#include`, `#pragma`, `#line`, and `[[`. Declare textures and parameters in the description instead.

### Checks and messages

`lumalink check` compiles each shader material with the DirectX shader compiler (dxc): the one named by the
`NEBULA_DXC` environment variable, else `dxc/dxc.exe` beside LumaLink's or the game's folder. An error in your code
is reported at its line in `assets/<name>.hlsl`. With no compiler found, a Note (`Cook.Shader.NotCompiled`) names
each shader that was not compiled. The game builds the shader for the player's renderer when it cooks the mod.

Every refusal is **L804**, naming the material or the file:

| Reason                                                                                                     | When                                            |
| ---------------------------------------------------------------------------------------------------------- | ----------------------------------------------- |
| `Cook.Shader.Name`, `Cook.Shader.Missing`                                                                  | A bad shader name, or its files are missing     |
| `Cook.Shader.Json`                                                                                         | The description has a key outside the form      |
| `Cook.Shader.Twice`                                                                                        | A name given twice                              |
| `Cook.Shader.TooLarge`                                                                                     | The HLSL is over 64 KiB                         |
| `Cook.Shader.Text`                                                                                         | The HLSL is not UTF-8                           |
| `Cook.Shader.Forbidden`                                                                                    | A forbidden word (line and word named)          |
| `Cook.Shader.NoSurface`                                                                                    | No `surface()` function                         |
| `Cook.Shader.ParamType`, `Cook.Shader.UnknownParam`, `Cook.Shader.NoTexture`, `Cook.Shader.UnknownTexture` | The material and the description disagree       |
| `Cook.Shader.TooManyParams`                                                                                | More parameters than free places                |
| `Cook.Shader.ParamRange`                                                                                   | A value outside its place's range               |
| `Cook.Shader.Unlit`                                                                                        | The material is `KHR_materials_unlit`           |
| `Cook.Shader.Compile` {file, line, detail}                                                                 | The compiler's first error in your code         |
| `Cook.Shader.CompileProgram`                                                                               | An error in the generated part around your code |
| `Cook.Shader.Compiler`                                                                                     | The compiler did not start                      |

A material whose program is missing at load is drawn plainly with its base colour, and the mod log says so
(`Content.MissingProgram`, 628).

> [!PLANNED]
> Not built yet: Vulkan and Metal output and the ray-traced form of hand-written shaders, and post-processing
> shaders.

### Changing a parameter while the game runs

On a model your mod attached with [`content.model`](content/models.md#run-time-the-content-model-service), version
1.1 adds `set_param(model, material, param, rgba)`. It writes the parameter on the attached model's own copy of the
material, held to the place's range. The value lasts until you set it again or a clip that moves that colour plays.

| Result                       | When                                                                      |
| ---------------------------- | ------------------------------------------------------------------------- |
| `Content.MissingParam` (671) | The material or parameter is not in the model, or the model shows nothing |
| Handle error                 | The model handle has ended                                                |
| Argument error               | A missing argument or a NaN value                                         |

## See also

- [Models](content/models.md)
- [Animation](content/animation.md)
- [Content overview](content/overview.md)
- [`lumalink check`](lumalink/check.md), [`lumalink convert`](lumalink/convert.md)
- [Install the tools](start/install.md)
