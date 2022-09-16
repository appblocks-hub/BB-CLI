/**
 * Copyright (c) Appblocks. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

/* eslint-disable */
const isObject = (x) => Object(x) === x

const isArray = Array.isArray

const mut = (o, [k, v]) => ((o[k] = v), o)

const diff1 = (left = {}, right = {}, rel = 'left') =>
  Object.entries(left)
    .map(([k, v]) =>
      //   isObject(v) && isObject(right[k]) ? [k, diff1(v, right[k], rel)] : right[k] !== v ? [k, { [rel]: v }] : [k, {}]
      isObject(v) && isObject(right[k]) ? [k, diff1(v, right[k], rel)] : right[k] !== v ? [k, { [rel]: v }] : [k, v]
    )
    // .filter(([k, v]) => Object.keys(v).length !== 0)
    .reduce(mut, isArray(left) && isArray(right) ? [] : {})

const merge = (left = {}, right = {}) =>
  Object.entries(right)
    .map(([k, v]) => (isObject(v) && isObject(left[k]) ? [k, merge(left[k], v)] : [k, v]))
    .reduce(mut, left)

const diff = (x = {}, y = {}) => merge(diff1(x, y, 'left'), diff1(y, x, 'right'))

// const x =
//   { a: 1, b: [ { c: 1 }, { d: 1 }, { e: 1 } ] }

// const y =
//   { a: 1, b: [ { c: 2 }, { d: 1 }, 5, 6 ], z: 2 }

// console.log (diff (x, y))
// ANS is:
// { b:
//     [ { c: { left: 1, right: 2 } }
//     , <1 empty item>
//     , { left: { e: 1 }, right: 5 }
//     , { right: 6 }
//     ]
// , z: { right: 2 }
// }

module.exports = { diffObjects: diff }
