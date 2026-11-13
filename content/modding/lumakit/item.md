---
title: 'LumaKit: item'
nav_title: item
description: Things the player picks up - placed in stages by name or spawned from code, floating, in bubbles or crystals - and an inventory of carried items kept with the save file.
order: 5
level: essential
---

`kit.item` makes things the player picks up: a power-up flower, a pile of coins, a key, a heart. An item has a look, a shine and a pickup sound, and says what it gives: a form, coins, star bits, lives, health, a place in the player's inventory, or a call to your own code. Items are placed in stages by name like the game's own objects, or spawned from code, and can sit in a bubble or a crystal.

## Example

From the [Gold Flower tutorial](tutorials/a-new-power-up.md): an item that gives a form, placeable in a stage as `GoldFlower`.

```lumascript source/main.lum
use kit.player.form
use kit.item

pub let gold = form.define(form.Form { id: "gold", look: model "GoldMario" })

let flower = item.define(item.Item {
    id: "GoldFlower"                         // placeable in a stage by this name, and given by code
    look: model "GoldFlower"
    shine: effect "GoldFlowerShine"
    sound_get: sound "GetGold"
    gives: item.Gives.Form(gold)
})
```

An item carried in the inventory, and used up later:

```lumascript
let key = item.define(item.Item {
    id: "SilverKey"
    look: model "SilverKey"
    container: item.Container.Bubble         // floats in a bubble until popped
    gives: item.Gives.Carry(1)               // one into the inventory
})

fn try_door() {
    if key.use_one() { log "the door opens" } else { log "you need a key ({key.carried()} carried)" }
}
```

## Using it

Add LumaKit to your mod's `needs` in `luma.json` and `use` the module:

```json
"needs": [ { "id": "lumakit", "version": "^1" } ]
```

```lumascript
use kit.item
```

Items are game actors derived from `LiveActor`; the module uses the game's own coin, star bit and life calls for what they give, model, effect and sound content for their look, and the [save service](services/save.md) to keep the inventory with each save file. It needs no permission.

> [!PLANNED]
> Not every LumaKit call can be made from a mod yet. See [What works today](lumakit/overview.md#what-works-today).

## Interface

```lumascript
pub struct Item {
    id: text                                  // placeable as "<id>" in its mod's stages, "<mod id>/<id>" elsewhere
    look: model
    shine: effect? = none
    sound_get: sound? = none
    gives: Gives
    container: Container = Container.None
    floats: bool = true                       // hovers and turns, as the game's power-ups
    respawns: bool = false
}
pub enum Gives { Form(form.FormId), Coins(u32), StarBits(u32), Lives(u32), Health(u32), Carry(u32),
                 Call(fn(MarioActor)) }        // Carry: n into the inventory under the item's id
pub enum Container { None, Bubble, Crystal }
pub struct ItemId { fn spawn(self, at: vec3) -> LiveActor; fn give(self); fn carried(self) -> u32;
                    fn use_one(self) -> bool }
pub fn define(i: Item) -> ItemId
pub fn find(id: text) -> ItemId?
pub fn carried_all() -> list<(ItemId, u32)>  // the inventory, in the order first carried
```

## Functions

| Name            | Description                                                                                                                                                   |
| --------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `define(i)`     | Defines an item for your mod and returns its `ItemId`. From then on, stages can place it by name.                                                             |
| `find(id)`      | The item your mod defined in `kit/item/<id>.json`, or `none`.                                                                                                 |
| `carried_all()` | The whole inventory: each carried item with its count, in the order each was first carried. Useful for an item wheel ([ui.kit](lumakit/ui-kit.md)'s `Wheel`). |

### ItemId

| Name        | Description                                                                      |
| ----------- | -------------------------------------------------------------------------------- |
| `spawn(at)` | Makes one of these items in the stage now, at the position `at`, and returns it. |
| `give()`    | Gives the item to the player directly, as if picked up.                          |
| `carried()` | How many of this item the player carries (for `Gives.Carry`).                    |
| `use_one()` | Takes one from the inventory. Returns `false` if there was none.                 |

## Types

### Item

| Field       | Description                                                                                                      |
| ----------- | ---------------------------------------------------------------------------------------------------------------- |
| `id`        | Unique within your mod. Stages of your own mod place it as `<id>`; any other stage places it as `<mod id>/<id>`. |
| `look`      | Its model.                                                                                                       |
| `shine`     | An effect kept on it, or `none`.                                                                                 |
| `sound_get` | The sound played when it is picked up, or `none`.                                                                |
| `gives`     | What it gives the player (see below).                                                                            |
| `container` | `None`, `Bubble` or `Crystal`: what it sits in until freed. Default `None`.                                      |
| `floats`    | Hovers and turns, as the game's power-ups do. Default `true`.                                                    |
| `respawns`  | Comes back after being picked up. Default `false`.                                                               |

### Gives

`item.Gives` is the one way LumaKit says what something gives the player. Actors' `drops`, shop wares and `progress.StarGet.Instead` use it too.

| Case          | What the player gets                                                                                                    |
| ------------- | ----------------------------------------------------------------------------------------------------------------------- |
| `Form(f)`     | The form `f` (from [player.form](lumakit/player-form.md)).                                                              |
| `Coins(n)`    | `n` coins, as the game's own coins: with their healing, their 1-up steps and the game's coin event (`MR::incCoin`).     |
| `StarBits(n)` | `n` star bits (`MR::addStarPiece`): added to the stocked count in the observatory, and to the galaxy's count elsewhere. |
| `Lives(n)`    | `n` extra lives.                                                                                                        |
| `Health(n)`   | `n` health, with the game's heal sound (`MR::incPlayerLife`).                                                           |
| `Carry(n)`    | `n` of this item into the inventory, under the item's id.                                                               |
| `Call(f)`     | Calls your function `f` with the player.                                                                                |

## Data files

An item can be written as `kit/item/<id>.json`. Declare the data format in `luma.json` with `"kit": { "lumakit.item": 1 }`, and look the item up in code with `find`.

## Behaviour and edge cases

- **Inventory and saves.** The inventory is kept per save file, so carried items survive saving and reloading.
- **Names never clash.** Two mods may both define an item called `Key`; the game knows them as `<mod id>/Key`.
- **Your mod switched off.** Items of your mod that are in the stage are removed. A stage that places an item of a mod that is off does not make it; the stage loads without it, and the log names the item, the stage and the mod.
- **Forms and items.** `player.form`'s `Form.item` and `item.Gives.Form` refer to each other; both live in LumaKit, so you can define the form first and the item that gives it next, as in the example.

## See also

- [player.form](lumakit/player-form.md)
- [shop](lumakit/shop.md): selling items
- [actor](lumakit/actor.md): what defeated enemies drop
- [ui.kit](lumakit/ui-kit.md): an item wheel
- [Tutorial: a new power-up](tutorials/a-new-power-up.md)
- [Save service](services/save.md)
