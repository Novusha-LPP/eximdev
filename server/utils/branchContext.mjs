import { AsyncLocalStorage } from 'node:async_hooks';
const branchContext = new AsyncLocalStorage();
export { branchContext };
export default branchContext;
