/* ================================= $ J $ =====================================
// UXML Node.js test program.
// -------------------------------------------------------------------------- */

import {Core} from "../core-js/core.mjs";

Core.infect();

import {UXML} from "./uxml.mjs";
import "./uxml2uson.mjs";

const xml = `<?xml version="1.0" encoding="utf-8"?>
<root>
  <tag key="value">Text</tag>
  <!-- Comment -->
  <tag><![CDATA[Data]]></tag>
</root>`;

const doc = UXML.parse (xml);
console.log (UXML.stringify (doc, 2));

console.log ();
console.log (UXML.toUson (doc));

/* ===------------------------------- {U} --------------------------------=== */
