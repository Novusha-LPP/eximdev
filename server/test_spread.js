const obj = {
  a: 1,
  b: 2,
  ...{ a: undefined }
};
console.log(obj);
