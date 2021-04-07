UXML JS
=======

[![License: MIT](https://img.shields.io/badge/License-MIT-green.svg)](https://opensource.org/licenses/MIT)

Universal eXtensible Markup Language.

A minimalist **XML** subset flavored for markup exchange:

  * Supported node types: tags, text and `CDATA` sections, comment nodes. XML namespace prefixes are recognized, but aren’t treated in any special way.
  * Recognized entity symbols: `&amp`, `&lt`, `&gt`, `&quot`, `&apos`, decimal (`&#65`) and hexadecimal (`&#x41`) encoded code points.
  * The XML declaration, and all top-level processing instructions, and external DTDs are skipped, and inline DTDs are not supported.

Implemented in JavaScript.

## XPath

**UXML** comes with minimal support for XPath-like queries on its node structure.

```js
/* Get the first or last node respectively */
const first = node.first();
const last = node.last();

/* Get the first XML element node (not text or comment) */
const firstTag = node.firstTag();

/* Get the last XML element node */
const lastTag = node.lastTag();

/* Traversal in both directions */
const nextTag = node.next().nextTag(3);
const prevTag = node.prev(4).prevTag();

/* Array-like query for a node at the specified index */
const nth = node.nth(2); // third node

/* Same for tag */
const nthTag = node.nthTag(1); // second tag

/* A tag of a certain name at the specified index */
const nthArticle = node.nthTag(9, "article"); // 10th article

/* A container node */
const container = node.super();

/* A container node two levels above */
const container = node.super(2);
```

Note that much like with XPath it is not necessary to check for result of particular traversal method when constructing complex queries.

Consider:

```js
/* Some really twisted query */
const tag = node.firstTag().nthTag(42).prev(100)
.nextTag(1000).prevTag("cave").super().tag("treasure");

if (!tag.isNull()) {
  console.log ("👑 Found! 💰💰💰");
} else {
  console.log ("🙁 Not found...");
}
```

When any of the methods above fail they return a special `nullNode` XML node value instead of `null` object.

Therefore you can safely write queries of any complexity, — without having to check for `null` at each and every single step to avoid crashing your program.

Simply check if the final result `isNull()` and your are good to go!
