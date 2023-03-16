---
title: "Filtering Unions in TypeScript"
excerpt: "A small post on how to extract specific values from a union."
date: "2023-03-24T20:00:00.000Z"
publish: true
author:
    name: Jithya Nanayakkara
---

Let's say I have the following Union:

```typescript
type Cake =
    | { name: "Nutella cheesecake"; sugarLevel: "low" }
    | { name: "Fairy cupcake"; sugarLevel: "medium" }
    | { name: "Strawberry shortcake"; sugarLevel: "high" }
    | { name: "Rainbow cake"; sugarLevel: "high" };
```

What if I want a new type, which is a union of all the names of cakes with a `sugarLevel` of `"high"`?

```typescript
type Breakfast = "Strawberry shortcake" | "Rainbow cake";
```

Without having to manually type out all the names which fit the criteria, we can achieve this instead by extracting the values from the `Cake` type:

```typescript
type Breakfast = {
    [CakeDescription in Cake as CakeDescription["name"]]: CakeDescription["sugarLevel"] extends "high"
        ? CakeDescription["name"]
        : never;
}[Cake["name"]];

// gives Breakfast = "Strawberry shortcake" | "Rainbow cake"
```

Let's breakdown what happens:

1. First we need to create a new (temporary) object - that's why the type opens with a `{`. This object is mapping of `Cake["name"]: Cake["name"] | never`. **Note:** `Cake["name"]` gives `"Nutella cheesecake" | "Fairy cupcake" | "Strawberry shortcake" | "Rainbow cake"`
2. We then need to iterate over every value in the `Cake` union type. This is done using the `[value in union]` syntax.
3. Every value we iterate over needs to be converted into a string, by indexing into the Cake object's `"name"` property. This is done using the `as` syntax.
4. The previous step essentially created the key of the new object, now we need to associate it with a value. We still have access to the `Cake` value (I've named it `CakeDescription`) we're iterating over, so we check whether the `"sugarLevel"` equals `"high"` via the `extends` keyword.
5. If it does equal `"high"` we return the name of the Cake, if not we return `never`.
6. At the closing `}`, a new object type is created. We can extract all its values by passing a union of all its keys as the index - we already know the keys, as it's just `Cake["name"]`. Which is why it ends with `}[Cake["name"]];`
