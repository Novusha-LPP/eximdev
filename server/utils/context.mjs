import { AsyncLocalStorage } from 'async_hooks';

export const context = new AsyncLocalStorage();

export const getContext = () => context.getStore();

export const setContext = (data) => {
    const store = context.getStore() || {};
    Object.assign(store, data);
};
