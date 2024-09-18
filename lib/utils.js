/**
 * Escape a token for use in JSON Pointer
 *
 * @param  {String} token      - array of tokens
 * @param  {String} separator  - separator to use, defaults to /
 * @return {String}            - escaped token
 */
function escape(token, separator) {
    const sep = typeof separator === "string" && separator.length > 0 ? separator : "/"
    let escaped = ""
    for (let l of token) {
        if (l === "~") {
            escaped += "~0"
        } else if (l === sep) {
            escaped += "~1"
        } else {
            escaped += l
        }
    }
    return escaped
}

/**
 * Encode a JSON tokens list
 *
 * @param  {Array}  tokens     - array of tokens
 * @param  {String} separator  - separator to use, defaults to /
 * @return {String}            - JSON Pointer string
 */
export function encode(tokens, separator= "/") {
    let pointer = ""
    for (let token of tokens) {
        pointer += separator + escape(token, separator)
    }
    return pointer
}
