---
title: "Optimizing React: Reducing Re-renders"
excerpt: "A discussion of how memo, useMemo, useCallback and pushing state down can minimize re-renders."
date: "2022-07-31T20:00:00.000Z"
publish: true
author:
  name: Jithya Nanayakkara
---

In my experience, React's memoization functions have been a source of confusion for many developers - either being criminally overused in the name of "performance", or woefully underutilized.

In this blog post, I'm going to attempt to dispel the uncertainty of when to use these functions, understand their trade-offs, and introduce you to ways of avoiding them altogether.

So what is [Memoization](https://en.wikipedia.org/wiki/Memoization)? It's a technique where the result of an expensive computation is cached to improve performance on subsequent calls to it. It's a tradeoff that consumes more memory to save on execution time.

In React, its memoization functions are primarily used to:

1. Avoid needless re-renders of a component (using `React.memo`) or re-execution of expensive logic (`useMemo`).
2. Provide a stable reference for objects (both `useMemo` and `useCallback`).

Devs tend to focus on the first point - where some [overuse those functions](https://royi-codes.vercel.app/thousand-usecallbacks/) in the name of "performance". But point number 2 is an important use case for React's functional components, especially when writing libraries, and is often overlooked.

To really understand in which circumstances we make use of them, I need to cover the basics of how React works - apologies to those who are already familiar with this, but it's useful that everyone is on the same page with the terminology used here.

## React - What is it

> For simplicity, I'm going to pretend React classes don't exist.

React provides us with a component based [abstraction](https://computersciencewiki.org/index.php/Abstraction) for easily updating the DOM in response to state changes. This is done by representing the DOM with a **Virtual DOM** (V-DOM), that is nothing more than a lightweight representation of the actual DOM. In other words, it is just a collection of simple Javascript objects used to represent the actual DOM.

The idea behind this is that since updates to the actual DOM are expensive operations, we could instead make frequent updates to the V-DOM, and then figure out which of the actual DOM elements need to be updated by diffing the old and new state of the V-DOM. This process is called [reconcilliation](https://reactjs.org/docs/reconciliation.html) and is fast but does not aim to be very accurate - just good enough to minimize unecessary DOM updates for most practical use cases.

With that out of the way, time for some terminology:

- A React **Element** is a simple Javascript object that represents a node in the V-DOM.
- A React **Component** is a function that accepts some _props_ and returns React Elements.

This is what a React **element** looks like, and you can get this by just console logging the output of a component:

![Initial](/assets/blog/reducing-re-renders/react-elements-object.png)

- A **render** is when the React Component (i.e. the function) is executed.
- A **commit** is when React actually updates a DOM element.

Note the difference between `render` and `commit`. Many developers confuse the two, but they are _not_ the same. When a component "renders", it does not necessarily mean the DOM is going to be updated - React may have figured out that nothing has changed after a state update, and skip updating portions of the DOM.

To really drive home this point, **React components can render many, many times**. These are just basic functions being executed after all - and in most cases, they execute fast with minimal impact on performance. It's objects like the one pictured above that get updated every render - based on how they change, React will decide which DOM elements to update.

## Understanding what happens in a render

Here are some possible reasons a component would re-render (this list is not exhaustive):

1. The component's parent has re-rendered.
2. The component's state changed (i.e. `setState` was called).
3. The component is a subscriber to a React Context - every time the Context value changes, the component will re-render.

Understanding why your component has re-rendered is a critical first step in diagnosing React performance problems.
So see if you can identify what would cause the example component below to re-render:

```jsx
function Counter() {
  const [counter, setCounter] = useState(0);
  const user = useContext(UserContext);

  // A callback to increment the counter, passed to FancyButton
  const incrementer = () => {
    setCounter((prev) => prev + 1);
  };

  // An object that is the prop to FancyButton
  // I'm aware this is a little unusual, but there are situations where
  // you pass in complex objects as props to a component.
  const buttonConfig = {
    name: "hello",
    display: counter,
  };

  return (
    <div>
      <h3>My Special Counter</h3>
      <p>Hello, {user}!</p>
      <FancyButton config={buttonConfig} onClick={incrementer} />
    </div>
  );
}
```

The following are triggers that would cause `Counter` to re-render:

1. The _parent_ of `Counter` is re-rendered.
2. `setCounter` is called via the `incrementer` callback (and it's called with a _different_ value - React has an optimization where if the new value to `setState` is the same as the old, a re-render will not happen).
3. The object returned by `useContext` has changed.

Every time one of the above triggers are set off, React will execute the `Counter` function again, and return the child elements.
These child elements, written as JSX, are nothing more than functions too - they are compiled into `React.createElement(args)` function calls.
The reason why we use JSX is that it provides a nice familiar [declarative](https://en.wikipedia.org/wiki/Declarative_programming) abstraction like HTML to write components - just imagine writing a page as a bunch of nested function calls!

Below is an example of what React code (pre-v17.0) would transform to (taken from the [Babel React Transform Plugin docs](https://babeljs.io/docs/en/babel-plugin-transform-react-jsx)):

```javascript
const profile = React.createElement(
  "div",
  null,
  React.createElement("img", { src: "avatar.png", className: "profile" }),
  React.createElement("h3", null, [user.firstName, user.lastName].join(" "))
);
```

So continuing with our example, with each re-render of `Counter`, the following will happen:

1. `incrementer` will be assigned to a _new_ callback **object**. Remember functions in Javascript are objects too!
2. `buttonConfig` will also be assigned to a new object. Remember that `{} !== {}`. So both `incrementer` and `buttonConfig` will be assigned to **new references** in memory on _every render_.
3. All the React Elements returned from `Counter` will be _recreated_.

Now let's discuss performance. Given what we know from above, would repeated renders of `Counter` impact performance by constantly re-allocating memory for variables and running all those functions again? Not really.

These operations are quite cheap, and the Javascript runtime is optimized for doing these operations efficiently. But this could be a problem if you have an app with hundreds or thousands of components re-rendering frequently (and of course, it depends on the user's hardware).

So do we wrap everything we can with `memo`, `useMemo` and `useCallback`? Some people do, which is probably why you see a lot of blog posts saying to avoid abusing React's memo functions for optimizing performance - it's because the act of memoization trades off time for space. We cache prior values and return them instead of executing functions again.

But there's a small cost with this. And the cost could be significant if we end up not using the cached values much, and end up frequently caching a value, throwing it away because it's stale, and then creating a new one.

**Since it's easy to shoot yourself in the foot and use these incorrectly, premature optimization should be avoided.**

However as long as you understand how React works, choosing when to use the memoization functions is pretty straightforward. And in my experience, you don't need to use them too often.

Now that we've covered why a component can re-render, and how variables are given new references on each render, we can dive into optimization.
To do that, we need to work through a much more meaty example. This example is incredibly silly and quite long, but we need it to be a few components deep so we could systematically walk through how it could be optimized.

### A Random Number List Generator and Counter Example

- Our example app displays a list of random numbers to the user.
- Each random number is styled either with a black or white background. How this is decided is by generating _another_ random number, and checking if it's even or odd.
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

It is **not important** to understand how they work, I'm just including it if you're curious:

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
To answer this question, I'm going to use the React DevTools Profiler to measure how long it takes to render all the components:

- I just want the `RandomNumberListAndCounter` to re-render, so I can do this by clicking on the
  increment counter button.
- Before clicking the counter button, I hit record on the profiler, then after I see the counter increment, I stop recording.
- If any renders took place, the profile will spit out a flame graph of how long each component took to render.

![First click](/assets/blog/reducing-re-renders/first-click.png)

![First click profile](/assets/blog/reducing-re-renders/2-counter-profiler.png)

A few observations about the profiler:

1. We can see the total time it took to render `RandomNumberListAndCounter` and all its children was a whopping 1.278 seconds!
2. `App` did not re-render (we can tell because of its gray color).
3. Even though only the text "Clicked 1 times" is what changed, all the child components of `RandomNumberListAndCounter` re-rendered.

## Optimizing the Example

We desperately need to fix the slow re-rendering of the example every time we increment the counter. And we can actually do this without memoization, by using `useState`'s **initialization function**.
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

> Note that when we first load the App, its initial render will still be painfully slow. But at least we can tackle slow re-renders easily.

Let's see how this improves the profiler result:

![Initialize state only once](/assets/blog/reducing-re-renders/init-state-profiler.png)

A dramatic improvement!

But notice how all the `RandomStyledNumber`, `SpecialButton` and `NumberListFormatter` components continue to re-render. These renders are unnecessary given the only thing that changes is the unrelated counter text.

This where `React.memo` comes in. If we pass a component into `React.memo`, it will only re-render it if its props have changed between re-renders of its parent. Parent components can re-render all they like, but as long as the props passed to the memoized component remain the same, the cached React Elements will be what's returned.

This is how we call `React.memo`:

```javascript
const MyComponentMemoized = React.memo(MyComponent);

// and use it like a regular component in JSX:
<MyComponentMemoized />;
```

So should we wrap all our components in the example with `React.memo`?

No. It's neither necessary nor optimal.

If you look at the component hieararchy diagram, if we wrap `RandomStyledNumber` with `React.memo`, we'd be caching all those components. These components _will only change_ if the `numberList` changes.

In fact, we would only need to memoize `NumberListFormatter` and `SpecialButton`. `RandomNumberListAndCounter` will never re-render because of its parent (refer to what's in the `App` component to understand why).

The only thing that causes it to re-render is the `counter` incrementing. If we memoize `RandomNumberListAndCounter`, it would continue to re-render when its state changes - which is what we want in order for it to work correctly.

So let's go ahead and memoize `NumberListFormatter` and `SpecialButton` components:

```javascript
const NumberListFormatterMemoized = React.memo(NumberListFormatter);
const SpecialButtonMemoized = React.memo(SpecialButton);

function RandomNumberListAndCounter({ length }) {
  const [counter, setCounter] = useState(0);

  const [randomNumbers, setRandomNumbers] = useState(
    generateListOfRandomNumbers(length)
  );

  useEffect(() => {
    setRandomNumbers(generateListOfRandomNumbers(length));
  }, [length]);

  const incrementer = () => {
    setCounter((prev) => prev + 1);
  };

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
      {/** We use the memoized components instead */}
      <NumberListFormatterMemoized numberList={randomNumbers} />
      <SpecialButtonMemoized config={someObj} />
    </div>
  );
}
```

And now let's take a look at the React profiler, where I measure what happens after I click the counter button:

**Picture of profiler**

The grayed out bars indicate that a component has not re-rendered. As expected, `NumberListFormatter` and child components have not re-rendered. But `SpecialButton` has re-rendered - definitely not what we want, especially since we memoized it!

Allow me to yank out the cause of this:

```javascript
const someObj = {
  name: "Special counter incrementer",
  onClick: incrementer,
};

<SpecialButton config={someObj} />;
```

**Why?**

The thing to note is that when React compares the previous props with the new props, it uses [Object.is](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Object/is) to compare
if they've changed. This is a shallow comparison - so two objects that have the same values but different memory references,
are not equal (`{} === {}` evaluates to `false`). And in our example, we're creating **new objects** for `incrementer` and `someObj` on _every render_.

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

**_(picture)_**

But... notice the awkward syntax for the incrementer. Since `useMemo` accepts a function, and caches the return value of that function,
we need to pass in a function that returns a function.
Instead, we can use `useCallback` instead of `useMemo` - its explicit purpose is to cache callbacks (aka functions):

```jsx
const incrementer = useCallback(() => {
  setCounter((prev) => prev + 1);
}, []);
```

## But we can do better

As I said very early in this piece, there's a small cost with memoizing. It _could_ add up if we have tonnes of components being memoized.
But let's see how we could re-write our memoized component in a way to mimize calls to memo.

First up, let's get rid of `useCallback` for our incrementer function:

```jsx
function RandomNumberListAndCounter({ length }) {
  const [counter, setCounter] = useState(0);

  const [randomNumbers, setRandomNumbers] = useState(
    generateListOfRandomNumbers(length)
  );

  useEffect(() => {
    setRandomNumbers(generateListOfRandomNumbers(length));
  }, [length]);

  // Replace useCallback with useRef
  const incrementer = useRef(() => {
    setCounter((prev) => prev + 1);
  });

  // useRef returns a mutable object with the field "current".
  // This field is assigned with our incrementer function.
  const someObj = {
    name: "Special counter incrementer",
    onClick: incrementer.current,
  };

  return (
    <div>
      <hgroup style={{ marginBottom: "8px" }}>
        <h2>My Special Counter</h2>
        <h3>Clicked {counter} times.</h3>
      </hgroup>
      {/** We use the memoized components instead */}
      <NumberListFormatterMemoized numberList={randomNumbers} />
      <SpecialButtonMemoized config={someObj} />
    </div>
  );
}
```

`useRef` returns a reference to a mutable object. Like in `useState`, the initial value you pass is assigned
only once, no matter how many times the component re-renders. How `useRef` works is beyond the scope of this post, but you can [read more on it here](https://beta.reactjs.org/apis/react/useRef).
Since `incrementer.current` is a mutable object, it's value will only change if we update it - and we don't need to be about re-renders of the
component re-assigning it to a different value. So if we want to define a stable object, that does depend on some other stable objects in a component, we can use `useRef` instead. Another way of thinking about this is - is the dependency array of `useMemo` or `useCallback` an empty array? Then it can be replaced with `useRef`.

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
  const config = { title: "Beautiful example", theme: "skyblue" };

  return <SomeotherComponent work={doABunchOfStuff} config={config} />;
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
const config = { title: "Beautiful example", theme: "skyblue" };

function Component() {
  return <SomeotherComponent work={doABunchOfStuff} config={config} />;
}
```

### Pushing State Down

There is one more technique I'd like to touch on, and it's one where you can avoid having to
use memoization. This technique involves restructuring your components, such that components that have to re-render due to
state changes will do so in a way that other components do not re-render.

Let me show you by re-writing the example:

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
      <MySpecialCounterComponent config={someObj} onClick={incrementer} />
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
