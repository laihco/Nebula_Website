---
title: Referring to game content by name
nav_title: References
description: How the names your mod gives to models, effects, sounds, text and object classes are checked and found, what stands in when one is missing, and the codes you see.
order: 13
level: advanced
---

A **reference** is a name in your mod that must find something: a model, a texture, an effect, a sound, a line of
text, an object class, a file. This page explains when each kind is checked, what you see when one is missing, and
how names made while running behave. The short version: a missing reference never stops the game and never
silently disappears. A visible (or audible) placeholder stands in, and the mod log says exactly what was missing.

## Example

```lumascript
on stage "EggStarGalaxy" {
    let burst = effect "GoldAura"            // checked when you build: a typo is a build error
    let id = MR::getCurrentScenarioNo()
    if let voice = sound_named("voice/{id}") {  // made while running: none if the mod has no such sound
        log "found a voice line"
    }
}
```

## The rule

A reference that does not resolve:

- never stops the game, and the mod stays on;
- is replaced by a **placeholder** of its kind (below);
- gives one Error entry in the mod log naming the mod, the file, the line (or the place in a JSON file), the kind,
  the name, and what was expected.

A reference in your **code** to a game function, field, class or service is different: code bound to nothing cannot
run, so a mod with such a name is refused when it loads (see [Loading](reference/loading.md)). The compiler catches
these first, when you build.

## When names are checked

| Where the name is                                                                     | Checked                                                                                       |
| ------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------- |
| a content literal in code (`model "GoldBall"`, `sound "Throw"`, `text "Timer.Title"`) | when building, against your mod's files; a missing name is a build error                      |
| a name made while running (`sound_named(name)`, `model_named(name)`...)               | not when building; each use is listed in the build report. In play, `none` when there is none |
| a name in content files (a glTF's images, a material, an effect, a placement)         | by the validator when the mod is checked, installed and at each start                         |
| a name in a placement for a class that only code makes                                | after every mod has started, before the title screen                                          |

The validator's start check runs every reference rule at each start, against the game's files and the other mods
installed. So a game update, or the removal of a mod you `need`, that breaks a reference is found then. Nothing is
looked up lazily: by the title screen every content reference of every mod is either found or has its placeholder
decided.

## The kinds

| Kind                                         | Written in                                                             | Found in                                                           |
| -------------------------------------------- | ---------------------------------------------------------------------- | ------------------------------------------------------------------ |
| texture of a model                           | a glTF's images                                                        | your mod's files                                                   |
| texture or program of a material             | a material source, a shader name                                       | your mod's files, the game's programs, your mod's shaders          |
| texture of a particle; an effect's particles | the effects source                                                     | your mod's files, the game's particle textures                     |
| joint                                        | an effect or socket bound to a joint; a character bound by joint names | the model it is bound to                                           |
| animation                                    | an actor's animation by name                                           | the model's archive                                                |
| sound                                        | a sound by name                                                        | the game's sound table, your mod's sounds                          |
| text                                         | a message id (a placement's message, a layout's text)                  | the game's message tables in each language, your mod's added lines |
| object class                                 | a placement row's class name                                           | the game's factory, and classes mods make                          |
| file                                         | a whole file or a patch target                                         | the game's files                                                   |
| a name passed at run time                    | service and LumaKit calls taking a name                                | as its kind                                                        |

## Placeholders

| Kind                                | What stands in                                                                        |
| ----------------------------------- | ------------------------------------------------------------------------------------- |
| model (a new object)                | a 100-unit cube with a magenta and black checker and a white "?" on each face         |
| model (replacing one of the game's) | the game's own model                                                                  |
| texture                             | a 64 x 64 magenta and black checker                                                   |
| material program                    | the default lit program with the material's base colour                               |
| particle effect                     | a slow ring of 8 white and magenta sparks, 50 units across                            |
| particle texture                    | the checker texture                                                                   |
| joint                               | the model's root joint                                                                |
| animation                           | the bind pose (a new actor), or the game's own animation of that name (a replacement) |
| sound                               | a soft two-note chime, 120 ms long                                                    |
| text                                | the literal `[<mod>:<id>]` in the game's message font                                 |
| object class                        | the placeholder cube at the placement's position, with no behaviour and no collision  |

Placeholders are the game's own data, so a placeholder can never itself be missing. Each one stands for one
reference, and costs only what the thing it stands for would.

## Names made while running

A service or LumaKit call that takes a name (playing a sound by name, starting an effect by name, drawing a model by
name) and does not find it:

- gives the placeholder and goes on, so your code keeps working and the placeholder shows; and
- reports the missing name with **your** file and line, once per place in your code.

LumaScript's own lookups (`sound_named`, `model_named` and the others) give `none` instead, so you can decide what to
do:

```lumascript
if let s = sound_named("voice/{id}") {
    // play it
} else {
    // no voice line for this message: carry on silently
}
```

## Codes

These are the mod log's content codes for references found missing while the game runs. The validator gives the same
faults with its `L6xx`/`L9xx` codes when it finds them earlier, in the same words; see
[Error codes](reference/error-codes.md).

| Code | Message                                                                                                  |
| ---- | -------------------------------------------------------------------------------------------------------- |
| 620  | `{mod}: {file} places "{found}", which no mod made; a placeholder stands there.`                         |
| 621  | `{mod}: there is no model "{found}"; a placeholder is drawn instead.`                                    |
| 622  | `{mod}: there is no texture "{found}"; a checker is drawn instead.`                                      |
| 623  | `{mod}: there is no effect "{found}"; placeholder sparks are shown instead.`                             |
| 624  | `{mod}: there is no sound "{found}"; a chime plays instead.`                                             |
| 625  | `{mod}: there is no text "{found}".`                                                                     |
| 626  | `{mod}: {model} has no joint "{found}"; its root is used.`                                               |
| 627  | `{mod}: {model} has no animation "{found}".`                                                             |
| 628  | `{mod}: the material "{found}" has no program for {renderer}; it is drawn plainly.`                      |
| 670  | `{mod}: the event "{found}" of {clip} is at frame {frame}, after its last frame {last}; it never comes.` |
| 671  | `{mod}: the material "{material}" of {model} has no shader parameter "{found}".`                         |
| 672  | `{mod}: the font {found} is not there or cannot be read; the message font is used instead.`              |

Codes 640 to 669 belong to effects; see [Effects](content/effects.md).

## No mod, no cost

With no mod on, no reference is read and no placeholder is loaded.

## See also

- [Lifecycle, options and frames: content by name](lumascript/events.md#content-by-name)
- [Content overview](content/overview.md)
- [The mod log](reference/mod-log.md)
- [Error codes](reference/error-codes.md)
- [The validator](reference/validator.md)
