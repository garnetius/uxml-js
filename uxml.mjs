/* ================================= $ J $ =====================================
// <uxml.mjs>
//
// UXML: Universal XML parser and writer.
//
// A minimalist XML subset flavored for markup exchange:
//
//   * Supported node types: tags, text and CDATA sections,
//     comment nodes. XML namespace prefixes are recognized,
//     but aren't treated in any special way.
//   * Recognized entity symbols: &amp, &lt, &gt, &quot, &apos,
//     decimal (&#65) and hexadecimal (&#x41) encoded code points.
//   * The XML declaration, and all top-level processing instructions,
//     and external DTDs are skipped, and inline DTDs are not supported.
//
// Copyright garnetius.
// -------------------------------------------------------------------------- */

"use strict"

import {toInteger} from "../core-js/core.mjs";
import {RadixTree} from "../radix-tree-js/radix-tree.mjs";

/* =============================================================================
// Node
// -------------------------------------------------------------------------- */

class UXMLNode {
get [Symbol.toStringTag]() {
  return "UXMLNode";
}

[Symbol.iterator]() {
  return this.nodes();
}

constructor (type, data, attrs=undefined) {
  /* The node type cannot be changed */
  Object.defineProperties (this, {
    type: {value: type}
  });

  if (type === UXML.nodeType.tag) {
    /* Regular <tag/> */
    Object.defineProperties (this, {
      name: {value: data, writable: true},
      attributes: {value: new RadixTree(attrs)},
      size: {value: 0, writable: true},
      length: {get: function() {return this.size}}
    });
  } else {
    /* Textual or comment node */
    Object.defineProperties (this, {
      value: {value: data, writable: type !== UXML.nodeType.nul}
    });
  }

  /* Implemented as a double-linked list */
  Object.defineProperties (this, {
    previousNode: {value: null, writable: type !== UXML.nodeType.nul},
    superNode:    {value: null, writable: type !== UXML.nodeType.nul},
    firstNode:    {value: null, writable: type !== UXML.nodeType.nul},
    lastNode:     {value: null, writable: type !== UXML.nodeType.nul},
    nextNode:     {value: null, writable: type !== UXML.nodeType.nul}
  });
}

isTag()     {return this.type === UXML.nodeType.tag}
isText()    {return this.type === UXML.nodeType.text}
isCdata()   {return this.type === UXML.nodeType.cdata}
isComment() {return this.type === UXML.nodeType.comment}
isNull()    {return this.type === UXML.nodeType.nul}

toJSON() {return UXML.stringify(this)}
toUSON() {return this}

/* ===--------------------------------------------------------------------------
// Navigation */
$navigate (dir, num) {
  if (num < 0) {
    throw new RangeError();
  }

  let ret = this;

  while (num !== 0) {
    if      (dir === -1) ret = ret.previousNode;
    else if (dir ===  0) ret = ret.superNode;
    else if (dir ===  1) ret = ret.nextNode;

    if (ret === null) {
      return nullNode;
    }

    --num;
  }

  return ret;
}

super (num=1) {
  return this.$navigate (0, num);
}

previous (num=1) {
  return this.$navigate (-1, num);
}

next (num=1) {
  return this.$navigate (1, num);
}

/* ===--------------------------------------------------------------------------
// Skip non-tag nodes while traversing */
$navigateTag (dir, filter) {
  let count = false;

  if (typeof filter === "number") {
    if (filter === 0) return this;
    if (filter < 0) throw new RangeError();
    count = true;
  }

  let ret = this;

  while (true) {
    if      (dir === -1) ret = ret.previousNode;
    else if (dir ===  0) ret = ret.superNode;
    else if (dir ===  1) ret = ret.nextNode;

    if (ret === null) {
      return nullNode;
    }

    if (dir !== 0 && ret.type !== UXML.nodeType.tag) {
      continue;
    }

    if (count) {
      if (--filter === 0) {
        break;
      }
    } else {
      if (filter === ret.name) {
        break;
      }
    }
  }

  return ret;
}

superTag (filter=1) {
  return this.$navigateTag (0, filter);
}

previousTag (filter=1) {
  return this.$navigateTag (-1, filter);
}

nextTag (filter=1) {
  return this.$navigateTag (1, filter);
}

/* ===--------------------------------------------------------------------------
// Same for sub nodes */
first() {
  return this.firstNode || nullNode;
}

firstTag (name="") {
  let ret = this.first();

  if (ret.type !== UXML.nodeType.tag) {
    ret = ret.nextTag();
  }

  if (name.length !== 0) {
    if (name !== ret.name) {
      ret = ret.nextTag (name);
    }
  }

  return ret;
}

/* ===--------------------------------------------------------------------=== */

last() {
  return this.lastNode || nullNode;
}

lastTag (name="") {
  let ret = this.last();

  if (ret.type !== UXML.nodeType.tag) {
    ret = ret.previousTag();
  }

  if (name.length !== 0) {
    if (name !== ret.name) {
      ret = ret.previousTag (name);
    }
  }

  return ret;
}

/* ===--------------------------------------------------------------------------
// Get the node at the specified index */
nth (idx) {
  return this.first().next (idx);
}

nthTag (idx, name="") {
  let ret = this.firstTag (name);

  if (name.length !== 0) {
    if (idx < 0) {
      throw new RangeError();
    }

    while (idx !== 0) {
      ret = ret.nextTag (name);
      --idx;
    }

    return ret;
  }

  return ret.nextTag (idx);
}

/* ===--------------------------------------------------------------------------
// Iterators */
*nodes() {
  let node = this.first();

  while (!node.isNull()) {
    yield node;
    node = node.next();
  }
}

forEach (func, that) {
  for (let node of this.nodes()) {
    func.call (that, node, this);
  }
}

/* ===--------------------------------------------------------------------=== */

*tags(name="") {
  let node = this.firstTag (name);

  while (!node.isNull()) {
    yield node;
    node = node.nextTag ((name.length === 0) ? 1 : name);
  }
}

forEachTag (func, that) {
  for (let node of this.tags()) {
    func.call (that, node, this);
  }
}

/* ===--------------------------------------------------------------------------
// Detach node from its parent */
detach() {
  const prev = this.previousNode;
  const next = this.nextNode;
  const sup = this.superNode;

  if (prev === null) sup.firstNode = next;
  else prev.nextNode = next;

  if (next === null) sup.lastNode = prev;
  else next.previousNode = prev;

  this.superNode = null;
  this.previousNode = null;
  this.nextNode = null;
  --sup.size;

  return this;
}

/* ===--------------------------------------------------------------------------
// Mutation */
append (node) {
  if (this.type !== UXML.nodeType.tag) {
    throw new TypeError();
  }

  if (node.superNode !== null) {
    node.detach();
  }

  node.superNode = this;
  node.previousNode = this.lastNode;

  if (this.lastNode === null) this.firstNode = node;
  else this.lastNode.nextNode = node;

  node.nextNode = null;
  this.lastNode = node;
  ++this.size;

  return this;
}

/* ===--------------------------------------------------------------------------
// Insert before reference node */
insert (node, ref=null) {
  if (this.type !== UXML.nodeType.tag) {
    throw new TypeError();
  }

  if (ref === null) {
    ref = this.firstNode;

    if (ref === null) {
      this.append (node);
      return this;
    }
  } else if (ref.superNode !== this) {
    throw new RangeError();
  }

  if (node.superNode !== null) {
    node.detach();
  }

  node.superNode = this;
  node.previousNode = ref.previousNode;

  if (ref.previousNode === null) this.firstNode = node;
  else node.previousNode.nextNode = node;

  node.nextNode = ref;
  ref.previousNode = node;
  ++this.size;

  return this;
}

/* ===--------------------------------------------------------------------------
// Remove (only if it actually belongs to this node) */
remove (node) {
  if (this.type !== UXML.nodeType.tag) {
    throw new TypeError();
  }

  let iter = this.firstNode;

  while (iter !== null) {
    if (iter === node) {
      node.detach();
      break;
    }

    iter = iter.nextNode;
  }

  return this;
}}

/* =============================================================================
// Document
// -------------------------------------------------------------------------- */

class UXMLDocument {
get [Symbol.toStringTag]() {
  return "UXMLDocument";
}

constructor (name) {
  Object.defineProperties (this, {
    pi: {value: new Array()},
    root: {value: new UXMLNode(UXML.nodeType.tag, name)}
  });
}

toJSON() {return UXML.stringify(this)}
toUSON() {return this}

/* ===--------------------------------------------------------------------------
// Node factories */
static newTagNode (name, attrs=undefined) {
  return new UXMLNode(UXML.nodeType.tag, name, attrs);
}

static newTextNode (value) {
  return new UXMLNode(UXML.nodeType.text, value);
}

static newCdataNode (value) {
  return new UXMLNode(UXML.nodeType.cdata, value);
}

static newCommentNode (value) {
  return new UXMLNode(UXML.nodeType.comment, value);
}}

Object.defineProperties (UXMLDocument, {
  beginning: {value: '<?xml version="1.0" encoding="utf-8"?>'}
});

/* =============================================================================
// Parser
// -------------------------------------------------------------------------- */

class UXMLParser {
get [Symbol.toStringTag]() {
  return "UXMLParser";
}

/* ===--------------------------------------------------------------------------
// Process XML entities into their character equivalents */
static unescape (input) {
  let out = "";
  let from = 0;
  let idx = input.indexOf ('&');
  const len = input.length;

  while (true) {
    if (idx === -1) {
      out += input.substring (from);
      return out;
    }

    const escStart = idx;
    out += input.substring (from, idx);
    idx = input.indexOf (';', ++idx);

    if (idx === -1) {
      return null;
    }

    const ent = input.substring (escStart + 1, idx++);

    if (ent[0] === '#') {
      let codep;

      if (ent[1] === 'x') {
        codep = parseInt (ent.substring (2), 16);
      } else {
        codep = parseInt (ent.substring (1), 10);
      }

      if (isNaN (codep)) {
        return null;
      }

      out += String.fromCodePoint (codep);
      from = idx;
    } else {
      from = idx;

      switch (ent) {
      case "lt":   out += '<';  break;
      case "gt":   out += '>';  break;
      case "quot": out += '"';  break;
      case "apos": out += '\''; break;
      case "amp":  out += '&';  break;
      default: from = escStart;
      }
    }

    idx = input.indexOf ('&', idx);
  }
}

/* ===--------------------------------------------------------------------=== */

parse (input, pos, len) {
  const chrLT = '<'.charCodeAt(0);
  const chrAK = '?'.charCodeAt(0);
  const chrEX = '!'.charCodeAt(0);
  const chrMI = '-'.charCodeAt(0);
  const chrCL = ':'.charCodeAt(0);
  const chrEQ = '='.charCodeAt(0);
  const chrDQ = '"'.charCodeAt(0);
  const chrSQ = "'".charCodeAt(0);
  const chrLB = '['.charCodeAt(0);
  const chrRB = ']'.charCodeAt(0);
  const chrSL = '/'.charCodeAt(0);
  const chrGT = '>'.charCodeAt(0);
  const chrAM = "&".charCodeAt(0);

  const tknNone     = 0;
  const tknTagStart = 1; // <
  const tknAttr     = 2; // attribute
  const tknAttrEq   = 3; // =
  const tknAttrVal  = 4; // "
  const tknTagClose = 5; // /
  const tknTagEnd   = 6; // >
  const tknPi       = 7; // ?
  const tknComment  = 8; // !--
  const tknCdata    = 9; // ![CDATA[
  const tknText     = 10;

  const scopeDoc = 0;
  const scopeTag = 1;

  let chr = 0;
  let p = pos;
  let posNs = 0;
  let decl = false;
  let scope = scopeDoc;
  let wspaceTrail = false;
  const embedded = pos !== 0;

  let doc;
  let superNode;
  let root = null;
  let currNode = null;
  let currTag = "";
  let currAttr = "";
  let pi = [];
  let text;

  /* ===--------------
  // Consume tokens */
  const skipChar = (num=1) => {
    pos += num;
    chr = input.charCodeAt(pos);
  };

  const skipSpace = () => {
    while (pos !== len) {
      chr = input.charCodeAt(pos);
      if (chr > 32) return true;
      ++pos;
    }

    return false;
  };

  const skipTag = (closing) => {
    const start = pos;

    while (pos !== len) {
      chr = input.charCodeAt(pos);

      if (chr === chrGT) return posNs !== pos - 1;
      if (chr === chrSL) return !closing && posNs !== pos - 1;
      if (chr <=  32   ) return !closing && posNs !== pos - 1;
      if (chr === chrCL) {
        if (posNs !== 0) return false;
        if (pos === start) return false;
        posNs = pos;
      } else if (chr < 128
      && !UXML.charLut[toInteger(pos === start)][chr]) return false;

      ++pos;
    }

    return false;
  };

  const skipAttr = () => {
    const start = pos;

    while (pos !== len) {
      chr = input.charCodeAt(pos);

      if (chr === chrEQ) return posNs !== pos - 1;
      if (chr === chrCL) {
        if (posNs !== 0) return false;
        if (pos === start) return false;
        posNs = pos;
      } else if (chr < 128
      && !UXML.charLut[toInteger(pos === start)][chr]) return false;

      ++pos;
    }

    return false;
  };

  const skipToValue = () => {
    chr = input.charCodeAt(pos);
    return chr === chrDQ || chr === chrSQ;
  };

  const skipValue = () => {
    while (pos !== len) {
      if (input.charCodeAt(pos) === chr) return true;
      ++pos;
    }

    return false;
  };

  const skipText = () => {
    while (pos !== len) {
      chr = input.charCodeAt(pos);
      if (chr === chrLT) return true;
      ++pos;
    }

    return false;
  };

  const skipCDATA = () => {
    while (pos !== len) {
      chr = input.charCodeAt(pos);

      if (chr === chrRB
      && input.charCodeAt(pos + 1) === chrRB
      && input.charCodeAt(pos + 2) === chrGT) {
        return true;
      }

      ++pos;
    }

    return false;
  };

  const skipComment = () => {
    while (pos !== len) {
      chr = input.charCodeAt(pos);

      if (chr === chrMI
      && input.charCodeAt(pos + 1) === chrMI
      && input.charCodeAt(pos + 2) === chrGT) {
        return true;
      }

      ++pos;
    }

    return false;
  };

  /* Normalize whitespace inside processing instruction */
  const skipPi = () => {
    /* Skip all leading whitespace */
    let o = "";
    const x = chr === chrEX;

    while (true) {
      ++pos;

      if (pos === len) {
        return false;
      }

      if ((chr = input.charCodeAt(pos)) > 32) {
        break;
      }
    }

    /* Replace blocks of whitespace inside PI with single whitespace,
    // unless inside string */
    let q;
    let string = false;
    p = pos;

    while (true) {
      do {
        if (string && chr === q) {
          string = false;
        } else if (!string && chr === chrDQ || chr === chrSQ) {
          string = true;
          q = chr;
        } else if (!string && chr === chrAK) {
          if (x || input.charCodeAt(pos + 1) !== chrGT) {
            return false;
          }

          if (!decl) {
            decl = true;
          }

          pi.push ('<?' + o + input.substring (p, pos) + '?>');
          ++pos;

          return true;
        } else if (!string && chr === chrGT) {
          if (!x) {
            return false;
          }

          pi.push ('<!' + o + input.substring (p, pos));

          return true;
        }

        if (++pos === len) {
          return false;
        }

        chr = input.charCodeAt(pos);
      } while (chr > 32);

      o += input.substring (p, pos);

      do {
        if (++pos === len) {
          return false;
        }

        chr = input.charCodeAt(pos);
      } while (chr <= 32);

      /* Skip all trailing whitespace */
      if (string || (chr !== chrAK && chr !== chrGT)) {
        o += ' ';
      }

      p = pos;
    }
  };

  /* ===--------------------------
  // Extract the token contents */
  const getToken = () => {
    return input.substring (p, pos);
  };

  const getTag = () => {
    currTag = getToken();
    posNs = 0;
  };

  const getAttr = () => {
    currAttr = getToken();
    posNs = 0;
  };

  const getText = (first, ends) => {
    let wl = '';
    let wr = '';

    /* Skip leading whitespace */
    let wp = p;
    let wpos = pos;
    while (input.charCodeAt(wp) <= 32) ++wp;

    /* Add leading whitespace if there was actually
    // a leading whitespace block, this text node isn't
    // the first one, and there was no trailing whitespace
    // already added before */
    if (wp === pos) {
      if (!ends && !first && !wspaceTrail) {
        wspaceTrail = true;
        wl = ' ';
      } else {
        wspaceTrail = false;
      }
    } else {
      if (wp !== p && !first && !wspaceTrail) {
        wl = ' ';
      }

      /* Skip trailing whitespace */
      wspaceTrail = false;
      while (input.charCodeAt(wpos - 1) <= 32) --wpos;

      /* Add trailing whitespace if there was a trailing
      // whitespace region and the current tag isn't
      // about to be closed */
      if (wpos !== pos && !ends) {
        wspaceTrail = true;
        wr = ' ';
      }
    }

    return wl + input.substring (wp, wpos)
    .replace (UXML.pattern.wspace, ' ') + wr;
  };

  /* ===-------------------------------------------------------------
  // Determine the current token kind based on the current context */
  const tokenKind = () => {
    if (scope === scopeDoc) {
      if (chr === chrLT) {
        skipChar();

        if (chr === chrEX) {
          if (input.charCodeAt(pos + 1) === chrMI
          &&  input.charCodeAt(pos + 2) === chrMI) {
            pos += 3;
            return tknComment; // <!--
          }

          if (input.charCodeAt(pos + 1) === chrLB
          &&  input.charCodeAt(pos + 7) === chrLB
          &&  input.charCodeAt(pos + 2) === 67/* C */
          &&  input.charCodeAt(pos + 3) === 68/* D */
          &&  input.charCodeAt(pos + 4) === 65/* A */
          &&  input.charCodeAt(pos + 5) === 84/* T */
          &&  input.charCodeAt(pos + 6) === 65/* A */) {
            pos += 8;
            return tknCdata; // <![CDATA[
          }

          return tknPi; // e.g. <!DOCTYPE>
        }

        if (chr === chrAK) {
          return tknPi; // e.g. <?xml version="1.0" encoding="utf-8"?>
        }

        if (chr <= 32) {
          --pos;
          return tknText;
        }

        return tknTagStart; // <
      } else {
        if (root !== null) return tknText;
        if (chr <= 32) return tknNone;
        return tknText;
      }
    } else switch (chr) {
      case chrEQ: return tknAttrEq;
      case chrDQ: return tknAttrVal;
      case chrSQ: return tknAttrVal;
      case chrSL: return tknTagClose;
      case chrGT: return tknTagEnd;
      default: return (chr > 32) ? tknAttr : tknNone;
    }
  };

  /* ===------------------------
  // Handle the current token */
  const processToken = () => {
    switch (tokenKind()) {
      case tknTagStart:
        if (chr === chrSL) {
          /* The tag is closing */
          p = ++pos;
          if (!skipTag (true)) return false;
          getTag();

          /* See if it matches the current opened */
          if (currTag === currNode.name) {
            superNode = currNode.superNode;

            if (superNode === null) {
              /* We've reached the end of the root node.
              // This will cause parsing to stop. */
              this.pos = pos + 1;
              pos = len;
              return true;
            }

            currNode = superNode;
          } else {
            return false;
          }

          skipChar();
        } else {
          /* The tag is opening */
          p = pos;
          if (!skipTag (false)) return false;
          getTag();

          if (root === null) {
            if (!decl) {
              currNode = root = UXMLDocument.newTagNode (currTag);
            } else {
              doc = new UXMLDocument(currTag);
              doc.pi.push (...pi);
              currNode = root = doc.root;
            }
          } else {
            const newNode = UXMLDocument.newTagNode (currTag);
            currNode.append (newNode);
            currNode = newNode;
          }

          scope = scopeTag;
        }

        break;
      case tknAttr:
        p = pos;
        if (!skipAttr()) return false;
        getAttr();
        break;
      case tknAttrEq:
        ++pos;
        if (!skipToValue()) return false;
        p = ++pos;
        if (!skipValue()) return false;
        text = getToken().replace (UXML.pattern.wspace, ' ');
        currNode.attributes.set (currAttr, text);
        skipChar();
        break;
      case tknTagClose:
        skipChar();

        if (chr === chrGT) {
          superNode = currNode.superNode;

          if (superNode === null) {
            /* The root has no sub nodes */
            this.pos = pos + 1;
            pos = len;
            return true;
          }

          currNode = superNode;
          break;
        }

        return false;
      case tknTagEnd:
        skipChar();
        scope = scopeDoc;
        break;
      case tknCdata:
        p = pos;
        if (!skipCDATA()) return false;
        currNode.append (UXMLDocument.newCdataNode (getToken()));
        skipChar (3);
        break;
      case tknComment:
        p = pos;
        if (!skipComment()) return false;
        currNode.append (UXMLDocument.newCommentNode (getToken()));
        skipChar (3);
        break;
      case tknPi:
        if (embedded) return false;
        if (!skipPi()) return false;
        skipChar();
        break;
      case tknText:
        p = pos;
        if (!skipText()) return false;
        text = getText (currNode.length === 0
        , input[pos + 1].charCodeAt(0) === chrSL);
        if (text.length !== 0) {
          text = UXMLParser.unescape (text);
          if (text === null) return false;
          currNode.append (UXMLDocument.newTextNode (text));
        }
        break;
      case tknNone:
        skipSpace();
        break;
    }

    return true;
  };

  skipSpace();

  while (pos !== len) {
    //console.log (pos, input[pos]);
    if (!processToken()) {
      return null;
    }
  }

  return decl ? doc : currNode;
}}

/* =============================================================================
// Formatter
// -------------------------------------------------------------------------- */

class UXMLFormatter {
get [Symbol.toStringTag]() {
  return "UXMLFormatter";
}

/* ===--------------------------------------------------------------------------
// Convert forbidden code points back to XML entities */
static escape (str, regex) {
  let out = "";
  let idx = 0;

  while (true) {
    const match = regex.exec (str);

    if (match === null) {
      out += str.substr (idx);
      break;
    }

    out += str.substring (idx, match.index);
    const chr = str[match.index];

    switch (chr) {
    case '<': out += "&lt;"; break;
    case '>': out += "&gt;"; break;
    case '"': out += "&quot;"; break;
    case "'": out += "&apos;"; break;
    case '&': out += "&amp;"; break;
    default:  out += "&#" + chr.codePointAt(0).toString (10) + ';';
    }

    idx = regex.lastIndex;
  }

  return out;
}

/* ===--------------------------------------------------------------------=== */

format (node, indent=0, opts=UXML.defFmtOpts) {
  /* A list of code points that must be
  // forced into XML entities */
  let regexEsc = UXML.pattern.escape;

  if (Array.isArray (opts.codepts)) {
    /* (Re-)build regular expression */
    let str = "[<>\"'&";

    for (let codep of opts.codepts) {
      if (Array.isArray (codep)) {
        let codep1 = codep[0];
        let codep2 = codep[1];

        if (typeof codep1 !== "number") {
          codep1 = codep1.codePointAt(0);
        } if (typeof codep2 !== "number") {
          codep2 = codep2.codePointAt(0);
        }

        str += "\\u{" + codep1.toString (16) + '}'
        +     "-\\u{" + codep2.toString (16) + '}';
      } else {
        if (typeof codep !== "number") {
          codep = codep.codePointAt(0);
        }

        str += "\\u{" + codep.toString (16) + '}';
      }
    }

    regexEsc = new RegExp(str + ']', "ug");
  }

  /* See if whole XML document is being serialized,
  // or just a node */
  let doc;

  if (node instanceof UXMLDocument) {
    if (opts.omitSelf || opts.noIndentFirst) {
      throw new RangeError();
    }

    doc = node;
    node = doc.root;
  }

  /* A heuristic to determine if indentation on a tag
  // can be performed */
  const canIndent = (node, depth) => {
    if (!indent) {
      return false;
    }

    const ofSpace = (str) => {
      for (let idx = 0; idx !== str.length; ++idx) {
        if (str.charCodeAt(idx) > 32) {
          return false;
        }
      }

      return true;
    };

    let sub = node.firstNode;

    while (sub !== null) {
      if (sub.type === UXML.nodeType.text) {
        if (!ofSpace (sub.value)) {
          return false;
        }
      } else if (sub.type === UXML.nodeType.cdata) {
        return false;
      }

      sub = sub.nextNode;
    }

    /* Remove inter-tag whitespace */
    let next = node.firstNode;

    while (next !== null) {
      sub = next;
      next = next.nextNode;

      if (sub.type === UXML.nodeType.text) {
        sub.detach();
      }
    }

    return true;
  };

  /* Output the header if the input is an XML document */
  let buf;
  let currDepth = opts.depth;
  const eol = indent ? '\n' : '';

  buf = new Array();

  if (doc !== undefined) {
    for (let pi of doc.pi) {
      buf.push (pi + eol);
    }
  }

  /* Construct indentation string for the current depth */
  const indentStr = (indent) => {
    return ' '.repeat (currDepth * indent);
  };

  /* Serialize node according to its type */
  const outputNode = (outNode, omitSelf, pindented) => {
    const indented = indent * (pindented && canIndent (outNode));
    pindented = indent * !!pindented;

    if (outNode.type === UXML.nodeType.text) {
      buf.push (UXMLFormatter.escape (outNode.value, regexEsc));
      return;
    }

    if (outNode.type === UXML.nodeType.cdata) {
      buf.push ('<![CDATA[' + outNode.value + ']]>');
      return;
    }

    if (outNode.type === UXML.nodeType.comment) {
      buf.push (indentStr (pindented) + '<!--' + outNode.value + '-->');
      return;
    }

    let name;
    let first = outNode.firstNode;

    if (!omitSelf) {
      name = outNode.name;
      let str = indentStr (pindented) + '<' + name;

      for (let [attr, value] of outNode.attributes) {
        str += ' ' + attr + '="' + UXMLFormatter.escape (value, regexEsc) + '"';
      }

      if (!first) {
        str += '/>';
        buf.push (str);
        return;
      }

      str += '>' + (indented ? eol : '');
      buf.push (str);
      ++currDepth;
    }

    while (first) {
      outputNode (first, false, indented);
      first = first.nextNode;

      if (indented && first !== null) {
        buf.push (eol);
      }
    }

    if (!omitSelf) {
      --currDepth;
      buf.push ((indented ? eol : '') + indentStr (indented)
      + "</" + name + '>');
    }
  };

  outputNode (node, opts.omitSelf, true);

  if (opts.noIndentFirst) {
    buf[0] = buf[0].trimLeft();
  }

  return buf.join ('');
}}

/* =============================================================================
// Main interface like USON (or JSON)
// -------------------------------------------------------------------------- */

const UXML = new Object();

Object.defineProperties (UXML, {
  [Symbol.toStringTag]: {get: () => "UXML"},

  nodeType: {value: {
    nul: 0,
    tag: 1,
    text: 2,
    cdata: 3,
    comment: 4
  }},

  charLut: {value: [[
    false, false, false, false, false, false, false, false,
    false, false, false, false, false, false, false, false,
    false, false, false, false, false, false, false, false,
    false, false, false, false, false, false, false, false,
    false, false, false, false, false, false, false, false,
    false, false, false, false, false, true,  false, false,
    true,  true,  true,  true,  true,  true,  true,  true,
    true,  true,  false, false, false, false, false, false,
    false, true,  true,  true,  true,  true,  true,  true,
    true,  true,  true,  true,  true,  true,  true,  true,
    true,  true,  true,  true,  true,  true,  true,  true,
    true,  true,  true,  false, false, false, false, true,
    false, true,  true,  true,  true,  true,  true,  true,
    true,  true,  true,  true,  true,  true,  true,  true,
    true,  true,  true,  true,  true,  true,  true,  true,
    true,  true,  true,  false, false, false, false, false
  ], [
    false, false, false, false, false, false, false, false,
    false, false, false, false, false, false, false, false,
    false, false, false, false, false, false, false, false,
    false, false, false, false, false, false, false, false,
    false, false, false, false, false, false, false, false,
    false, false, false, false, false, true,  false, false,
    false, false, false, false, false, false, false, false,
    false, false, false, false, false, false, false, false,
    false, true,  true,  true,  true,  true,  true,  true,
    true,  true,  true,  true,  true,  true,  true,  true,
    true,  true,  true,  true,  true,  true,  true,  true,
    true,  true,  true,  false, false, false, false, true,
    false, true,  true,  true,  true,  true,  true,  true,
    true,  true,  true,  true,  true,  true,  true,  true,
    true,  true,  true,  true,  true,  true,  true,  true,
    true,  true,  true,  false, false, false, false, false
  ]]},

  isTagName: {value: (str) => {
    return (str.length !== 0 && !UXML.pattern.tag.test (data)
    && !UXML.pattern.ns.test (data));
  }},

  isAttrName: {value: (str) => {
    return UXML.isTagName (str);
  }},

  parse: {value: (input) => {
    const doc = new UXMLParser().parse (input, 0, input.length);

    if (doc === null) {
      throw new SyntaxError();
    }

    return doc;
  }},

  defFmtOpts: {value: {
    codepts: "",
    omitSelf: false,
    depth: 0,
    noIndentFirst: false
  }},

  stringify: {value: (node, indent, opts=UXML.defFmtOpts) =>
    new UXMLFormatter().format (node, indent, opts)
  },

  pattern: {value: {
    ns: /^:|:.*:|:$/,
    tag: /[\x00-\x20<>"'&=/]/,
    wspace: /[\t\n\r\x20]+/g,
    escape: /[<>"'&]/g
  }}
});

/* ===--------------------------------------------------------------------------
// A hack to reduce branches */
const nullNode = new UXMLNode(UXML.nodeType.nul, "");

/* ===--------------------------------------------------------------------------
// Exports */
export {
  UXML,
  UXMLNode,
  UXMLDocument,
  UXMLParser,
  UXMLFormatter
}

/* ===------------------------------- {U} --------------------------------=== */
