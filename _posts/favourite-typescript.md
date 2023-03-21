---
title: "Useful Advanced Typescript Features"
excerpt: "Some advanced TypeScript patterns and features that I find useful."
date: "2022-10-01T20:00:00.000Z"
publish: true
author:
    name: Jithya Nanayakkara
---

This post covers a small collection of features and patterns I've found useful when working on TypeScript projects. Do note, what I've written is somewhat advanced, and isn't particularly useful for beginners.

## Creating type safe utility functions

There are times when certain libraries or APIs don't have great type definitions, or unexpected types.
For example, you may have experienced the unpleasant suprise when `Object.keys` returns a `string[]` rather than the actual keys of the object ([and this is the intended behaviour by the TypeScript authors](https://github.com/Microsoft/TypeScript/issues/12870)).

When you do come across this situation, don't shy away from creating utility functions whose sole purpose is to get better types.
For the `Object.keys` problem, I always create a type safe `Object.keys` helper in my TypeScript projects, like this:

```jsx
function getObjectKeys<Object extends Record<string, any>>(
  obj: Object
): Array<keyof Object> {
  return Object.keys(obj);
}
```

## Conditional types

Conditional types essentially allow you to check if a type `A`, is equal to, or is a subset of another type `B`.
You use it in the form `A extends B ? <true-expression> : <false-expression>`.

One example of where I use this, is when I create a `DeepPartial` utility type - the inbuilt `Partial` type only
makes the fields at the first level of an object optional, however `DeepPartial` makes every field at every level of the object optional:

```jsx
type DeepPartial<Object extends Record<string, any>> = {
  [Property in keyof Object]?:
    Object[Property] extends Record<string, any>
      ? DeepPartial<Object[Property]>
      : Object[Property];
};

interface Person {
    name: {
      first: string
      last: string;
    }
    age: number
}
type PartialPerson = DeepPartial<Person>;

// Results in:
{
  name?: {
    first?: string
    last?: string;
  }
  age?: number
}
```

1. DeepPartial takes in a Generic parameter, `Object`, and we constrain it to be a plain JS object
2. We extract the keys in `Object` using: `keyof Object`
3. We then iterate over every key using the operator `in`, and assign the key to the variable `Property`
4. We add a new field to the resulting object with an optional field: `[Property]?`
5. We check if the value at `Object[Property]` is another object using: `Object[Property] extends Record<string, any> ?`
6. If it is an object, we recursively call `DeepPartial` on it
7. Else, we just return the value at `Object[Property]`

### Validation messages

Another place where I use conditional types, is to provide custom validation messages to arguments of a function.

> I don't recommend you add this complexity to your application code, but this could be useful if you maintain a library.

```jsx
type Validate<
  Arg,
  ExpectedType,
  ErrorMsg extends string
> = Arg extends ExpectedType ? Arg : ErrorMsg;

function sendMessage<Arg>(
  message: Validate<Arg, string, "The message must be of type 'string'">
) {}

// This won't compile!
// Validate will return the specific type literal:
//  "The message must be of type 'string'"
sendMessage(1);

// compiles without issues:
sendMessage("hello");
```

## Renaming Fields of an Object

Let's say you want to create a new object, whose keys are the same as another object, but _in uppercase_.
You can use the `as` keyword when iterating over fields using `in`, to rename the existing fields:

```jsx
const some_constants = {
  max_age: 100,
  minimum_age: 0,
  country_of_residence: "AU"
};

type SomeConstantsInUppercase = {
  [Property in keyof typeof some_constants as Uppercase<Property>]: typeof some_constants[Property];
}

// results in:
{
  MAX_AGE: 100,
  MINIMUM_AGE: 0,
  COUNTRY_OF_RESIDENCE: "AU"
}
```

Note: `Uppercase` is another inbuilt TypeScript utility.

## Using `infer`

`infer` is something I confess to not understand very well. However I have found it useful when creating more complex types
and I find looking at some examples helpful in understanding how to use it.

`infer` is used with conditional types in order to extract types in the condition and assign it to another generic variable.
The golden rule to remember when using `infer` is:

> `infer` can only be used in the `extends` clause of a _conditional_ type.

Here's an example where I convert a string from `kebab-case` to `snake_case`:

```jsx
type KebabToSnakeCase<S extends string> = S extends `${infer Char}${infer Rest}`
  ? Char extends "-"
    ? `_${KebabToSnakeCase<Rest>}`
    : `${Char}${KebabToSnakeCase<Rest>}`
  : S;

type Result = KebabToSnakeCase<"convert-this-kebab-case-to-snake-case">;

// Gives: "convert_this_kebab_case_to_snake_case"
```

What the following line:

```jsx
S extends `${infer Char}${infer Rest}`
```

does is that it checks if the generic `S` is a string that is of the template `${Char}${Rest}` - `Char` and `Rest` are named
generic variables, and TypeScript will figure out what they are. If the string _does conform_ to it, `Char` will be the
first character of a string, while `Rest` will be the remaining characters in the string.

Here's another example where I extract the value from an object, given the dot-separated path - just like in Lodash's `get` utility:

```jsx
type ExtractTypeFromPath<
  Path extends string,
  Object extends Record<string, any>
> = Path extends `${infer Property}.${infer RestOfPath}`
  ? ExtractTypeFromPath<RestOfPath, Object[Property]>
  : Object[Path];

interface Person {
  data: {
    firstName: string;
    lastName: string;
    sensitive: {
      age: number;
    };
  };
}
// Results in number
type TypeOfAge = ExtractTypeFromPath<"data.sensitive.age", Person>;
```

## Dynamically inferring types from JavaScript

In the examples so far, we've been dealing exclusively with types - which have no
impact on the actual execution of our app - after all, the compiler just strips out
all the type definitions.

However, one of the most useful patterns I've found is to derive types from
actual JavaScript objects. The trick is to use `as const` to
ensure that the most accurate types would be derived.

For example, if you were to do this:

```jsx
const fieldNames = ["name", "age"];
```

`typeof fieldNames` would give you `string[]`

However, if we did this instead:

```jsx
const fieldNames = ["name", "age"] as const;
```

This would give you `("name" | "age")[]` - which is far more useful. We can then extract the values in the array using:

```jsx
const fieldNames = ["name", "age"] as const;
type FieldName = typeof fieldNames[number];

// results in: FieldName = "name" | "age"
```

A very simplified example of how this can be useful, is when you want to specify in _JavaScript_ what fields a REST API endpoint
should return.

```jsx
const fieldsToFetch = ["first_name", "last_name", "dob", "country"] as const;

async function someRestAPICall<Fields extends typeof fieldsToFetch>(
    fields: Fields
): Promise<{ [Property in Fields[number]]: string }> {
  // call endpoint and return JSON data
}

const response = await someRestAPICall(fieldsToFetch);

// The type of response would be:
{
  first_name: string;
  last_name: string;
  dob: string;
  country: string;
}
```

So if you want to change which fields to request from the REST API, you just update `fieldsToFetch`, and the
response would `automatically` update to the correct type.

For example, if you removed `"last_name"`, and somewhere in the application you referred to `response.last_name`, Typescript will fail to compile with an error!

> Update: As of Typescript 4.9, you can use the `satisfies` operator to enforce additional type safety when defining `as const` objects. Read this article for more info on `satisfies`: https://www.totaltypescript.com/clarifying-the-satisfies-operator
