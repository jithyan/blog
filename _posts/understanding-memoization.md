---
title: "Optimizing React: Part 2 - Understanding Memoization"
excerpt: "In part 2 of the series, I go over how memoization can be used to optimize an example application."
date: "2022-09-12T20:00:00.000Z"
publish: true
author:
  name: Jithya Nanayakkara
---

---

This is the second article in a series covering common techniques for optimizing React's performance by minimizing renders.

1. [Part 1 - Understanding Renders](https://jithyan.github.io/blog/posts/understanding-renders)
2. Part 2 - Understanding Memoization (this post)
3. [Part 3 - Avoiding Memoization](https://jithyan.github.io/blog/posts/avoiding-memoization)

---

In the [previous article](https://jithyan.github.io/blog/posts/understanding-renders), we've covered why a component can re-render, and how variables are given new references on each render.

Now that we have a better understanding of the basics, we can begin to cover how we can optimize a React app.
However in order to do so, we need to actually work on an example application. The example I'm about to introduce is incredibly silly and quite long, but we need it to be a few components deep so we could systematically walk through how it could be optimized.

### A Random Number List Generator and Counter Example

This is what our example app looks like:

![Picture of example app](/blog/assets/blog/reducing-re-renders/app-first-load.png)

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

![Component Hierarchy](/blog/assets/blog/reducing-re-renders/component-hierarchy.png)

So how does this app perform?
To answer this question, I'm going to use the React DevTools Profiler to measure how long it takes to render all the components:

- I just want the `RandomNumberListAndCounter` to re-render, so I can do this by clicking on the
  increment counter button.
- Before clicking the counter button, I hit record on the profiler, then after I see the counter increment, I stop recording.
- If any renders took place, the profile will spit out a flame graph of how long each component took to render.

![First click](/blog/assets/blog/reducing-re-renders/app-first-click.png)

![First click profiler](/blog/assets/blog/reducing-re-renders/app-first-click-profiler.png)

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

![Initialize state only once](/blog/assets/blog/reducing-re-renders/profiler-init-state.png)

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

![How to throttle CPU](/blog/assets/blog/reducing-re-renders/throttle-cpu.png)

And now let's take a look at the React profiler, where I measure what happens after I click the counter button:

![Flamegraph of memoized components](/blog/assets/blog/reducing-re-renders/memo-flamegraph.png)

Looking good - all components that don't need to re-render aren't rendering according to this flamegraph (indicated by the grayed out bars).

But the flamegraph isn't showing all the re-rendering components, so let's switch views to "Ranking":

![Ranking of memoized components](/blog/assets/blog/reducing-re-renders/memo-ranked.png)

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

![Profiler after useMemo](/blog/assets/blog/reducing-re-renders/profiler-usememo.png)

Now only the two expected components re-render.

But... notice the awkward syntax for the incrementer. Since `useMemo` accepts a function, and caches the return value of that function,
we need to pass in a function that returns a function.
Instead, we can use `useCallback` instead of `useMemo` - its explicit purpose is to cache callbacks (aka functions):

```jsx
const incrementer = useCallback(() => {
  setCounter((prev) => prev + 1);
}, []);
```

Now that we understand how to use memoization in React, in the [next article](https://jithyan.github.io/blog/posts/avoiding-memoization), I'm going to cover how we can _avoid_ memoization!
