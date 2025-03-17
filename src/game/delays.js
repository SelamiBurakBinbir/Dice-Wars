import { store } from "./store.js";

export function delay(ms) {
  return new Promise((resolve) => {
    store.currentDelayResolve = resolve;
    store.currentDelayTimeout = setTimeout(() => {
      store.currentDelayResolve = null;
      store.currentDelayTimeout = null;
      resolve();
    }, ms);
  });
}

export function skipDelay() {
  if (store.currentDelayTimeout) {
    clearTimeout(store.currentDelayTimeout);
    store.currentDelayTimeout = null;
  }

  if (store.currentDelayResolve) {
    store.currentDelayResolve();
    store.currentDelayResolve = null;
  }
}
