export default string => {
  try {
    const hiddenSection = string.match(/DB3PARAMSSTART[^]+DB3PARAMSEND/)[0]
    const stringParams = hiddenSection.slice(
      'DB3PARAMSSTART'.length, -'DB3PARAMSEND'.length
    ).replace(/&quot;/g, '"').replace(/&paren&&&/g, ')')
    return JSON.parse(stringParams)
  } catch (error) {
    return false
  }
}
