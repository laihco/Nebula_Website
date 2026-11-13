---
title: 'LumaKit: shop'
nav_title: shop
description: A shop screen where the player buys wares with coins or star bits, with stock kept per save file and an optional shopkeeper.
order: 16
level: intermediate
---

`kit.shop` opens a shop: a list of wares with prices, paid in coins or star bits. Each ware gives what an item can give (lives, health, star bits, a form, a place in the inventory), can have limited stock that is remembered per save file, and the shop can have a shopkeeper who speaks. You `wait` on the shop and learn what, if anything, was bought.

## Example

A star bit shop opened by a shopkeeper, built from the module's documented calls:

```lumascript source/main.lum
use kit.shop
use kit.item

task open_shop(keeper: ref<LiveActor>) {
    let bought = wait shop.open(shop.Shop {
        title: text "Shop.Title"
        currency: shop.Currency.StarBits
        keeper: keeper
        wares: [ shop.Ware { name: text "Shop.Life", price: 50, gives: item.Gives.Lives(1) },
                 shop.Ware { name: text "Shop.Heal", price: 30, gives: item.Gives.Health(3) },
                 shop.Ware { name: text "Shop.Flower", price: 200, gives: item.Gives.Form(gold), stock: 1 } ]
    })
    if let w = bought { log "bought {w.name}" } else { log "left without buying" }
}
```

Here `gold` is a form defined with [player.form](lumakit/player-form.md), and `keeper` comes from an actor's `on_talk` (see [actor](lumakit/actor.md)).

## Using it

Add LumaKit to your mod's `needs` in `luma.json` and `use` the module:

```json
"needs": [ { "id": "lumakit", "version": "^1" } ]
```

```lumascript
use kit.shop
```

The shop is a [screen](lumakit/screen.md); wares give through [item](lumakit/item.md)'s `Gives`, the keeper speaks through [talk](lumakit/talk.md), and stock is kept with the [save service](services/save.md). Prices are taken with the game's own coin and star bit counters. The module needs no permission.

> [!PLANNED]
> Not every LumaKit call can be made from a mod yet. See [What works today](lumakit/overview.md#what-works-today).

## Interface

```lumascript
pub enum Currency { Coins, StarBits }
pub struct Ware { name: text, price: u32, gives: item.Gives, stock: u32? = none }
pub struct Shop { title: text, wares: list<Ware>, currency: Currency, keeper: ref<LiveActor>? = none }
pub fn open(s: Shop) -> pending<Ware?>      // none: left without buying
```

## Functions

| Name      | Description                                                                                |
| --------- | ------------------------------------------------------------------------------------------ |
| `open(s)` | Opens the shop. `wait` gives the ware bought, or `none` if the player left without buying. |

## Types

### Shop

| Field      | Description                               |
| ---------- | ----------------------------------------- |
| `title`    | The shop's title.                         |
| `wares`    | What it sells, in order.                  |
| `currency` | `Currency.Coins` or `Currency.StarBits`.  |
| `keeper`   | A shopkeeper actor who speaks, or `none`. |

### Ware

| Field   | Description                                                                 |
| ------- | --------------------------------------------------------------------------- |
| `name`  | The ware's name, shown in the list.                                         |
| `price` | Its price in the shop's currency.                                           |
| `gives` | What the player gets, as an [`item.Gives`](lumakit/item.md).                |
| `stock` | How many can be bought, kept per save file. `none` (the default): no limit. |

## Data files

A shop can be written as `kit/shop/<id>.json`. Declare the data format in `luma.json` with `"kit": { "lumakit.shop": 1 }`.

## Behaviour and edge cases

- **Too poor.** The price is checked against what the player has before anything is taken; a player who cannot pay does not buy.
- **Out of stock.** A ware whose stock is used up cannot be bought. Stock is remembered per save file, across reloads.
- **Paying with coins.** Coins are taken without the side effects of collecting them: buying never heals the player, never gives a 1-up, and does not count against the coins-collected statistic.
- **Paying with star bits.** Star bits are spent as the game spends them. In the observatory they come from the stocked count.
- **No coins in the observatory.** Coins exist only in a galaxy. A coin shop opened in the observatory (the hub) returns `none` at once and raises a script error at your line: `kit.shop.open: currency is Coins; it must be StarBits where MR::isStageAstroLocation()`. Use star bits for shops in the hub.
- **Your mod switched off.** A shop it opened is closed.

## See also

- [item](lumakit/item.md): `Gives`
- [screen](lumakit/screen.md)
- [talk](lumakit/talk.md): the keeper's lines
- [actor](lumakit/actor.md): a shopkeeper
- [Save service](services/save.md)
