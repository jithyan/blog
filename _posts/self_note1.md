---
title: "Self Note"
excerpt: "Never publish"
date: "2022-10-01T20:00:00.000Z"
publish: false
author:
    name: Jithya Nanayakkara
---

```jsx
const pickFields = ["age", "isMember"] as const;

interface ApiResponse {
  age: number;
  name: {
    firstName: string;
    lastName: string;
  };
  height: string;
  isMember: boolean;
}
// Note that I'm not specifying pickFields
// is of type "Array<keyof ApiResponse>"!

/**
 * I'm constraining it to only the fields I'm interested in
 */
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

// Will give you { age: number; isMember: boolean; }
const response = await getPersonDetails(...pickFields)
```

This is the really cool part of making `pickFields` a `const` - TypeScript
can figure out that the values in `pickFields` **are a member of** `ApiResponse`!

If we put the string "woof" into `pickFields`, `getPersonDetails` will fail compilation with an error, because "woof" is not a field in `ApiResponse`!

Likewise, putting it into the arguments of `getPersonDetails`, will also fail compilation for the same reason.
