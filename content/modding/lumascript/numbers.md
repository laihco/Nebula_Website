---
title: Numbers
nav_title: Numbers
description: Integer and float types, how literals get their type, overflow and division by zero, conversions with as and low_bits, limits and the math functions.
order: 12
level: intermediate
---

LumaScript's numbers are the machine's own: fixed-size integers and IEEE floats, the same types the game uses. This
page covers which type a number has, how literals adapt, what happens on overflow, and how to convert between types.

## Example

```lumascript
let lives = 3                        // int (i32)
let small: u8 = 200                  // the literal adapts to u8
let speed = 12.5                     // f32
let precise = 2.0f64                 // f64
let mask = 0b1010 | 0x0F             // int
let big = 1_000_000                  // underscores are for reading

let ratio = lives as f32 / 4.0       // convert before mixing
let byte = low_bits<u8>(300)         // 44: keep the low 8 bits on purpose
let biggest = u32.max
```

## The number types

| Type             | What                                                                 |
| ---------------- | -------------------------------------------------------------------- |
| `i8 i16 i32 i64` | signed integers of 8 to 64 bits                                      |
| `u8 u16 u32 u64` | unsigned integers of 8 to 64 bits                                    |
| `int`            | another name for `i32`                                               |
| `f32`            | a 32-bit float; `float` is another name for it, and it is the game's |
| `f64`            | a 64-bit float                                                       |

The game's own names for these (`s32`, `u16`, `f32`...) are the same types in LumaScript.

## Literals

| Literal             | Examples               |
| ------------------- | ---------------------- |
| decimal             | `12`, `-7`             |
| hexadecimal         | `0x1F`                 |
| binary              | `0b101`                |
| with separators     | `1_000_000`, `0xFF_FF` |
| float               | `1.5`, `1e3`           |
| float with a suffix | `2.0f64`               |

### What type a literal gets

- A literal takes the type its place needs: `let small: u8 = 200`, `x + 1` with `x: u8` is a `u8`, `1.5 * v` is an
  `f32` times a vector.
- An expression of literals only (`1 + 2`, `1 << 4`, `(1 << 4) - 17`) takes its place's number type. With no number
  place it is `int`, or `f32` when one of its literals is a float.
- An integer expression of literals is worked out once and checked to fit, as a whole: `let x: u8 = 200 + 100` is
  error S0050, naming 300.
- A shift with a literal on the left takes the place's integer type, else `int`, never the count's type: `1 << n`
  with `n: u8` is an `int`.
- When choosing between the game's overloads, an integer literal fits `i32` exactly and a float literal fits `f32`
  exactly.

## No implicit conversions

LumaScript never converts between integers and floats, or between sizes, on its own. Only literals adapt. Two values
of different types in one operator are error S0065:

```lumascript
let a: i32 = 5
let b: u8 = 2
let c = a + b as i32                 // fine: written out
let d = a + b                        // S0065
```

## Arithmetic

| Operators         | Integers                                                  | Floats                  |
| ----------------- | --------------------------------------------------------- | ----------------------- |
| `+ - *`           | overflow is a script error (S0904)                        | IEEE                    |
| `/ %`             | division by zero is a script error (S0905)                | IEEE                    |
| `& \| ^`          | bitwise                                                   | -                       |
| `<< >>`           | shift by any integer; the result has the left side's type | -                       |
| `== != < <= > >=` | compare two of one type                                   | compare two of one type |

Both sides of an arithmetic or bitwise operator must be the same type. A script error stops the statement and is
reported once with your file and line (see [Errors](lumascript/errors.md)); the game goes on.

```lumascript
var hp: u8 = 250
hp += 10                             // script error: u8 overflow in hp += 10
```

## Converting with as

`x as T` converts a number to any other number type:

```lumascript
let f = lives as f32
let whole = speed as i64             // a float to an integer type
let count8 = big_count as u8         // a script error if it does not fit (S0908)
```

- A value that does not fit its new type is a script error ("300 does not fit in u8").
- `as` binds tighter than any operator: `a as u32 * b as u32` is `(a as u32) * (b as u32)`.
- `as` also converts a game enum to an integer and back, and your own data-less enum to an integer.

### Keeping the low bits

When you mean to wrap around, say so with `low_bits<T>(n)`: it takes any integer and keeps the low bits of type `T`.

```lumascript
let wrapped = low_bits<u16>(70000)   // 4464
```

## Limits

Each integer type has `.min` and `.max`: `u32.max`, `i16.min`, `u8.max`.

```lumascript
let best = bests.get(key) ?? u32.max
```

## Math functions

Always in scope:

| Call                          | Takes                                       | Gives           |
| ----------------------------- | ------------------------------------------- | --------------- |
| `min(a, b)`, `max(a, b)`      | two numbers of one type                     | that type       |
| `clamp(x, lo, hi)`            | three numbers of one type                   | that type       |
| `abs(x)`                      | a signed integer or a float                 | that type       |
| `sqrt(x)`, `sin(x)`, `cos(x)` | a float (a literal is `f32`)                | that type       |
| `atan2(y, x)`                 | two floats of one type                      | that type       |
| `lerp(a, b, t)`               | two floats (or vectors, or colours) and `t` | the type of `a` |
| `hash32(t)`                   | `text`                                      | `u32`           |

Vectors have `dot`, `cross`, `length` and `normal`; see [Types and values](lumascript/types.md#vectors-quaternions-and-matrices).

## Text and JSON

- Numbers go into text by interpolation: `"{lives} lives"`.
- `text.parse_int()` gives an `i64?` and `text.parse_float()` an `f64?`: `none` when the text is not a number.
- In JSON, integers are written exactly, even past 2^53. A float that is NaN or infinite is a script error when
  written, since JSON has neither. A `json.Value`'s `.int()` is an `i32?` and `.float()` an `f32?`.

## See also

- [Types and values](lumascript/types.md)
- [Errors](lumascript/errors.md)
- [Types across the boundary](lumascript/interop-types.md)
