UXML JS
=======

[![License: MIT](https://img.shields.io/badge/License-MIT-green.svg)](https://opensource.org/licenses/MIT)

Universal eXtensible Markup Language.

A minimalist **XML** subset flavored for markup exchange:

  * Supported node types: tags, text and `CDATA` sections, comment nodes. XML namespace prefixes are recognized, but aren’t treated in any special way.
  * Recognized entity symbols: `&amp`, `&lt`, `&gt`, `&quot`, `&apos`, decimal (`&#65`) and hexadecimal (`&#x41`) encoded code points.
  * The XML declaration, and all top-level processing instructions, and external DTDs are skipped, and inline DTDs are not supported.

Implemented in JavaScript.
