---
title: "Optimizing React: Part 3 - Avoiding Memoization"
excerpt: "The final part of my series on optimizing React components, I go over some techniques to minimize having to use memoization."
date: "2022-09-18T20:00:00.000Z"
publish: true
author:
  name: Jithya Nanayakkara
---

---

This is the final article in a series covering techniques for optimizing React's performance by minimizing renders.

1. [Part 1 - Understanding Renders](https://jithyan.github.io/blog/posts/understanding-renders)
2. [Part 2 - Understanding Memoization](https://jithyan.github.io/blog/posts/understanding-memoization)
3. Part 3 - Avoiding Memoization (this post)

---

In the [last post](https://jithyan.github.io/blog/posts/understanding-memoization), we worked through an example application and used memoization to reduce unnecessary renders. However, as I said in the [very first article](https://jithyan.github.io/blog/posts/understanding-renders) of this series, there's a small cost with memoizing. And these costs _could_ add up significantly if we have tonnes of components being memoized.

So let's see how we could re-write our memoized example application from the [previous article](https://jithyan.github.io/blog/posts/understanding-memoization) in a way that minimizes usage of memoization.

### Using useRef to replace useCallback or useMemo

In our example from the [last post](https://jithyan.github.io/blog/posts/understanding-memoization), we can see we're calling `useCallback` with an _empty_ dependency array:

```javascript
const [counter, setCounter] = useState(0);

const incrementOnClick = useCallback(
  () => {
    setCounter((prev) => prev + 1);
  },
  // We don't pass anything into the array, and the React linter
  // does not complain.
  []
);
```

We can do this because `React` guarantees `setCounter` to be stable.

For scenarios where we have an empty dependency array for `useCallback` or `useMemo`, we could just store the variable in a ref instead.
Note that this only applies for `useMemo` where you're using it for a stable reference, and **not** to reduce expensive computations.

So our example can be re-written as follows:

```jsx
const incrementOnClick = useRef(() => {
  setCounter((prev) => prev + 1);
});

<ButtonWithFooterMemoized
  config={configProp}
  onClick={incrementOnClick.current}
/>;
```

`useRef` returns a reference to a [mutable object](https://blog.logrocket.com/immutability-in-react-ebe55253a1cc/). Like in `useState`, the initial value you pass is assigned
only once, no matter how many times the component re-renders. How `useRef` works is beyond the scope of this post, but you can [read more about it here](https://beta.reactjs.org/apis/react/useRef).

This technique is common in React libraries where returning stable references from hooks is important.

Since `incrementOnClick.current` is a mutable object, its value will only change if we explicitly update it - so we don't need to care about re-renders of the component re-assigning it to a different value.

The only thing to watch out for, is that since it's a mutating object, React has no idea if it has changed - which is fine.
Usually we only want React to know if a variable has changed when we synchronize with effects or display the data - that's why we use
hooks like `useState`.

### Defining variables outside a component

Not everything needs to go into `useState`, or needs to be defined in a component. Too often, I find code like this:

```jsx
function Component() {
  const doABunchOfStuff = () => {
    const result = 1 + 1;
    console.log("result", result);
  };
  const config = { title: "Beautiful example", theme: "skyblue" };

  return <SomeotherComponent work={doABunchOfStuff} config={config} />;
}
```

The key point of the above code is that `doABunchOfStuff` and `config` isn't _referencing_ any data or functions defined **_in_ the component**.

Therefore, it does not need to tie itself to React's rendering.

We can throw away concerns of stable references and garbage collection by just defining `doABunchOfStuff` and `config` outside of the component:

```jsx
const doABunchOfStuff = () => {
  const a = 1 + 1;
  console.log("result", a);
};
const config = { title: "Beautiful example", theme: "skyblue" };

function Component() {
  return <SomeotherComponent work={doABunchOfStuff} config={config} />;
}
```

### Pushing State Down

There is one more technique I'd like to dive into, and it's one where you can minimize having to use `React.memo`. This technique involves restructuring your component tree hierarchy, so that state changes are localized to components that display them. Components that are meant to be rendered at the bottom of the tree, are passed down as `children`.

It's best understood by re-writing our example.

To refresh your memory, this the current component hierarchy of the example app:

![Component Hierarchy](/blog/assets/blog/reducing-re-renders/component-hierarchy.png)

We are going to change the hierarchy so that less components need to re-rendered on a state change.

First, let's put all the code related to the `counter` state in one component, called `FancyCounter`:

```jsx
const ButtonWithFooterMemoized = React.memo(ButtonWithFooter);

function FancyCounter({ length, children }) {
  const [counter, setCounter] = useState(0);

  const incrementOnClick = useRef(() => {
    setCounter((prev) => prev + 1);
  });

  const configProp = useMemo(
    () => ({
      name: "Special counter incrementer",
      listLength: length,
    }),
    [length]
  );

  return (
    <div>
      {/**
    Note that we now will only render
    FancyHeader and ButtonWithFooterMemoized,
    but not FancyNumberListFormatter - we instead only include
    a reference to some children passed down by the
    parent component. 
    */}
      <FancyHeader counter={counter} />
      {children}
      <ButtonWithFooterMemoized
        config={configProp}
        onClick={incrementOnClick.current}
      />
    </div>
  );
}
```

This is the key point: now, `FancyCounter` will only re-render when `setCounter` is called - when this happens, its `children` prop
will be **unchanged**. `children` consists of React Elements passed down from the parent - as the parent has _not re-rendered_, these
objects remain unchanged - and React is smart enough to know that these do not need to be re-rendered.

This is how the rest of the re-written components look like:

```jsx
function RandomNumberListAndCounter({ length }: { length: number }) {
  const [randomNumbers, setRandomNumbers] = useState(() =>
    generateListOfRandomNumbers(length)
  );

  useEffect(() => {
    setRandomNumbers(generateListOfRandomNumbers(length));
  }, [length]);

  return (
    <FancyCounter length={length}>
      {/** Note that this is no longer memoized! */}
      <FancyNumberListFormatter numberList={randomNumbers} />
    </FancyCounter>
  );
}
```

We pass in `FancyNumberListFormatter` as the `children` of `FancyCounter`.
`RandomNumberListAndCounter` will only re-render if its parent changes,
and in our app, this will never happen. So `React.memo` for `FancyNumberListFormatter` is no longer needed!

This is what the new component hierarchy now looks like:

![New Component Hierarchy](/blog/assets/blog/reducing-re-renders/push-state-down-hierarchy.png)

We can see that the React Profiler gives the same results:

![Push state down flamegraph](/blog/assets/blog/reducing-re-renders/pushed-state-flamegraph.png)

![Push state down flamegraph](/blog/assets/blog/reducing-re-renders/pushed-state-ranked.png)

This technique was lifted straight from Dan Abramov himself - and I highly recommend reading [his blog post on it](https://overreacted.io/before-you-memo/).

The basic idea is that the prop `children`, is a reference to some React elements created by the parent.
If the child component has re-rendered, and the `children` prop remains the same, React knows that `children` doesn't have to be rendered again.

### Wrap Up

I do want to emphasize though, that the optimizations I've mentioned above _could_ make your code a little harder to read.
In a lot of application code, readability and maintainability are higher concerns than performance. Libraries on the other hand need
to emphasize on having more performant code.

So ideally, you'd use these optimizations when you need to, and not simply for the sake of "performance".

And now below, I will summarize everything we've learnt in this entire series.

**When we want to create stable references, we can:**

1. Define objects and functions outside of a component, if they don't rely on variables defined in the component itself.
2. If they do depend on variables defined in the component, we can use `useCallback` and `useMemo`.
3. If they depend on variables defined in the component that are already stable, we can use `useRef` instead.

**When we want to prevent redundant expensive computations on re-render, we can:**

1. Pass an initialization function to `useState` or `useReducer`, if the result of the computation needs to be part of the component state.
2. Use `useMemo`.

**When we want to minimize redundant renders of a component, we can:**

1. Use `React.memo` so that a component will only re-render if its props change.
2. Reorganize the component tree, so that state changes are localized to components who consume that state.

In our final optimized example app, we have:

- One component wrapped with `React.memo`
- One object wrapped with `useMemo`
- One callback stored in `useRef`

A more naive approach would have been memoizing every component, object and callback in the app.
