---
title: "Optimizing React: Reducing Re-renders"
excerpt: "A discussion of how memo, useMemo, useCallback and pushing state down can minimize re-renders."
date: "2022-07-31T20:00:00.000Z"
author:
  name: Jithya Nanayakkara
  picture: "/assets/blog/authors/jj.jpeg"
ogImage:
  url: ""
---

In my experience, React's memoization functions have been source of confusion for many developers.
Some (such as my younger self), use it everywhere as a "performance optimization" and others, having read
articles such as this (link to KCDodd's article), say they're unnecessary except for very rare circumstances. That's not even mentioning those who have no idea what purpose those functions serve.

At its core, these are incredibly useful features that could be used for two purposes: reducing re-renders of a react component or some expensive computations (re-word this),
and providing a stable reference for objects. To really understand in which circumstances we make use of them, I need to cover the
basics of how React works - apologies to those who are already familiar with this, but it's useful that everyone is on the same page with the terminology used here.

## React - What is it

> For simplicity, I'm going to pretend React classes don't exist.

React provides us with a component based abstraction for easily updating the DOM in response to state changes. This is done by representing the DOM with a **Virtual DOM** (V-DOM), that is nothing more than a lightweight representation of the actual DOM. What does that actually mean? It's just a collection of simple Javascript objects arranged like a tree to represent the actual DOM. The idea behind the V-DOM is that since updates to the actual DOM are expensive operations, we could instead make frequent updates to the V-DOM instead - and then figure out which of the actual DOM elements need to be updated by performing a diff between the old and new state of the V-DOM. The algorithm used to diff the trees is not accurate - it's a delicate balance of being fast but accurate enough to minimize unecessary DOM updates for most cases.

If you were to console log the output of a simple React component, you would get the following object:

![Initial](/assets/blog/reducing-re-renders/react-elements-object.png)

With that out of the way, time for some terminology:

- A React **Element** is a simple Javascript object that represents a node in the V-DOM.
- A React **Component** is a function that accepts some _props_ and returns React Elements.
- A **render** is when the React Component (i.e. the function) is executed.
- A **commit** is when React actually updates a DOM element.

Note the difference between `render` and `commit`. Many developers confuse the two - but they are not one to one. When a component "renders", it does not necessarily mean the DOM is going to be updated - React may have figured out that nothing has changed after a state update, and skip updating portions of the DOM. To really drive home this point, **React components can render many, many times**. These are just basic functions being executed after all - and in most cases, they execute fast with minimal impact to performance.

## What causes a component to render

This list is not exhaustive, but is to show the many reasons a component could re-render:

2. The component's state changed (i.e. `setState` was called).
3. The component is a subscriber to a React Context - every time the Context value changes, the component will re-render.
4. The component's parent has re-rendered. The props passed to the component have changed.

## How React's function components work

Below is an extremely contrived example of a React component.
The main idea behind it is that we need to pass an object as a prop to a child component.
And this object includes a callback.

```jsx
function MyComponent() {
  const [counter, setCounter] = useState(0);

  // A callback to increment the counter
  const incrementer = () => {
    setCounter((prev) => prev + 1);
  };

  // An object that is the prop to MySpecialCounterComponent
  const someObj = {
    name: "hello",
    counter,
  };

  return (
    <div>
      <h3>My Special Counter</h3>
      <AnotherComponent seed={start} />
      <MySpecialCounterComponent config={someObj} />
    </div>
  );
}
```

So let's first identify, what would trigger this component to re-render:

1. The component's parent is re-rendered. Its props change.
2. `setCounter` is called via the `incrementer` callback (and it's called with a different value).

Every time one of the above triggers are set off, React will execute the MyComponent function again, and return the child elements.
These child elements, written as JSX, are nothing more than functions too - they are compiled into `React.createElement(args)` function calls.
The reason why we use JSX is that it provides a nice familiar declarative abstraction like html to call components - just imagine writing
a page as a bunch of nested function calls!

Below is an example of what React code (pre-17) would transform to (taken from [here](https://babeljs.io/docs/en/babel-plugin-transform-react-jsx)):

```jsx
const profile = React.createElement(
  "div",
  null,
  React.createElement("img", { src: "avatar.png", className: "profile" }),
  React.createElement("h3", null, [user.firstName, user.lastName].join(" "))
);
```

So with each re-render of MyComponent, the following will happen:

1. `incrementer` will be assigned to a new callback object. Remember functions are objects too!
2. `someObj` will be assigned to a new object. Remember that `{} !== {}`! So both `incrementer` and `someObj` will be assigned to new references in memory.
3. All the React Elements returned from MyComponent will be recreated.

Now let's discuss performance. Given what we know above (points 1 to 3), will all the re-rendering impact performance by constantly re-allocating memory for variables and running all those functions again? Not really. These operations are quite cheap, and the Javascript runtime is optimized for doing these operations efficiently. But this could be a problem if you have an app with hundreds of components re-rendering frequently. Again, in all the enterprise web apps I've worked on, I've only once run into the problem of having many components re-render a problem . Which is probably why you see a lot of blog posts saying to avoid abusing React's memo functions for optimizing performance - it's because the act of memoization trades off time for space. We cache prior values and return them instead of executing functions again. But there's a small cost with this. And the cost could be significant if we end up not using the cached values much, and end up frequently caching a value, throwing it away because it's stale, and then creating a new one.
Since it's easy to shoot yourself in the foot and use these incorrectly, premature optimization should be avoided.

However that's the point of this blog post. To dispel the uncertainty of when to use these functions, and importantly, to introduce you to alternative ways of reducing unecessary re-renders. But before that, let's first understand how the memo functions work. We'll ignore the consideration of whether a performance optimization is necessary or not, and just apply it to our example code.

But before that, we need to work through a much more meaty example. This example is incredibly silly, but it's structured in a way so that we can systematically walkthrough
how it could be optimized. So please bare with me.

Our app displays a list of random numbers to the user.
The user can increment how long the list of random numbers are.
Each random number is styled either with black or white background. How this is decided is by generating _another_ random number.
We also give the user a button to click, which increments a counter.

So our parent component, `App`, looks like this:

```jsx
function App() {
  // Our initial random number list is 10
  const [length, setLength] = useState(10);

  return (
    <div className="App">
      <h1>List length is {length}</h1>
      <MyRandomNumberListAndCounterComponent length={length} />
      <div>
        {/*The user can increase the length of the list through this button */}
        <button onClick={() => setLength((prev) => prev + 1)}>
          Increase list length
        </button>
      </div>
    </div>
  );
}
```

And the app looks like this:

![Initial](/assets/blog/reducing-re-renders/1-initial.png)

The rest of the components:

```jsx
function MyRandomNumberListAndCounterComponent({ length }) {
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
      <FancyNumberListFormatter numberList={randomNumbers} />
      <SpecialButton config={someObj} />
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

function FancyNumberListFormatter({ numberList }) {
  return (
    <div>
      {numberList.map((number, i) => (
        <RandomStyledNumber number={number} key={`${number}-${i}`} />
      ))}
    </div>
  );
}

function SpecialButton({ config }) {
  return (
    <div>
      <button onClick={config.onClick}>{config.name}</button>
    </div>
  );
}
```

The functions to generate the random numbers use browser `crypto` library.
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

First, I'm going to modify the example to do a bit of work. It's become a bit more silly - it now will display a list of random numbers.
How long this list is, depends on the number passed into the "length" prop.
This list of random numbers will then be passed down to the `FancyNumberListFormatter` component.

Note that I'm using the browser crypto library to generate the random numbers. This is a more cryptographically secure way to
generate random numbers, but the reason I'm using it is because it's more computationally intensive.
If this was a single component rendering a few times, it wouldn't be a big deal - but if we had 20 of these components rendering
many times, this would be quite slow.

```jsx
// We use the browser crypto library to generate random numbers
function listOfRandomNumbers(length) {
  Array.from(window.crypto.getRandomValues(new Uint8Array(length)));
}

// Now accept a prop `length` that will be the number of random numbers to generate
function MyRandomNumberListAndCounterComponent({ length = 1 }) {
  const [counter, setCounter] = useState(start);
  const [randomNumbers, setRandomNumbers] = useState(
    listOfRandomNumbers(length)
  );

  useEffect(() => {
    setRandomNumbers(listOfRandomNumbers(length));
  }, [length]);

  // A callback to increment the counter
  const incrementer = () => {
    setCounter((prev) => prev + 1);
  };

  // An object that is the prop to MySpecialCounterComponent
  const someObj = {
    name: "hello",
    counter,
  };

  return (
    <div>
      <h3>My Special Counter</h3>
      {/*We pass our random numbers to the component below */}
      <FancyNumberListFormatter numberList={randomNumbers} />
      <MySpecialCounterComponent config={someObj} />
    </div>
  );
}
```

So one way to optimize this code without memoization, is to use `useState`'s **initialization function**.
Basically if the initial state to `useState` is expensive to compute, pass a callback that generates
the value - and it would only be invoked at the initial render of the component.

Currently, every time we render the component, we're generating and throwing away the random number list.

```jsx
const [randomNumbers, setRandomNumbers] = useState(() =>
  listOfRandomNumbers(length)
);
```

However, this component could be better written using `useMemo`.
Our current implementation needs to synchronize with the length prop and generate a new
list every time it changes.

Instead, we could just:

```jsx
function MyRandomNumberListAndCounterComponent({ length = 1 }) {
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
      <FancyNumberListFormatter numberList={randomNumbers} />
      <MySpecialCounterComponent config={someObj} />
    </div>
  );
}
```

Here, we use `useMemo` to cache the result of an expensive operation. The expensive operation is put in a callback
that's passed as the first argument. The second argument is a list of conditions for when the cache should be refreshed (the expensive operation be re-executed). Every time the `length` prop changes, we want a new random number list to be generated with a different length.

People who are already aware of this hook may spot a technicality with my implementation. In the React documentation, React does not
guarantee the hook won't forget its cached value, and can re-execute its first argument even though its dependency array hasn't changed.
This is not usually a problem, but if the correctness of your code depends on it only executing when the dependency array changes (as is the case in this example, as you'd get a different list of random numbers), then this is not the best approach. BUT, React forgetting the cached value could be a rare situation and this code maybe good enough for most cases. Either way, this illustrates the first use of `useMemo`, which is to avoid unnecessary computations. There's still a cost in memory to store the cached value, and another cost in doing the equality checks on each render to ensure the deps array hasn't changed, but these are tiny compared to the cost of using the crypto lib's random number generator.

Alright so we saved some CPU cycles with `useMemo`. The next optimization we need to tackle is unecessary renders. While a lot less work is being done in each render thanks to `useMemo`, let's minimize the renders to the bare minimum.

So `MyRandomNumberListAndCounterComponent` will re-render when:

1. The `incrementer` is executed (because it triggers a state change).
2. When its parent component re-renders or length prop changes.

A few observations:

1. `FancyNumberListFormatter` should definitely re-render when the `length` prop changes, because it's going to display a different list of numbers. But does it need to re-render when the `counter` is incremented?
2. `MySpecialCounterComponent` should re-render when the counter is incremented. But does it need to re-render when the `length` prop changes, which updates the random number list?

### Using the profiler

- Picture of profiler when render happens.
- Talk about the actual commit.

From our observations, our goal is that:

- `FancyNumberListFormatter` should only re-render when its prop `numberList` changes.
- `MySpecialCounterComponent` only re-renders when its prop `config` changes.

And that's where `memo` comes in. We just memoize a function component so that it caches the elements it returns, only refreshing it once its props changes.

To use it, we just need to wrap the React component with memo:

```jsx
import { memo } from "react";

const MySpecialCounterComponentMemoized = memo(MySpecialCounterComponent);
const FancyNumberListFormatterMemoized = memo(FancyNumberListFormatter);

function MyRandomNumberListAndCounterComponent({ length = 1 }) {
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
      <FancyNumberListFormatterMemoized config={someObj} />
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

Finally, let's memoize the `MyRandomNumberListAndCounterComponent`:

```jsx
export default memo(MyRandomNumberListAndCounterComponent);
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
const FancyNumberListFormatterMemoized = memo(FancyNumberListFormatter);

function MyRandomNumberListAndCounterComponent({ length = 1 }) {
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
      <FancyNumberListFormatterMemoized config={someObj} />
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
const FancyNumberListFormatterMemoized = memo(FancyNumberListFormatter);

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

function MyRandomNumberListAndCounterComponent({ length = 1 }) {
  const randomNumbers = useMemo(() => listOfRandomNumbers(length), [length]);

  return (
    <ComponentA>
      <FancyNumberListFormatterMemoized numberList={randomNumbers} />{" "}
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
