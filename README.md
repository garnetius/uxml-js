UXML JS
=======

[![License: MIT](https://img.shields.io/badge/License-MIT-green.svg)](https://opensource.org/licenses/MIT)

Micro extensible markup language.

**XML** is a huge and bloated standard, carrying a lot of complexity and legacy burden within itself, like SGML, DTDs (although recent versions of XML has gotten rid of that garbage, finally), or namespaces. It goes well beyond just data representation, attempting to define grammatical rules on how entire markup languages are constructed. It can be argued that XML mixes up *data* design and *language* design in unnecessary and redundant ways, not being particularly good at either one.

> ”XML combines the efficiency of text files with the readability of binary files”
> — Unknown genius.

But at its core XML is fairly simple. And if one looks at XML syntax from a different perspective, ignoring all complexity and requirements of the original standard, a surprisingly beautiful picture can emerge.

**UXML** is a minimalist subset of **XML** flavoured specifically for markup exchange:

  * Supported node types: tags, text and `CDATA` sections, comment nodes. XML namespace prefixes are recognized, but aren’t treated in any special way. It is up to *application layer* how to deal with the prefixed elements.
  * Recognized entity symbols: `&amp`, `&lt`, `&gt`, `&quot`, `&apos`, decimal (`&#65`) and hexadecimal (`&#x41`) encoded code points.
  * The XML declaration, all top-level processing instructions, and external DTDs are skipped, and inline DTDs are not supported.

In other words, **UXML** is great for storing HTML markup or describing GUI layout design. It is not recommended (although not impossible) to use UXML for anything else, like, a general-purpose data serialization format. There are [better things](https://github.com/garnetius/uson-js) for that.

## Examples

XML documents that can be easily processed with **UXML**‘s simple XML parser:

```xml
<div class="70s-it-flyer">
  <p><strong>Rusty Nuts ‘n‘ Bolts</strong> offers fine services
  for your Big Data hosting!</p>
  <ul>
    <li>A large selection of software platforms, including CP/M, MS-DOS,
    and UNIX™. (Yes, the <em>original</em> one!)</li>
    <li>Automated backups on 8” floppy disks! (We have <em>lots</em>
    of these.)</li>
    <li>Unmarked facilities guarded by <big>.50 caliber</big> turrets.
    Big data — big guns.</li>
    <li>Security issues fixed with a hammer and a screwdriver.</li>
  </ul>
  <p>Feeling threatened? Call us at <tel>+1-800-MY-RUSTY</tel> and secure
  one of our exclusive limited-time offers today!</p>
</div>
```

```xml
<publications>
  <publication id="pub-1" date="1585737310">
    <header>Tensions Rise at Capitol</header>
    <p>Thousands of protesters gathered on Capitol Hill with intention
    to build a wall around Donald Trump in order to make
    America great again.</p>
    <p>Police is using water guns in attempt to control the situation,
    albeit with mixed results.</p>
    <footer>Follow us on <a href="#" class="social-link">Twitter</a>
    for updates.</footer>
  </publication>
  <publication id="pub-2" date="1591922408">
    <h1>Weather Report</h1>
    <p>It’s all sunny and shiny today.</p>
  </publication>
</publications>
```

```xml
<form id="message">
  <editbox name="editBoxName" placeholder="Recipient"></editbox>
  <textbox name="textBoxMsg" placeholder="Message"></textbox>
  <button name="btnOK" action="frmMessage.send">OK</button>
</form>
```

```xml
<?xml version="1.0"?>
<persons>
  <person username="JS1">
    <name>John</name>
    <family-name>Smith</family-name>
  </person>
  <person username="MI1">
    <name>Morka</name>
    <family-name>Ismincius</family-name>
  </person>
</persons>
```

```xml
<?xml version="1.0" encoding="utf-8"?>
<俄语 լեզու="ռուսերեն">данные</俄语>
```

The last two are straight from Wikipedia.

If bloat is your concern, then UXML entire parsing code is around [500 lines](https://github.com/garnetius/uxml-js/blob/master/uxml.mjs#L490) of JavaScript.

## XML Declaration

**UXML** has no versions and supports only `UTF-8` encoding. Therefore XML declaration like `<?xml version="1.0" encoding="utf-8"?>` has really no effect and is processed only for backwards-compatibility with actual XML standard, and for distinguishing between `UXMLDocument` and `UXMLNode`.

I.e. the following, without declaration, is parsed as a single `XMLNode`:

```xml
<lonely-tag/>
```

And this would produce `XMLDocument`:

```xml
<?xml version="1.0"?>
<root/>
```

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
const container1 = node.super();

/* A container node two levels above */
const container2 = node.super(2);

/* A container node of the specified name */
const container3 = node.superTag("articles");
```

Note that much like with XPath it is not necessary to check for result of a particular traversal method when constructing complex queries.

Consider:

```js
/* Some really twisted query */
const tag = node.firstTag().nthTag(42).prev(100)
.nextTag(1000).prevTag("cave").super().lastTag("treasure");

if (!tag.isNull()) {
  console.log ("👑 Found! 💰💰💰");
} else {
  console.log ("🙁 Not found...");
}
```

When any of the methods above fail they return a special `nullNode` XML node value instead of a `null` object.

Therefore, you can safely write queries of any complexity, — without having to check for `null` at each and every single step to avoid runtime failure.

Simply check if the final result `isNull()` and your are good to go!
