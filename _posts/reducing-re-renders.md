---
title: "Optimizing React: Reducing Re-renders"
excerpt: "A discussion of how memo, useMemo, useCallback and pushing state down can minimize re-renders."
date: "2022-07-31T20:00:00.000Z"
author:
  name: Jithya Nanayakkara
---

In my experience, React's memoization functions have been a source of confusion for many developers.
Some (such as my younger self), use it everywhere as a "performance optimization" and others say they're unnecessary except for very rare circumstances. That's not even mentioning those who have no idea what purpose those functions serve.

[Memoization](https://en.wikipedia.org/wiki/Memoization) is a technique where the result of an expensive computation is cached to improve performance on subsequent calls to it. It's a tradeoff that consumes more memory to save on execution time.

React's memoization functions are primarily used to:

1. Avoid needless re-renders of a component or re-execution of expensive logic.
2. Provide a stable reference for objects.

A lot of focus has been on point number 1 - where some devs [overuse those functions](https://royi-codes.vercel.app/thousand-usecallbacks/) in the name of "performance". But point number 2 is an important use case for React's functional components, especially when writing libraries, and is often overlooked. The point of this blog post is to explore when we can use (and not abuse) these features and also cover some other techniques for maintaining referential stability that don't involve using memo.

To really understand in which circumstances we make use of them, I need to cover the basics of how React works - apologies to those who are already familiar with this, but it's useful that everyone is on the same page with the terminology used here.

## React - What is it

> For simplicity, I'm going to pretend React classes don't exist.

React provides us with a component based abstraction for easily updating the DOM in response to state changes. This is done by representing the DOM with a **Virtual DOM** (V-DOM), that is nothing more than a lightweight representation of the actual DOM. In other words, it is just a collection of simple Javascript objects used to represent the actual DOM.

The idea behind this is that since updates to the actual DOM are expensive operations, we could instead make frequent updates to the V-DOM, and then figure out which of the actual DOM elements need to be updated by diffing the old and new state of the V-DOM. This process is called [reconcilliation](https://reactjs.org/docs/reconciliation.html) and is fast but does not aim to be very accurate - just good enough to minimize unecessary DOM updates for most practical use cases.

With that out of the way, time for some terminology:

- A React **Element** is a simple Javascript object that represents a node in the V-DOM.
- A React **Component** is a function that accepts some _props_ and returns React Elements.

This is what a React element looks like, and you can get this by just console logging the output of a component:

![Initial](/assets/blog/reducing-re-renders/react-elements-object.png)

- A **render** is when the React Component (i.e. the function) is executed.
- A **commit** is when React actually updates a DOM element.

Note the difference between `render` and `commit`. Many developers confuse the two - but they are not equal. When a component "renders", it does not necessarily mean the DOM is going to be updated - React may have figured out that nothing has changed after a state update, and skip updating portions of the DOM.

To really drive home this point, **React components can render many, many times**. These are just basic functions being executed after all - and in most cases, they execute fast with minimal impact on performance. It's objects like the one pictured above that get updated every render - based on how they change, React will decide which DOM elements to update.

## What causes a component to render

This list is not exhaustive, but is to show some of the reasons a component could re-render:

1. The component's parent has re-rendered.
2. The component's state changed (i.e. `setState` was called).
3. The component is a subscriber to a React Context - every time the Context value changes, the component will re-render.

## How React's function components work

Below is a simple example of a React component. The main idea behind it is that we need to pass an object as a prop to a child component.
And this object includes a callback.

```jsx
function CounterComponent() {
  const [counter, setCounter] = useState(0);

  // A callback to increment the counter
  const incrementer = () => {
    setCounter((prev) => prev + 1);
  };

  // An object that is the prop to CounterButtonComponent
  const buttonConfig = {
    name: "hello",
    counter,
  };

  return (
    <div>
      <h3>My Special Counter</h3>
      <CounterButtonComponent config={buttonConfig} />
    </div>
  );
}
```

So let's first identify, what would trigger this component to re-render:

1. The parent of `CounterComponent` is re-rendered.
2. `setCounter` is called via the `incrementer` callback (and it's called with a _different_ value).

Every time one of the above triggers are set off, React will execute the `CounterComponent` function again, and return the child elements.
These child elements, written as JSX, are nothing more than functions too - they are compiled into `React.createElement(args)` function calls.
The reason why we use JSX is that it provides a nice familiar declarative abstraction like HTML to write components - just imagine writing
a page as a bunch of nested function calls!

Below is an example of what React code (pre-v17.0) would transform to (taken from [here](https://babeljs.io/docs/en/babel-plugin-transform-react-jsx)):

```javascript
const profile = React.createElement(
  "div",
  null,
  React.createElement("img", { src: "avatar.png", className: "profile" }),
  React.createElement("h3", null, [user.firstName, user.lastName].join(" "))
);
```

So continuing with our example, with each re-render of `CounterComponent`, the following will happen:

1. `incrementer` will be assigned to a new object. Remember functions are objects too!
2. `someObj` will be assigned to a new object. Remember that `{} !== {}`! So both `incrementer` and `someObj` will be assigned to new references in memory.
3. All the React Elements returned from MyComponent will be recreated.

Now let's discuss performance. Given what we know above (points 1 to 3), would repeated renders of `CounterComponent` impact performance by constantly re-allocating memory for variables and running all those functions again? Not really. These operations are quite cheap, and the Javascript runtime is optimized for doing these operations efficiently. But this could be a problem if you have an app with hundreds or thousands of components re-rendering frequently (and of course, it depends on the user's hardware).

So do we wrap everything we can with `memo`, `useMemo` and `useCallback`? Some people do, which is probably why you see a lot of blog posts saying to avoid abusing React's memo functions for optimizing performance - it's because the act of memoization trades off time for space. We cache prior values and return them instead of executing functions again. But there's a small cost with this. And the cost could be significant if we end up not using the cached values much, and end up frequently caching a value, throwing it away because it's stale, and then creating a new one.

**Since it's easy to shoot yourself in the foot and use these incorrectly, premature optimization should be avoided.**

However that's the point of this blog post. To dispel the uncertainty of when to use these functions, and importantly, to introduce you to alternative ways of reducing unnecessary re-renders. But before that, let's first understand how the memo functions work. We'll ignore the consideration of whether a performance optimization is necessary or not, and just apply it to our example code.

But before that, we need to work through a much more meaty example. This example is incredibly silly and quite long, but we need it to be a few components deep so we could systematically walk through how it could be optimized. So please bare with me.

### A Random Number List Generator and Counter Example

- Our example app displays a list of random numbers to the user.
- Each random number is styled either with black or white background. How this is decided is by generating _another_ random number.
- We also give the user a button to click, which increments a counter.

  ![Initial](/assets/blog/reducing-re-renders/1-initial.png)

This is the hierarchy of the components:

![Component Hierarchy](/assets/blog/reducing-re-renders/component-hierarchy.png)

And this is the code behind them:

```jsx
ReactDOM.render(<App />, rootElement);

function App() {
  return <RandomNumberListAndCounter length={10} />;
}

function RandomNumberListAndCounter({ length }) {
  const [counter, setCounter] = useState(0);

  // We store randomNumbers in useState so that it does not change every render
  const [randomNumbers, setRandomNumbers] = useState(
    generateListOfRandomNumbers(length)
  );

  // We need to generate a new list of random numbers every time the lenght prop changes
  useEffect(() => {
    setRandomNumbers(generateListOfRandomNumbers(length));
  }, [length]);

  const incrementer = () => {
    setCounter((prev) => prev + 1);
  };
  // An object that is the prop to SpecialButton
  const someObj = {
    name: "Special counter incrementer",
    onClick: incrementer,
  };

  return (
    <div>
      <hgroup style={{ marginBottom: "8px" }}>
        <h2>My Special Counter</h2>
        <h3>Clicked {counter} times.</h3>
      </hgroup>
      <NumberListFormatter numberList={randomNumbers} />
      <SpecialButton config={someObj} />
    </div>
  );
}

function NumberListFormatter({ numberList }) {
  return (
    <div>
      {numberList.map((number, i) => (
        <RandomStyledNumber number={number} key={`${number}-${i}`} />
      ))}
    </div>
  );
}

function RandomStyledNumber({ number }) {
  // Generate a random number to decide if this will
  // be styled differently - based on if it's even or odd
  const [isEven] = useState(getExpensiveRandomNumber() % 2 === 0);

  // I've left out styling to simplify the code
  const evenStyle = {};
  const oddStyle = {};

  return <span style={isEven ? evenStyle : oddStyle}>{number}</span>;
}

function SpecialButton({ config }) {
  return (
    <div>
      <button onClick={config.onClick}>{config.name}</button>
    </div>
  );
}
```

The functions to generate the random numbers use the browser `crypto` library.
I've written it in a way so that it's **really** slow.

```typescript
function getExpensiveRandomNumber(): number {
  return new Array(1000)
    .fill(null)
    .map(
      () => Array.from(window.crypto.getRandomValues(new Uint16Array(1000)))[0]
    )[0];
}

function generateListOfRandomNumbers(length: number): number[] {
  return new Array(length).fill(null).map(() => getExpensiveRandomNumber());
}
```

So how does this app perform?
To answer this question, I'm going to use the React DevTools Profiler to measure how long it takes
to render all the components.

I just want the `RandomNumberListAndCounter` to re-render, so I can do this by clicking on the
increment counter button.

![First click](/assets/blog/reducing-re-renders/first-click.png)

![First click profile](/assets/blog/reducing-re-renders/2-counter-profiler.png)

A few observations about the profiler:

1. We can see the total time it took to render `RandomNumberListAndCounter` and all its children was a whopping 1.278 seconds!
2. `App` did not re-render (we can tell because of its gray color).
3. Even though only "Clicked 1 times" is what changed, all the child components of `RandomNumberListAndCounter` re-rendered.

## Optimizing the Example

So one way to optimize this code without memoization, is to use `useState`'s **initialization function**.
Currently, every time we render the component, we're generating and throwing away the random number list.
By passing an initialization function to `useState`, React will only invoke the function once (on the component's first render).

This is the existing problem code:

```javascript
// In RandomNumberListAndCounter:
const [randomNumbers, setRandomNumbers] = useState(
  generateListOfRandomNumbers(length)
);

// In RandomStyledNumber:
const [isEven] = useState(getExpensiveRandomNumber() % 2 === 0);
```

And this is the fixed code:

```javascript
// In RandomNumberListAndCounter:
const [randomNumbers, setRandomNumbers] = useState(() =>
  generateListOfRandomNumbers(length)
);

// In RandomStyledNumber:
const [isEven] = useState(() => getExpensiveRandomNumber() % 2 === 0);
```

Let's see how this improves the profiler result:

![Initialize state only once](/assets/blog/reducing-re-renders/init-state-profiler.png)

A dramatic improvement!
However notice how all the RandomStyled

However, this component could be better written using `useMemo`.
Our current implementation needs to synchronize with the length prop and generate a new
list every time it changes.

Instead, we could just:

```jsx
function RandomNumberListAndCounter({ length = 1 }) {
  const [counter, setCounter] = useState(0);

  // Only generate a new list of random numbers when length changes
  const randomNumbers = useMemo(() => listOfRandomNumbers(length), [length]);

  const incrementer = () => {
    setCounter((prev) => prev + 1);
  };

  const someObj = {
    name: "hello",
    counter,
  };

  return (
    <div>
      <h3>My Special Counter is at {counter}</h3>
      {/*We pass our random numbers to the component below */}
      <NumberListFormatter numberList={randomNumbers} />
      <MySpecialCounterComponent config={someObj} />
    </div>
  );
}
```

Here, we use `useMemo` to cache the result of an expensive operation. The expensive operation is put in a callback
that's passed as the first argument. The second argument is a list of conditions for when the cache should be refreshed (the expensive operation be re-executed). Every time the `length` prop changes, we want a new random number list to be generated with a different length.

People who are already aware of this hook may spot a technicality with my implementation. In the React documentation, React does not
guarantee the hook won't forget its cached value, and can re-execute its first argument even though its dependency array hasn't changed.
This is not usually a problem, but if the correctness of your code depends on it only executing when the dependency array changes (as is the case in this example, as you'd get a different list of random numbers), then this might not the best approach. BUT, React forgetting the cached value could be a rare situation and this code maybe good enough for most cases. Either way, this illustrates the first use of `useMemo`, which is to avoid unnecessary computations. There's still a cost in memory to store the cached value, and another cost in doing the equality checks on each render to ensure the deps array hasn't changed, but these are tiny compared to the cost of using the crypto lib's random number generator.

Alright so we saved some CPU cycles with `useMemo`. The next optimization we need to tackle is unecessary renders. While a lot less work is being done in each render thanks to `useMemo`, let's minimize the renders to the bare minimum.

So `RandomNumberListAndCounter` will re-render when:

1. The `incrementer` is executed (because it triggers a state change).
2. When its parent component re-renders or length prop changes.

A few observations:

1. `NumberListFormatter` should definitely re-render when the `length` prop changes, because it's going to display a different list of numbers. But does it need to re-render when the `counter` is incremented?
2. `MySpecialCounterComponent` should re-render when the counter is incremented. But does it need to re-render when the `length` prop changes, which updates the random number list?

### Using the profiler

- Picture of profiler when render happens.
- Talk about the actual commit.

From our observations, our goal is that:

- `NumberListFormatter` should only re-render when its prop `numberList` changes.
- `MySpecialCounterComponent` only re-renders when its prop `config` changes.

And that's where `memo` comes in. We just memoize a function component so that it caches the elements it returns, only refreshing it once its props changes.

To use it, we just need to wrap the React component with memo:

```jsx
import { memo } from "react";

const MySpecialCounterComponentMemoized = memo(MySpecialCounterComponent);
const NumberListFormatterMemoized = memo(NumberListFormatter);

function RandomNumberListAndCounter({ length = 1 }) {
  const [counter, setCounter] = useState(0);

  const randomNumbers = useMemo(() => listOfRandomNumbers(length), [length]);

  const incrementer = () => {
    setCounter((prev) => prev + 1);
  };

  const someObj = {
    name: "hello",
    counter,
  };

  return (
    <div>
      <h3>My Special Counter is at {counter}</h3>
      {/*We use memoized components instead */}
      <MySpecialCounterComponentMemoized numberList={randomNumbers} />
      <NumberListFormatterMemoized config={someObj} />
    </div>
  );
}
```

And now let's take a look at the React profiler:

- Oh noes! Everything is rendering still!

**Why?**

The thing to note is that when React compares the previous props with the new props, it uses `Object.is`(link to MDN) to compare
if they've changed. This is a shallow comparison - so two objects that have the same values but different memory references,
are not equal ({} === {} will return false). And in our example, we're creating **new objects** for `incrementer` and `someObj` on _every render_.

We can easily fix this by using `useMemo`, to cache the object:

```jsx
/**
 * We only create a new object when the `counter` variable changes.
 * */
const someObj = useMemo(
  () => ({
    name: "hello",
    counter,
  }),
  [counter]
);

const incrementer = useMemo(
  () => () => {
    setCounter((prev) => prev + 1);
  },
  []
);
```

This will fix our react profiler:

(picture)

But... notice the awkward syntax for the incrementer. Since `useMemo` accepts a function, and caches the return value of that function,
we need to pass in a function that returns a function.
Instead, we can use `useCallback` instead of `useMemo` - it's explicit purpose is to cache callbacks (aka functions):

```jsx
const incrementer = useCallback(() => {
  setCounter((prev) => prev + 1);
}, []);
```

Finally, let's memoize the `RandomNumberListAndCounter`:

```jsx
export default memo(RandomNumberListAndCounter);
```

Now, it will only re-render when its `length` prop changes.

### The Inifinite useEffect problem

Memoizing objects to maintain stable reference is what you can do to avoid the classic problem new devs run into with `useEffect` - to choose
between an infinite `useEffect` cycle or silencing the Eslint exhaustive deps rule

```jsx
function SimpleComponent() {
  const [counter, setCounter] = useState(0);
  const [numAnalyticsSent, setNumAnalyticsSent] = useState(0);

  const sendAnalytics = () => axios.post("/analytics", { counterBtn: "used" });

  /**
   * We want to send analytics every time the counter is incremented.
   * We also want to keep track of the number of times we send analytics.
   */
  useEffect(() => {
    sendAnalytics();
    setAnalyticsSent((prev) => prev + 1);
  }, [counter, sendAnalytics]);

  return <button onClick={() => setCounter(counter)}>Increment</button>;
}
```

Again, this is a pretty silly component. But the gist of the problem is:

1. Every time counter changes, the component re-renders and the `useEffect` will run.
2. The useEffect triggers another state change - incrementing `numAnalyticsSent`. This triggers another re-render.
3. In this next re-render, `counter` has changed. But `sendAnalytics` is assigned a new object. Since it is part of `useEffect`'s dependency array, the effect will run again.
4. The cycle continues with step 2.
5. We can avoid this by setting the array to just `[counter]` - but then the Eslint rule complains. We could silence the rule, but it's there for a reason - what if we change the effect and includes more variables, but we forget to include them in the array. Such problems could be annoying to debug.

To fix the issue, just memoize with `useCallback`:

```jsx
const sendAnalytics = useCallback(
  () => axios.post("/analytics", { counterBtn: "used" }),
  []
);

useEffect(() => {
  sendAnalytics();
  setAnalyticsSent((prev) => prev + 1);
}, [counter]);
```

## But we can do better

As I said very early in this piece, there's a small cost with memoizing. It _could_ add up if we have tonnes of components being memoized.
It's still debateable, as React is researching ways of automatically memoizing components for us through a compiler.
But let's see how we could re-write our memoized component in a way to mimize calls to memo.

First up, let's get rid of `useCallback` for our incrementer function:

```jsx
import { memo } from "react";

const MySpecialCounterComponentMemoized = memo(MySpecialCounterComponent);
const NumberListFormatterMemoized = memo(NumberListFormatter);

function RandomNumberListAndCounter({ length = 1 }) {
  const [counter, setCounter] = useState(0);

  const randomNumbers = useMemo(() => listOfRandomNumbers(length), [length]);

  /**
   * Replacing useCallback with useRef
   */
  const incrementer = useRef(() => {
    setCounter((prev) => prev + 1);
  });

  const someObj = useMemo(
    () => ({
      name: "hello",
      counter,
    }),
    [counter]
  );

  return (
    <div>
      <h3>My Special Counter is at {counter}</h3>
      {/*We use memoized components instead */}
      <MySpecialCounterComponentMemoized numberList={randomNumbers} />
      <NumberListFormatterMemoized config={someObj} />
    </div>
  );
}
```

`useRef` returns a reference to a mutable object. Like in `useState`, the initial value you pass is assigned
only once, no matter how many times the component re-renders. As the setter function returned by `useState` is
guaranteed to be stable. How `useRef` works is beyond the scope of this post, but you can read more on it here (link to beta docs).
The value of `incrementer` is guaranteed to be stable. And since it's only initialized once, the callback assigned to `increment.current`
will also be stable.

The only thing to watch out for, is that since it's a mutating object, React has no idea if it has changed - which is fine.
Usually we want React to know if a variable has changed when we synchronize with effects or display the data - that's why we use
hooks like `useState` or `useReducer`.

Not everything needs to go into `useState`, or needs to be defined in a component. Too often, I find code like this:

```jsx
function Component() {
  const doABunchOfStuff = () => {
    const a = 1 + 1;
    console.log("result", a);
  };

  return <SomeotherComponent work={doABunchOfStuff} />;
}
```

The key point of the above code is that the callback isn't _referencing_ any data defined in the component.
It does not need to tie itself to React's rendering.
We can throw away concerns of stable references and garbage collection by just defining `doABunchOfStuff` outside of the component:

```jsx
const doABunchOfStuff = () => {
  const a = 1 + 1;
  console.log("result", a);
};

function Component() {
  return <SomeotherComponent work={doABunchOfStuff} />;
}
```

This can be done for not only callbacks but other data that has **no concern** with displaying data or reacting to other changes in React components.

### Pushing State Down

```jsx
const NumberListFormatterMemoized = memo(NumberListFormatter);

function ComponentA({ children }) {
  const [counter, setCounter] = useState(0);

  const incrementer = useRef(() => {
    setCounter((prev) => prev + 1);
  });
  const someObj = useMemo(
    () => ({
      name: "hello",
      counter,
    }),
    [counter]
  );

  return (
    <div>
      <h3>My Special Counter is at {counter}</h3>
      {children}
      <MySpecialCounterComponent config={someObj} />
    </div>
  );
}

function RandomNumberListAndCounter({ length = 1 }) {
  const randomNumbers = useMemo(() => listOfRandomNumbers(length), [length]);

  return (
    <ComponentA>
      <NumberListFormatterMemoized numberList={randomNumbers} />{" "}
    </ComponentA>
  );
}
```

This technique was lifted straight from Dan Abramov himself - I highly recommend reading his blog post here(link).
The basic idea is that the prop `children`, is a reference to some React elements created by the parent.
If the child component has re-rendered, and the `children` prop remains the same, React knows that `children` doesn't have to be rendered again.

### Wrap Up

1. Using `React.memo` reduce unecessary renders - only render when props change or state/subscriptions change.
2. `useMemo` to cache the results of expensive operations.
3. `useCallback` and `useMemo` for caching object references so that they're stable and only update when necessary.
4. Defining variables outside of a Component and using `useRef` can be used for stable references in certain circumstances.
5. Pushing state down to isolate components that need to re-render.

There is one more topic I'd like to address - the `key` prop in React.
However, that's a topic for another (much shorter) blog post.
