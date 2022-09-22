---
title: "My Current Favourite TypeScript Tips"
excerpt: "A list of TypeScript patterns and features that I find useful."
date: "2022-10-01T20:00:00.000Z"
publish: true
author:
  name: Jithya Nanayakkara
---

This is a small collection of features and patterns I've found useful when working with TypeScript projects. Do note, what I've written is somewhat advanced, and wouldn't be particularly useful unless you already know your way around TypeScript.

## Creating type safe utility functions

There are times when certain libraries or APIs don't have great type definitions, or unexpected types.
An example of this you may have come across is `Object.keys`, which returns `string[]` rather than the actual keys ([and this is the intended behaviour by the TypeScript authors](https://github.com/Microsoft/TypeScript/issues/12870)).

When you do come across this situation, don't shy away from creating utility functions whose sole purpose is to get better types.
I always create a type safe `Object.keys` helper, and whenever I use the [ImmutableJS](https://immutable-js.com/) library, which has notoriously lousy types, I create separate functions for accessing those objects rather than calling the methods on them directly.

Here's the helper I use for `Object.keys`:

```jsx
function getObjectKeys<Object extends Record<string, any>>(
  obj: Object
): Array<keyof Object> {
  return Object.keys(obj);
}
```

## Conditional types

Conditional types essentially allow you to check if a type `A`, is, or is a subset of another type `B`.
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

1. DeepPartial takes in 1 Generic parameter, `Object`, and we constrain it to be a plain JS object
2. We extract the keys in `Object` using: `keyof Object`
3. We then iterate over every key using the operator `in`, and assign the key to the variable `Property`
4. We add a new field to the resulting object with an optional field: `[Property]?`
5. We check if the value at `Object[Property]` is another object using: `Object[Property] extends Record<string, any> ?`
6. If it is an object, we recursively call `DeepPartial` on it
7. Else, we just return the value at `Object[Property]`

### Validation messages

We can even use conditional types to provide custom validation messages to arguments of a function!

> I don't recommend you add this complexity to your application code, but this would be useful if you maintain a library.

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

Let's say you need to add getter functions to an object, based on the existing fields in it.
You can use the `as` keyword when iterating over fields using `in`, to rename the existing fields:

```jsx
type Getters<Object extends Record<string, any>> = {
  [Property in keyof Object as `get${Capitalize<
    string & Property
  >}`]: () => Object[Property];
};

const person = {
  name: "John",
  age: 18,
};
type PersonAsGetters = Getters<typeof person>;

// results in:
{
  getName: () => string;
  getAge: () => number;
}
```

Note: `Capitalize` is another inbuilt TypeScript utility.

## Using `infer`

You use `infer` with conditional types in order to extract types to another generic variable.
Seeing this in action would help you understand what the above means better.

> Remember, we can only use `infer` in the `extends` clause of a conditional type.

Here's an example where I convert a string from `kebab-case` to `snake_case`:

```jsx
type KebabToSnakeCase<S extends string> = S extends `${infer Char}${infer Rest}`
  ? Char extends "-"
    ? `_${KebabToSnakeCase<Rest>}`
    : `${Char}${KebabToSnakeCase<Rest>}`
  : S;

type Result = KebabToSnakeCase<"convert-this-kebab-case-to-snake-case">;

// results in:
// "convert_this_kebab_case_to_snake_case";
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
actual JavaScript objects. The trick is to use `Readonly` or `as const` to
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

This would give you `("name" | "age")[]` - far more useful. We can then extract the values in the array using:

```jsx
const fieldNames = ["name", "age"] as const;
type FieldName = typeof fieldNames[number];

// results in: FieldName = "name" | "age"
```

Below is an example of a situation where I used this approach. I needed to make a GET request
to a REST API, and I could specify what fields in the data I want returned in the response. I simply
had to pass the field names as query parameters in the URL.

Rather than putting the field names as query parameters in a hard to read URL, I decided to put the fields I want
in an array, then convert the array to the appropriate query parameters.

However, TypeScript types become an issue - how does it know what the response object type is
when it could change depending on what I put in the Javascript array?

This is how I did it:

```jsx
const pickFields = ["age", "name", "height", "isMember"] as const;

interface ApiResponse {
  age: number;
  name: {
    firstName: string;
    lastName: string;
  };
  height: string;
  isMember: boolean;
}
// Note that I'm not specifying pickFields is of type "Array<keyof ApiResponse>"!

async function getPersonDetails<
  RequestedFields extends ReadonlyArray<typeof pickFields[number]>
>(
  ...fieldNames: RequestedFields
): Promise<{
  [Field in RequestedFields extends ReadonlyArray<infer FieldNameValue>
    ? FieldNameValue
    : never]: ApiResponse[Field];
}> {
  return callRestApi("/v1/person", fieldNames) as any;
}

// Will give you { age: number; isMember: boolean; height: string}
const response = await getPersonDetails("age", "isMember", "height");
```

This is the really cool part of making `pickFields` a `const` - TypeScript
can figure out from the signature of `getPersonDetails` that the values in
`pickFields` **are a member of** `ApiResponse`!

If we put the string "woof" into `pickFields`, `getPersonDetails` will fail compilation with an error, because "woof" is not a field in `ApiResponse`!

And if we put "meow" into the arguments of `getPersonDetails`, it will also fail for the same reason.
