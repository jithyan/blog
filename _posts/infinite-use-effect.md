---
title: "The Infinite useEffect problem"
excerpt: "An list of some of my favourite Typescript features."
date: "2022-08-06T20:00:00.000Z"
author:
  name: Jithya Nanayakkara
ogImage:
  url: ""
---

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
