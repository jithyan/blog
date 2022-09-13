---
title: "Optimizing React: Memoization and Reducing Re-renders"
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

## An overview of React

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

This is what our example app looks like:

![Picture of example app](/assets/blog/reducing-re-renders/app-first-load.png)

And it does the following:

- Displays a list of random numbers.
- Each random number is styled either with a black or white background. How this is decided is by generating _another_ random number, and checking if it's even or odd.
- We also give the user a button to click, which increments a counter.

Below is the code for the above app (I've stripped out any CSS, for simplicity):

```jsx
ReactDOM.render(<App />, rootElement);

// The Parent component - note that it has no state
// and passes a fixed prop to RandomNumberListAndCounter
function App() {
  return (
    <div className="App">
      <RandomNumberListAndCounter length={10} />
    </div>
  );
}

function RandomNumberListAndCounter({ length }) {
  const [counter, setCounter] = useState(0);
  // We keep the random number list in state, so that we can control
  // when the list of random numbers is updated, independent of re-renders of the component.
  const [randomNumbers, setRandomNumbers] = useState(
    generateListOfRandomNumbers(length)
  );

  // Generate a different set of random numbers every time length changes
  useEffect(() => {
    setRandomNumbers(generateListOfRandomNumbers(length));
  }, [length]);

  const incrementOnClick = () => {
    setCounter((prev) => prev + 1);
  };

  // An object that is the prop to ButtonWithFooter
  // A little unusual, but sometimes you may need to pass
  // complex objects to a component
  const configProp = {
    name: "Special counter incrementer",
    listLength: length,
  };

  return (
    <div>
      {/* Displays the counter */}
      <FancyHeader counter={counter} />
      {/* Displays the styled list of random numbers */}
      <FancyNumberListFormatter numberList={randomNumbers} />
      {/* Increments the counter, and shows how many random numbers are shown*/}
      <ButtonWithFooter config={configProp} onClick={incrementOnClick} />
    </div>
  );
}

function FancyHeader({ counter }) {
  return (
    <hgroup>
      <h1>My Special Counter</h1>
      <h2>Clicked {counter} times.</h2>
    </hgroup>
  );
}

function FancyNumberListFormatter({ numberList }) {
  return (
    <div>
      {numberList.map((number, i) => (
        <RandomlyStyledNumber number={number} key={`${number}-${i}`} />
      ))}
    </div>
  );
}

function RandomlyStyledNumber({ number }) {
  const [isEven] = useState(getExpensiveRandomNumber() % 2 === 0);

  // I'm skipping showing any styling
  const evenStyle = {};
  const oddStyle = {};

  return <span style={isEven ? evenStyle : oddStyle}>{number}</span>;
}

function ButtonWithFooter({ config, onClick }) {
  return (
    <>
      <div>
        <button onClick={onClick}>{config.name}</button>
      </div>
      {/* 
        Normally you wouldn't include a footer with a button, but this is only
        for the purpose of the example 
      */}
      <footer>
        <em>Number of random numbers shown: {config.listLength}</em>
      </footer>
    </>
  );
}
```

The functions to generate the random numbers use the browser `crypto` library.
I've written it in a way so that it's **really** slow.

It is **not important** to understand how they work, I'm just including it if you're curious:

```typescript
function getExpensiveRandomNumber() {
  return new Array(1000)
    .fill(null)
    .map(
      () => Array.from(window.crypto.getRandomValues(new Uint16Array(1000)))[0]
    )[0];
}

function generateListOfRandomNumbers(length) {
  return new Array(length).fill(null).map(getExpensiveRandomNumber);
}
```

This is the hierarchy of the components:

![Component Hierarchy](/assets/blog/reducing-re-renders/component-hierarchy.png)

So how does this app perform?
To answer this question, I'm going to use the React DevTools Profiler to measure how long it takes to render all the components:

- I just want the `RandomNumberListAndCounter` to re-render, so I can do this by clicking on the
  increment counter button.
- Before clicking the counter button, I hit record on the profiler, then after I see the counter increment, I stop recording.
- If any renders took place, the profile will spit out a flame graph of how long each component took to render.

![First click](/assets/blog/reducing-re-renders/app-first-click.png)

![First click profiler](/assets/blog/reducing-re-renders/app-first-click-profiler.png)

A few observations about the profiler:

1. We can see the total time it took to render `RandomNumberListAndCounter` and all its children was a whopping **1.25 seconds**!
2. `App` did not re-render (we can tell because of its gray color).
3. Even though only the text "Clicked 1 times" is what changed, all the child components of `RandomNumberListAndCounter` _re-rendered_.

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

![Initialize state only once](/assets/blog/reducing-re-renders/profiler-init-state.png)

0.9ms - A dramatic improvement!

> At this point, you'd normally stop optimizing your app (unless you expect it to grow in complexity). A 0.9ms re-render time is plenty fast. However, for the sake of learning, we're going to optimize the rest of the app.

But notice how all the `RandomlyStyledNumber`, `ButtonWithFooter` and `FancyNumberListFormatter` components continue to re-render. These renders are unnecessary given the only thing that changes is the unrelated counter text.

This where `React.memo` comes in. If we pass a component into `React.memo`, it will only re-render it if its props have changed between re-renders of its parent. Parent components can re-render all they like, but as long as the props passed to the memoized component remain the same, the cached React Elements will be what's returned.

This is how we call `React.memo`:

```javascript
const MyComponentMemoized = React.memo(MyComponent);

// and use it like a regular component in JSX:
<MyComponentMemoized />;
```

So should we wrap all our components in the example with `React.memo`?

No. It's neither necessary nor optimal.

If look at the component hierarchy diagram again, we can see that the memoizing the following components is redundant:

- `App`: This is the root component. It's pointless memoizing this as it has no parent component to trigger any re-renders.
- `RandomNumberListAndCounter`: In the context of our example, this component will only re-render when its state, `counter`, changes. Its parent component, `App`, doesn't also have any state so it would never re-render. Therefore wrapping it with `React.memo` is redundant, as memoized components will continue to re-render when its internal state changes (which is what we want).
- `RandomlyStyledNumber`: This component will **only** re-render when its parent, `FancyNumberListFormatter`, re-renders. Therefore, only memoizing its parent is sufficient.
- `FancyHeader`: This component depends on `counter`, as its passed as a prop. We know that the only thing in our app that triggers a re-render is the `counter` being updated. Therefore, wrapping this in `React.memo` is redundant.

So only these 2 components would benefit from memo:

1. `FancyNumberListFormatter`
2. `ButtonWithFooter`

Both of the above components depend on the `length` prop, and not `counter`. When `counter` changes, these components end up re-rendering, so they're good candidates for memoization.

Let's go ahead and do just that:

```javascript
const FancyNumberListFormatterMemoized = React.memo(FancyNumberListFormatter);
const ButtonWithFooterMemoized = React.memo(ButtonWithFooter);

function RandomNumberListAndCounter({ length }: { length: number }) {
  const [counter, setCounter] = useState(0);
  const [randomNumbers, setRandomNumbers] = useState(() =>
    generateListOfRandomNumbers(length)
  );

  useEffect(() => {
    setRandomNumbers(generateListOfRandomNumbers(length));
  }, [length]);

  const incrementOnClick = () => {
    setCounter((prev) => prev + 1);
  };

  const configProp = {
    name: "Special counter incrementer",
    listLength: length,
  };

  return (
    <div>
      <FancyHeader counter={counter} />
      <FancyNumberListFormatterMemoized numberList={randomNumbers} />
      <ButtonWithFooterMemoized
        config={configProp}
        onClick={incrementOnClick}
      />
    </div>
  );
}
```

Before we check the profiler, I'm going to throttle my CPU speed by 6x in Chrome - so that it simulates users who don't have a developer grade laptop:

![How to throttle CPU](/assets/blog/reducing-re-renders/throttle-cpu.png)

And now let's take a look at the React profiler, where I measure what happens after I click the counter button:

![Flamegraph of memoized components](/assets/blog/reducing-re-renders/memo-flamegraph.png)

Looking good - all components that don't need to re-render aren't rendering according to this flamegraph (indicated by the grayed out bars).

But the flamegraph isn't showing all the re-rendering components, so let's switch views to "Ranking":

![Ranking of memoized components](/assets/blog/reducing-re-renders/memo-ranked.png)

Only two components should re-render: `RandomNumberListFormatter` and `FancyHeader`. `RandomNumberListFormatter` contains the state `counter`, which changes, and `FancyHeader` takes in the prop `counter`.

But it also looks like `ButtonWithFooter` is re-rendering, even though it doesn't care about the `counter` value.

So why would `ButtonWithFooter` re-render despite being memoized and having no props change?

Allow me to yank out the cause of this:

```javascript
// New object assignment
const incrementOnClick = () => {
  setCounter((prev) => prev + 1);
};

// New object assignment
const configProp = {
  name: "Special counter incrementer",
  listLength: length,
};

// Even though semantically the same, config and incrementOnClick
// are different objects on each render
<ButtonWithFooterMemoized config={configProp} onClick={incrementOnClick} />;
```

The thing to note is that when `React.memo` compares the previous props with the new props, it uses [Object.is](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Object/is) to compare
if they've changed. This is a shallow comparison - so two objects that have the same values but different memory references,
are not equal (remember `{} === {}` evaluates to `false`).

And in our example, we're creating **new objects** for `incrementOnClick` and `configProp` on _every render_.

We can easily fix this by using `useMemo`, to cache the objects:

```jsx
const incrementOnClick = useMemo(
  () => () => {
    setCounter((prev) => prev + 1);
  },
  []
);

/**
 * We only create a new object when the `length` changes.
 */
const configProp = useMemo(
  () => ({
    name: "Special counter incrementer",
    listLength: length,
  }),
  [length]
);
```

And the new Ranked profiler result is:

![Profiler after useMemo](/assets/blog/reducing-re-renders/profiler-usememo.png)

Now only the two expected components re-render.

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
But let's see how we could re-write our memoized component in a way to minimize calls to memo.

### Using useRef to replace useCallback or useMemo

In our example, we can see we're calling `useCallback` with an empty dependency array:

```javascript
const [counter, setCounter] = useState(0);

const incrementOnClick = useCallback(() => {
  setCounter((prev) => prev + 1);
}, []);
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

`useRef` returns a reference to a mutable object. Like in `useState`, the initial value you pass is assigned
only once, no matter how many times the component re-renders. How `useRef` works is beyond the scope of this post, but you can [read more on it here](https://beta.reactjs.org/apis/react/useRef).

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

The key point of the above code is that `doABunchOfStuff` and `config` isn't _referencing_ any data defined **in the component**.

It does not need to tie itself to React's rendering.

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

First, let's put all the code related to the `counter` in one component, called `FancyCounter`:

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
      <FancyNumberListFormatter numberList={randomNumbers} />
    </FancyCounter>
  );
}
```

We pass in `FancyNumberListFormatter` as the `children` of `FancyCounter`. `RandomNumberListAndCounter` will only re-render if its parent changes,
and in our app, this will never happen. So `React.memo` for `FancyNumberListFormatter` is no longer needed!

We can see the React Profiler gives the same results:

![Push state down flamegraph](/assets/blog/reducing-re-renders/pushed-state-flamegraph.png)

![Push state down flamegraph](/assets/blog/reducing-re-renders/pushed-state-ranked.png)

This technique was lifted straight from Dan Abramov himself - and I highly recommend reading [his blog post on it](https://overreacted.io/before-you-memo/).

The basic idea is that the prop `children`, is a reference to some React elements created by the parent.
If the child component has re-rendered, and the `children` prop remains the same, React knows that `children` doesn't have to be rendered again.

### Wrap Up

When we want to create stable references, we can:

1. Define objects and functions outside of a component, if they don't rely on variables defined in the component itself.
2. If they do depend on variables defined in the component, we can use `useCallback` and `useMemo`.
3. If they depend on variables defined in the component that are already stable, we can use `useRef` instead.

When we want to prevent redundant expensive computations on re-render, we can:

1. Pass an initialization function to `useState`, if the result of the computation needs to be part of the component state.
2. Use `useMemo`.

When we want to minimize redundant renders of a component, we can:

1. Use `React.memo` so that a component will only re-render if its props change.
2. Reorganize the component tree, so that state changes are localized to components who consume that state.

In our final optimized example app, we have:

- One component wrapped with `React.memo`
- One object wrapped with `useMemo`
- One callback stored in `useRef`

A more naive approach would have been memoizing every component, object and callback in the app.
