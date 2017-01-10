// this method return a string that allows us to add metadata
// to a listing without being seen by anybody other than DB3
/* eslint-disable no-irregular-whitespace */
export default input => (
  `[​](HTTP://DB3PARAMSSTART\n${JSON.stringify(input, null, 2).replace(/\)/g, '&paren&&&')}\nDB3PARAMSEND)`
)
/* eslint-enable no-irregular-whitespace */
