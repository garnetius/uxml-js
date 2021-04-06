/* ================================= $ J $ =====================================
// <uxml2uson.mjs>
//
// UXML to USON converter.
//
// This plug-in performs rough (since no schema is involved) conversion
// of an XML DOM tree into USON data structure.
//
// Copyright garnetius.
// -------------------------------------------------------------------------- */

"use strict"

import {UXML} from "./uxml.mjs";
import {USON, USONVerbatim} from "../uson-js/uson.mjs";

/* =============================================================================
// Add static functions
// -------------------------------------------------------------------------- */

Object.defineProperties (UXML, {

/* ===--------------------------------------------------------------------------
// Convert XML node attributes */
toUsonAttrs: {value: function (obj, node) {
  for (let [key, value] of node.attributes) {
    obj[key] = value;
  }
}},

/* ===--------------------------------------------------------------------------
// Convert XML node */
toUsonNode: {value: function (node, superNode) {
  const isText = (node) => {
    let out = "";

    for (let leaf of node) {
      if (leaf.type === UXML.nodeType.tag) return null;
      if (leaf.type !== UXML.nodeType.comment) out += leaf.value;
    }

    return out;
  };

  let coll = new Object();
  let iter = node;

  if (superNode !== null) {
    this.toUsonAttrs (coll, superNode);
  }

  while (!iter.isNull()) {
    let newObj;

    /* Skip the textual and comment nodes */
    if (iter.type !== UXML.nodeType.tag) {
      iter = iter.nextTag();
      continue;
    }

    const text = isText (iter);

    if (text !== null) {
      /* Handle the `<node/>` and `<node>value</node>`
      // kind of markup */
      const str = text.trim();
      const isVerb = str.indexOf ('\n') !== -1;

      if (iter.attributes.size === 0) {
        if (isVerb) newObj = new USONVerbatim(str);
        else newObj = str;
      } else {
        const textObj = new Object();
        this.toUsonAttrs (textObj, iter);

        if (str !== "") {
          if (isVerb) textObj[USON.$] = new USONVerbatim(str);
          else textObj[USON.$] = str;
        }

        newObj = textObj;
      }
    } else {
      /* Recursion case */
      newObj = this.toUsonNode (iter.firstTag(), iter);
    }

    if (Array.isArray (coll)) {
      coll.push (newObj);
    } else {
      if (coll.hasOwnProperty (iter.name)) {
        /* Key collision: turn into array */
        coll = [coll[iter.name], newObj];
      } else {
        coll[iter.name] = newObj;
      }
    }

    iter = iter.nextTag();
  }

  return coll;
}},

/* ===--------------------------------------------------------------------------
// Convert XML document */
toUson: {value: function (doc) {
  return this.toUsonNode (doc.root, null);
}}

/* ===------------------------------- {U} --------------------------------=== */

});
