---
title: "Filtering Unions in TypeScript"
excerpt: "A short post on how to extract specific values from a union."
date: "2023-03-18T20:00:00.000Z"
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

What if I want a new type, `Breakfast`, which is a union of all the names of cakes with a `sugarLevel` of `"high"`?

```typescript
type Breakfast = "Strawberry shortcake" | "Rainbow cake";
```

Without having to manually type out all the names which fit the criteria, we can achieve this by extracting the values from the `Cake` type:

```typescript
type Breakfast = {
    [CakeDescription in Cake as CakeDescription["name"]]: CakeDescription["sugarLevel"] extends "high"
        ? CakeDescription["name"]
        : never;
}[Cake["name"]];

// gives Breakfast = "Strawberry shortcake" | "Rainbow cake"
```

That bit of Typescript looks intimidating, so let's breakdown what happens:

1. We first want to extract all the _names_ of `Cake`. As every object in the `Cake` union has a `name` property, we can get a union of all the names using `Cake['name']`.
2. We need to iterate over all the `Cake` objects. The only way I know of achieving this is by creating a new object and using the `in` operator. A simple example of this is:

```typescript
type PersonFields = "name" | "age" | "birthday";

type Person = {
    [Field in PersonFields]: string;
};
```

`Person` above is equivalent to:

```typescript
type Person = { name: string; age: string; birthday: string };
// this can also be written as Record<"name"|"age"|"birthday", string>
```

3. If we try to do the same thing with `Cake`, we come to a problem:

```typescript
// this will not work!
type CakeObject = {
    [CakeDescription in Cake]: string;
};
```

> Type 'Cake' is not assignable to type 'string | number | symbol'.

The reason you get an error, is that `CakeDescription` is an object of type `Cake`, and properties of objects need to be either strings, numbers or Symbols.

This is where the `as` operator comes into play. We use it do some transformation of the current value (i.e. `CakeDescription`) in the interation:

```typescript
type CakeObject = {
    [CakeDescription in Cake as CakeDescription["name"]]: string;
};
```

We simply accessed the `name` property in `CakeDescription`. This results in the equivalent type:

```typescript
type CakeObject = Record<
    | "Strawberry shortcake"
    | "Rainbow cake"
    | "Nutella cheesecake"
    | "Fairy cupcake",
    string
>;
```

4. So far, every field in `CakeObject` has a value type of `string`. We need this to be the actual name of the cake we're currently iterating over. This can be done easily enough, as the value portion (the part after `:`) still has access to `CakeDescription`:

```typescript
type CakeObject = {
    [CakeDescription in Cake as CakeDescription["name"]]: CakeDescription["name"];
};
```

Which is equivalent to:

```typescript
type CakeObject = {
    "Strawberry shortcake": "Strawberry shortcake";
    "Rainbow cake": "Rainbow cake";
    "Nutella cheesecake": "Nutella cheesecake";
    "Fairy cupcake": "Fairy cupcake";
};
```

5. However, we are only interested in `Cake`s with a `sugarLevel` of `"high"`. We introduce a condition using the `extends` operator, and return the name of the cake only if its `sugarLevel` is `"high"`, and `never` if it isn't:

```typescript
type CakeObject = {
    [CakeDescription in Cake as CakeDescription["name"]]: CakeDescription["sugarLevel"] extends "high"
        ? CakeDescription["name"]
        : never;
};
```

Which is equivalent to:

```typescript
type CakeObject = {
    "Strawberry shortcake": "Strawberry shortcake";
    "Rainbow cake": "Rainbow cake";
    "Nutella cheesecake": never;
    "Fairy cupcake": never;
};
```

`never` is kind of like the opposite of `any`. It represents impossible types and Typescript doesn't allow you to perform any operation on them.

6. The final step is to get all the values of `CakeObject`. We can do this by passing in the union of all its keys as the index:

```typescript
type CakeObject = {
    [CakeDescription in Cake as CakeDescription["name"]]: CakeDescription["sugarLevel"] extends "high"
        ? CakeDescription["name"]
        : never;
};

type Breakfast = CakeObject[keyof CakeObject];
```

All the `never` types are removed from the resulting union, giving `"Strawberry shortcake" | "Rainbow cake"`!

We could also have written it as:

```typescript
type Breakfast = CakeObject[Cake["name"]];
```

As the keys of `CakeObject` are all the `name` values of `Cake`.

Knowing this, we can achieve extract the new type in one step as:

```typescript
type Breakfast = {
    [CakeDescription in Cake as CakeDescription["name"]]: CakeDescription["sugarLevel"] extends "high"
        ? CakeDescription["name"]
        : never;
}[Cake["name"]];
```
