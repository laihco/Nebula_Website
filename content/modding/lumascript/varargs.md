---
title: Game functions with variable argument lists
nav_title: Varargs
description: Why some game functions (printf-style ones, those taking a va_list, constexpr ones) cannot be called or hooked from LumaScript, and how to reach their behaviour instead.
order: 15
level: advanced
---

A few of the game's functions take a variable number of arguments (`...`, like `printf`), take a `va_list`, or are
`constexpr`. They cannot be called or hooked like other functions. This page explains what you can do with each kind,
and where the behaviour you want is usually reached instead.

## In short

| Kind of function                                       | From LumaScript                                 | Hooks                                                     |
| ------------------------------------------------------ | ----------------------------------------------- | --------------------------------------------------------- |
| variable arguments: `R f(P..., ...)`                   | not callable (S0090)                            | `before` only, from C; hook its `va_list` sibling instead |
| takes a `va_list`                                      | not callable (a script cannot make a `va_list`) | every kind, from C                                        |
| `constexpr`                                            | callable                                        | none (`Hook.Constexpr`)                                   |
| a template, or the allocator (`operator new`/`delete`) | no row: not callable, not hookable              | none                                                      |

Every other function of the game has a full row: callable and hookable in all four ways.

## Variadic functions and their siblings

A variadic function cannot be called through the game's function table, which cannot pass `...`. But every variadic
function in the game hands its arguments on to a function that takes a `va_list` (its **sibling**), or to another
variadic function that does. The build checks this for every one, so the sibling always exists. For example,
`MR::formatText` hands its arguments to `MR::formatTextV`, and `FormattedName::format` to `FormattedName::vformat`.

So to change what such a function does, hook its sibling. A `wrap` on `FormattedName::vformat` changes every
formatted name, including those made through the variadic callers.

| You try                                                     | You get                                                                               |
| ----------------------------------------------------------- | ------------------------------------------------------------------------------------- |
| an `after`, `wrap` or `replace` hook on a variadic function | refused with `Hook.Variadic`, naming the sibling                                      |
| a call through the variadic function's row                  | refused with `Call.Variadic`, naming the sibling                                      |
| a `before` hook (from C)                                    | allowed: it is told of the call, with the fixed arguments and a `va_list` of the rest |

## Functions taking a va_list

A function with a `va_list` parameter has a full row, but LumaScript cannot make a `va_list`, so a script cannot call
it: the compiler refuses it, naming it. From [C in the same mod](lumascript/compiled-form.md) you can call it with
your own `va_list` and hook it in every way.

> [!WARNING]
> In a C hook, read a `va_list` argument only through a copy made with `LUMA_VA_COPY(mine, args[i])`, never the
> original. Reading the original breaks the function's own read of it, and this cannot be checked for you. A `wrap`
> that proceeds passes it on unread.

The type is spelled `va_list` on every platform in the game's signatures and description, whatever the compiler's
own type is.

## constexpr functions

A `constexpr` function can be called, but not hooked: the compiler evaluates some of its calls while building the
game, so a hook would see only some of them. A hook on one is refused with `Hook.Constexpr`.

## Functions with no row

Templates (there is no one function to name) and the allocation functions (a hook would allocate inside the
allocator) have no row. They are listed with their reason in the game's description; see
[The game's description of itself](lumascript/game-description.md).

## See also

- [Hooks](lumascript/hooks.md)
- [Types across the boundary](lumascript/interop-types.md)
- [What the compiler emits](lumascript/compiled-form.md)
- [Error codes](reference/error-codes.md)
