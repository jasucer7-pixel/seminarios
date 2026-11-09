/* Seminarios — app de estudio. Sin dependencias. */
(function () {
  "use strict";

  var SEMS = window.SEMINARIOS || [];
  var TXT = window.TEXTOS || {};
  var app = document.getElementById("app");
  var crumb = document.getElementById("crumb");
  var timers = [];

  /* ---------- utilidades ---------- */
  function esc(s) {
    return String(s).replace(/[&<>"]/g, function (c) {
      return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c];
    });
  }
  function md(s) {
    return esc(s)
      .replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>")
      .replace(/\*(.+?)\*/g, "<em>$1</em>");
  }
  function h(tag, props) {
    var el = document.createElement(tag);
    props = props || {};
    Object.keys(props).forEach(function (k) {
      var v = props[k];
      if (v == null || v === false) return;
      if (k === "class") el.className = v;
      else if (k === "html") el.innerHTML = v;
      else if (k.slice(0, 2) === "on") el.addEventListener(k.slice(2), v);
      else el.setAttribute(k, v === true ? "" : v);
    });
    for (var i = 2; i < arguments.length; i++) add(el, arguments[i]);
    return el;
  }
  function add(el) {
    for (var i = 1; i < arguments.length; i++) {
      var kid = arguments[i];
      if (kid == null || kid === false) continue;
      if (Array.isArray(kid)) kid.forEach(function (k) { add(el, k); });
      else el.appendChild(typeof kid === "object" ? kid : document.createTextNode(String(kid)));
    }
    return el;
  }
  function clear(el) { while (el.firstChild) el.removeChild(el.firstChild); return el; }
  function shuffle(a) {
    a = a.slice();
    for (var i = a.length - 1; i > 0; i--) {
      var j = Math.floor(Math.random() * (i + 1));
      var t = a[i]; a[i] = a[j]; a[j] = t;
    }
    return a;
  }
  function today(offset) {
    var d = new Date();
    d.setHours(12, 0, 0, 0);
    if (offset) d.setDate(d.getDate() + offset);
    return d.toISOString().slice(0, 10);
  }
  function fmtDate(iso) {
    if (!iso) return "";
    var diff = Math.round((new Date(iso + "T12:00:00") - new Date(today() + "T12:00:00")) / 864e5);
    if (diff === 0) return "hoy";
    if (diff === 1) return "mañana";
    if (diff === -1) return "ayer";
    if (diff > 1) return "en " + diff + " días";
    return "hace " + -diff + " días";
  }
  function toast(msg) {
    var t = h("div", { class: "toast", role: "status" }, msg);
    document.body.appendChild(t);
    setTimeout(function () { t.remove(); }, 2200);
  }

  /* ---------- almacenamiento local ---------- */
  var KEY = "seminarios:v1";
  var mem = {};
  function loadStore() {
    try { mem = JSON.parse(localStorage.getItem(KEY)) || {}; } catch (e) { mem = {}; }
  }
  function saveStore() {
    try { localStorage.setItem(KEY, JSON.stringify(mem)); } catch (e) { /* sin almacenamiento */ }
  }
  function st(id) {
    mem[id] = mem[id] || { cards: {}, notes: {} };
    mem[id].cards = mem[id].cards || {};
    mem[id].notes = mem[id].notes || {};
    return mem[id];
  }
  loadStore();

  /* ---------- tarjetas: repetición espaciada (Leitner) ---------- */
  var INTERVAL = [0, 1, 3, 7, 14, 30];
  function cardState(id, i) { return st(id).cards[i] || { box: 0, due: today() }; }
  function dueCount(id) {
    var t = TXT[id];
    if (!t) return 0;
    var n = 0, now = today();
    t.tarjetas.forEach(function (_, i) { if (cardState(id, i).due <= now) n++; });
    return n;
  }

  /* ---------- enrutado por hash ---------- */
  var TABS = [
    ["ruta", "Ruta 20′"], ["resumen", "Resumen"], ["mapa", "Mapa"], ["esquema", "Esquema"],
    ["conceptos", "Conceptos"], ["casos", "Casos"], ["debate", "Debate"],
    ["tarjetas", "Tarjetas"], ["test", "Test"], ["ejercicios", "Ejercicios"], ["citas", "Citas"]
  ];
  function go(hash) {
    if (location.hash.slice(1) === hash) render(); else location.hash = hash;
  }
  function render() {
    timers.forEach(clearInterval); timers = [];
    var hsh = location.hash.slice(1);
    clear(app);
    window.scrollTo(0, 0);
    if (hsh === "metodo") return viewMethod();
    if (hsh.indexOf("s-") === 0) return viewSeminar(hsh.slice(2));
    if (hsh.indexOf("t-") === 0) {
      var parts = hsh.slice(2).split("-");
      if (TXT[parts[0]]) return viewText(parts[0], parts[1] || defaultTab(parts[0]));
    }
    viewHome();
  }
  function defaultTab(id) { return st(id).ruta ? "resumen" : "ruta"; }
  function setCrumb(parts) {
    clear(crumb);
    parts.forEach(function (p, i) {
      if (i) add(crumb, " / ");
      add(crumb, p[1] ? h("a", { href: "#" + p[1], style: "color:inherit" }, p[0]) : p[0]);
    });
  }

  /* ---------- vista: inicio ---------- */
  function progressChips(id) {
    var s = st(id), t = TXT[id], chips = [];
    chips.push(s.ruta ? h("span", { class: "chip ok" }, "Ruta ✓ " + fmtDate(s.ruta)) : h("span", { class: "chip off" }, "Ruta pendiente"));
    if (s.test) chips.push(h("span", { class: "chip" + (s.test.best >= 80 ? " ok" : "") }, "Test " + s.test.best + "%"));
    var due = dueCount(id);
    if (s.ruta || Object.keys(s.cards).length) {
      chips.push(due ? h("span", { class: "chip" }, due + " tarjetas hoy") : h("span", { class: "chip ok" }, "Tarjetas al día"));
    } else {
      chips.push(h("span", { class: "chip off" }, t.tarjetas.length + " tarjetas"));
    }
    return h("div", { class: "chips" }, chips);
  }
  function textItem(id) {
    var t = TXT[id];
    return h("a", { class: "item", href: "#t-" + id },
      h("div", null, h("div", { class: "who" }, t.autor)),
      h("span", { class: "go", "aria-hidden": "true" }, "→"),
      h("div", null, h("div", { class: "what" }, t.titulo), h("div", { class: "who" }, t.tituloEs)),
      h("div", null, progressChips(id))
    );
  }
  function viewHome() {
    setCrumb([]);
    add(app, h("section", { class: "hero" },
      h("span", { class: "eyebrow" }, "Estudio de textos"),
      h("h1", null, "Entiende un texto en 20 minutos"),
      h("p", null, "Cada texto tiene una ruta guiada: activar, panorama, estructura, conceptos, test y explicarlo con tus palabras. Después, tarjetas de repaso espaciado para que no se olvide."),
      h("div", { class: "row" }, h("a", { class: "btn ghost", href: "#metodo" }, "Cómo funciona el método"))
    ));
    SEMS.forEach(function (s) {
      var head = h("div", { class: "sem-head" },
        h("div", null, h("span", { class: "eyebrow" }, s.tema), h("h2", null, s.nombre)),
        s.textos.length > 1 ? h("a", { href: "#s-" + s.id, class: "small" }, "Comparar y sintetizar →") : null
      );
      var list = s.textos.length
        ? s.textos.filter(function (id) { return TXT[id]; }).map(textItem)
        : h("div", { class: "empty" }, "Aún no hay textos. Cuando tengas el PDF, se añade aquí con su resumen, mapa, tarjetas y test.");
      add(app, h("section", { class: "sem" }, head, list));
    });
  }

  /* ---------- vista: texto ---------- */
  function viewText(id, tab) {
    var t = TXT[id];
    var sem = SEMS.filter(function (s) { return s.id === t.seminario; })[0];
    setCrumb([[sem ? sem.nombre : "", sem ? "s-" + sem.id : ""], [t.autor]]);
    add(app, h("header", { class: "thead" },
      h("span", { class: "eyebrow" }, t.autor),
      h("h1", null, t.titulo),
      h("div", { class: "es" }, t.tituloEs),
      h("div", { class: "src" }, t.fuente)
    ));
    var tabs = h("nav", { class: "tabs", role: "tablist" });
    TABS.forEach(function (tb) {
      var label = tb[1];
      if (tb[0] === "tarjetas") { var d = dueCount(id); if (d && (st(id).ruta || Object.keys(st(id).cards).length)) label += " · " + d; }
      add(tabs, h("button", { class: "tab", role: "tab", "aria-selected": tb[0] === tab ? "true" : "false", onclick: function () { go("t-" + id + "-" + tb[0]); } }, label));
    });
    add(app, tabs);
    var body = h("div", { class: "stack-l" });
    add(app, body);
    var fn = {
      ruta: tabRuta, resumen: tabResumen, mapa: tabMapa, esquema: tabEsquema, conceptos: tabConceptos,
      casos: tabCasos, debate: tabDebate, tarjetas: tabTarjetas, test: tabTest, ejercicios: tabEjercicios, citas: tabCitas
    }[tab] || tabResumen;
    fn(t, body);
    var sel = tabs.querySelector('[aria-selected="true"]');
    if (sel && sel.scrollIntoView) sel.scrollIntoView({ block: "nearest", inline: "center" });
  }

  function section(title, hint) {
    return h("div", { class: "stack" }, h("h2", null, title), hint ? h("p", { class: "muted small" }, hint) : null);
  }

  /* --- Resumen --- */
  function thesisBlock(t) {
    return h("div", { class: "stack" }, h("span", { class: "eyebrow" }, "Tesis en una frase"), h("p", { class: "thesis", html: md(t.tesis) }));
  }
  function sectionsBlock(t, openFirst) {
    return h("div", null, t.secciones.map(function (s, i) {
      return h("details", { class: "sec", open: openFirst && i === 0 },
        h("summary", null, s.t),
        h("ul", null, s.p.map(function (p) { return h("li", { html: md(p) }); }))
      );
    }));
  }
  function tabResumen(t, el) {
    add(el, thesisBlock(t));
    add(el, h("div", { class: "stack" }, h("span", { class: "eyebrow" }, "En un párrafo"), h("div", { class: "prose" }, h("p", { html: md(t.parrafo) }))));
    add(el, h("div", { class: "stack" }, h("span", { class: "eyebrow" }, "Sección por sección"), sectionsBlock(t, false)));
  }

  /* --- Mapa mental (SVG, árbol horizontal) --- */
  function wrapText(s, max) {
    var words = s.split(" "), lines = [], cur = "";
    words.forEach(function (w) {
      if ((cur + " " + w).trim().length > max && cur) { lines.push(cur); cur = w; }
      else cur = (cur + " " + w).trim();
    });
    if (cur) lines.push(cur);
    return lines;
  }
  function mindMap(root) {
    var NS = "http://www.w3.org/2000/svg";
    var COL = 214, NW = 184, LH = 16, PAD = 9, GAP = 10;
    var collapsed = {};
    var box = h("div", { class: "mapbox" });
    function draw() {
      clear(box);
      var nodes = [], maxDepth = 0, cursor = 0;
      function lay(n, depth, path, branch) {
        var lines = wrapText(n.t, depth === 0 ? 20 : 25);
        var node = { n: n, depth: depth, path: path, lines: lines, h: lines.length * LH + PAD * 2, branch: branch, kids: [] };
        maxDepth = Math.max(maxDepth, depth);
        nodes.push(node);
        var kids = n.c && !collapsed[path] ? n.c : [];
        if (kids.length) {
          kids.forEach(function (c, i) { node.kids.push(lay(c, depth + 1, path + "." + i, depth === 0 ? i : branch)); });
          var first = node.kids[0], last = node.kids[node.kids.length - 1];
          node.y = (first.y + last.y) / 2;
        } else {
          node.y = cursor + node.h / 2;
          cursor += node.h + GAP;
        }
        node.x = depth * COL;
        return node;
      }
      lay(root, 0, "0", -1);
      var W = maxDepth * COL + NW + 4, H = Math.max(cursor - GAP, 40) + 4;
      var svg = document.createElementNS(NS, "svg");
      svg.setAttribute("width", W); svg.setAttribute("height", H);
      svg.setAttribute("viewBox", "-2 -2 " + W + " " + H);
      svg.setAttribute("role", "img");
      svg.setAttribute("aria-label", "Mapa mental: " + root.t);
      function color(nd) { return nd.branch < 0 ? "var(--accent)" : "var(--b" + ((nd.branch % 5) + 1) + ")"; }
      nodes.forEach(function (nd) {
        nd.kids.forEach(function (k) {
          var x1 = nd.x + NW, y1 = nd.y, x2 = k.x, y2 = k.y, mx = (x1 + x2) / 2;
          var p = document.createElementNS(NS, "path");
          p.setAttribute("d", "M" + x1 + "," + y1 + " C" + mx + "," + y1 + " " + mx + "," + y2 + " " + x2 + "," + y2);
          p.setAttribute("fill", "none");
          p.setAttribute("stroke", color(k));
          p.setAttribute("stroke-opacity", "0.55");
          p.setAttribute("stroke-width", nd.depth === 0 ? "2" : "1.4");
          svg.appendChild(p);
        });
      });
      nodes.forEach(function (nd) {
        var g = document.createElementNS(NS, "g");
        g.setAttribute("class", "node" + (nd.depth === 0 ? " root" : ""));
        var r = document.createElementNS(NS, "rect");
        r.setAttribute("x", nd.x); r.setAttribute("y", nd.y - nd.h / 2);
        r.setAttribute("width", NW); r.setAttribute("height", nd.h); r.setAttribute("rx", 8);
        if (nd.depth === 0) { r.setAttribute("fill", "var(--accent)"); }
        else if (nd.depth === 1) { r.setAttribute("fill", "var(--surface)"); r.setAttribute("stroke", color(nd)); r.setAttribute("stroke-width", "1.6"); }
        else { r.setAttribute("fill", "var(--bg)"); r.setAttribute("stroke", "var(--line)"); }
        g.appendChild(r);
        if (nd.depth === 1) {
          var bar = document.createElementNS(NS, "rect");
          bar.setAttribute("x", nd.x); bar.setAttribute("y", nd.y - nd.h / 2);
          bar.setAttribute("width", 4); bar.setAttribute("height", nd.h); bar.setAttribute("rx", 2);
          bar.setAttribute("fill", color(nd));
          g.appendChild(bar);
        }
        nd.lines.forEach(function (ln, i) {
          var tx = document.createElementNS(NS, "text");
          tx.setAttribute("x", nd.x + 12);
          tx.setAttribute("y", nd.y - nd.h / 2 + PAD + LH * i + 12);
          if (nd.depth === 1) tx.setAttribute("font-weight", "600");
          tx.textContent = ln;
          g.appendChild(tx);
        });
        if (nd.n.c && nd.depth > 0) {
          var sign = document.createElementNS(NS, "text");
          sign.setAttribute("x", nd.x + NW - 16); sign.setAttribute("y", nd.y + 4);
          sign.setAttribute("fill", "var(--muted)");
          sign.textContent = collapsed[nd.path] ? "+" : "–";
          g.appendChild(sign);
        }
        if (nd.n.c && nd.depth > 0) {
          g.addEventListener("click", function () { collapsed[nd.path] = !collapsed[nd.path]; draw(); });
        }
        svg.appendChild(g);
      });
      box.appendChild(svg);
    }
    draw();
    return box;
  }
  function outline(root) {
    function ul(n) {
      return h("ul", { class: "outline" }, (n.c || []).map(function (c) {
        return h("li", null, c.t, c.c ? ul(c) : null);
      }));
    }
    return h("div", { class: "card" }, h("h3", null, root.t), ul(root));
  }
  function mapBlock(t) {
    var wrap = h("div", { class: "stack" });
    var mode = "mapa";
    var holder = h("div");
    var b1 = h("button", { class: "btn", onclick: function () { mode = "mapa"; paint(); } }, "Mapa");
    var b2 = h("button", { class: "btn", onclick: function () { mode = "lista"; paint(); } }, "Lista");
    function paint() {
      clear(holder);
      b1.className = "btn" + (mode === "mapa" ? " primary" : "");
      b2.className = "btn" + (mode === "lista" ? " primary" : "");
      add(holder, mode === "mapa" ? mindMap(t.mapa) : outline(t.mapa));
    }
    paint();
    add(wrap, h("div", { class: "row" }, b1, b2, h("span", { class: "muted small" }, "Toca una rama para plegarla. Desliza en horizontal en el móvil.")), holder);
    return wrap;
  }
  function tabMapa(t, el) {
    add(el, section("Mapa mental", "Mira el mapa 1 minuto. Luego tápalo e intenta reproducir las ramas principales de memoria."));
    add(el, mapBlock(t));
  }

  /* --- Esquema del argumento --- */
  function argBlock(t) {
    return h("div", { class: "stack" },
      h("div", { class: "legend" }, h("span", { class: "lp" }, "Premisa"), h("span", { class: "lc" }, "Conclusión"), h("span", { class: "lo" }, "Objeción"), h("span", { class: "lr" }, "Respuesta")),
      h("div", { class: "arg" }, t.argumento.map(function (a) {
        return h("div", { class: "arg-row " + a.k }, h("span", { class: "arg-id" }, a.id), h("div", { html: md(a.t) }));
      }))
    );
  }
  function tabEsquema(t, el) {
    add(el, section("Esquema del argumento", "La estructura lógica del texto: de qué parte, a dónde llega y qué objeciones responde."));
    add(el, argBlock(t));
  }

  /* --- Conceptos --- */
  function conceptsBlock(t, hideDefault) {
    var hide = hideDefault;
    var list = h("div");
    var sw = h("input", { type: "checkbox", id: "hide-" + t.id });
    sw.checked = hide;
    sw.addEventListener("change", function () { hide = sw.checked; paint(); });
    function paint() {
      clear(list);
      t.conceptos.forEach(function (c) {
        var row = h("div", { class: "concept" + (hide ? " hidden-def" : "") },
          h("div", { class: "term" }, c.t),
          c.en ? h("div", { class: "en" }, c.en) : null,
          h("div", { class: "def", html: md(c.d) }),
          c.e ? h("div", { class: "ex", html: "Ej.: " + md(c.e) }) : null
        );
        row.addEventListener("click", function () { row.classList.remove("hidden-def"); });
        add(list, row);
      });
    }
    paint();
    return h("div", { class: "stack" },
      h("label", { class: "switch", for: "hide-" + t.id }, sw, "Modo autoevaluación: oculta definiciones (toca para ver)"),
      list);
  }
  function tabConceptos(t, el) {
    add(el, section("Conceptos clave", "Activa el modo autoevaluación: intenta definir cada término antes de tocarlo."));
    add(el, conceptsBlock(t, false));
  }

  /* --- Casos --- */
  function casesBlock(t) {
    return h("div", { class: "cases" }, t.casos.map(function (c) {
      var r = h("div", { class: "reveal", html: md(c.prueba), hidden: true });
      var b = h("button", { class: "btn", onclick: function () { r.hidden = false; b.hidden = true; } }, "¿Qué prueba?");
      return h("div", { class: "card case" },
        h("span", { class: "by" }, c.de),
        h("h3", null, c.n),
        h("p", { html: md(c.d) }),
        h("div", null, b), r
      );
    }));
  }
  function tabCasos(t, el) {
    add(el, section("Casos y ejemplos", "Antes de pulsar, piensa: ¿qué intuición provoca el caso y contra quién se usa?"));
    add(el, casesBlock(t));
  }

  /* --- Debate --- */
  function tabDebate(t, el) {
    add(el, section("Con quién discute", "Posición de cada autor y la respuesta del texto."));
    add(el, h("div", { class: "tablebox" }, h("table", null,
      h("thead", null, h("tr", null, h("th", null, "Autor"), h("th", null, "Posición"), h("th", null, "Respuesta del texto"))),
      h("tbody", null, t.autores.map(function (a) {
        return h("tr", null, h("td", null, a.n), h("td", { html: md(a.pos) }), h("td", { html: md(a.resp) }));
      }))
    )));
    add(el, section("Errores frecuentes"));
    add(el, h("ul", { class: "evid" }, t.errores.map(function (e) { return h("li", { html: md(e) }); })));
  }

  /* --- Citas --- */
  function tabCitas(t, el) {
    add(el, section("Citas clave", "En inglés original, para citarlas en el seminario."));
    add(el, h("div", null, t.citas.map(function (c) {
      return h("blockquote", null, h("span", { class: "c", html: "«" + md(c.c) + "»" }), h("span", { class: "meta", html: c.p + " · " + md(c.n) }));
    })));
  }

  /* --- Tarjetas (Leitner) --- */
  function tabTarjetas(t, el) {
    add(el, section("Tarjetas", "Repetición espaciada: lo que sabes vuelve más tarde; lo que fallas, hoy mismo."));
    var holder = h("div", { class: "stack" });
    add(el, holder);
    var all = false;
    function start() {
      var now = today();
      var queue = t.tarjetas.map(function (_, i) { return i; }).filter(function (i) { return all || cardState(t.id, i).due <= now; });
      queue = shuffle(queue);
      var total = queue.length, done = 0;
      function boxesInfo() {
        var counts = [0, 0, 0, 0, 0, 0];
        t.tarjetas.forEach(function (_, i) { counts[cardState(t.id, i).box]++; });
        return h("div", { class: "boxes" }, ["Nuevas", "Caja 1", "Caja 2", "Caja 3", "Caja 4", "Dominadas"].map(function (n, i) {
          return h("span", null, n + " ", h("b", null, counts[i]), i < 5 ? " ·" : "");
        }));
      }
      function next() {
        clear(holder);
        if (!queue.length) {
          var nextDue = t.tarjetas.map(function (_, i) { return cardState(t.id, i).due; }).sort()[0];
          add(holder, h("div", { class: "card stack" },
            h("h3", null, total ? "Sesión terminada" : "No hay tarjetas pendientes hoy"),
            h("p", { class: "muted" }, "Próximo repaso: " + fmtDate(nextDue) + "."),
            boxesInfo(),
            h("div", { class: "row" },
              h("button", { class: "btn", onclick: function () { all = true; start(); } }, "Repasar todas igualmente"))
          ));
          return;
        }
        var i = queue[0];
        var c = t.tarjetas[i];
        var ans = h("div", { class: "a", html: md(c.a), hidden: true });
        var rate = h("div", { class: "row", hidden: true });
        var show = h("button", { class: "btn primary", onclick: function () { ans.hidden = false; rate.hidden = false; show.hidden = true; } }, "Mostrar respuesta");
        function grade(g) {
          var s = cardState(t.id, i);
          if (g === 0) { s = { box: 1, due: today() }; queue.push(queue.shift()); }
          else if (g === 1) { s = { box: Math.max(1, s.box), due: today(1) }; queue.shift(); done++; }
          else { var b = Math.min(5, s.box + 1); s = { box: b, due: today(INTERVAL[b]) }; queue.shift(); done++; }
          st(t.id).cards[i] = s; saveStore();
          next();
        }
        add(rate,
          h("button", { class: "btn", onclick: function () { grade(0); } }, "No lo sabía"),
          h("button", { class: "btn", onclick: function () { grade(1); } }, "Dudé"),
          h("button", { class: "btn primary", onclick: function () { grade(2); } }, "Lo sabía"));
        add(holder,
          h("div", { class: "meter", "aria-hidden": "true" }, h("i", { style: "width:" + (total ? Math.round((done / total) * 100) : 0) + "%" })),
          h("div", { class: "card fc" },
            h("div", { class: "stack" }, h("span", { class: "eyebrow" }, (done + 1) + " de " + total), h("div", { class: "q", html: md(c.q) }), ans),
            h("div", { class: "row" }, show, rate)
          ),
          boxesInfo());
      }
      next();
    }
    start();
  }

  /* --- Test --- */
  function normalizeQ(q, src) {
    if (typeof q.v === "boolean") return { q: q.q, o: ["Verdadero", "Falso"], r: q.v ? 0 : 1, x: q.x, src: src, fixed: true };
    return { q: q.q, o: q.o, r: q.r, x: q.x, src: src };
  }
  function quiz(questions, onEnd, opts) {
    opts = opts || {};
    var box = h("div", { class: "quiz stack" });
    function run(qs) {
      var idx = 0, score = 0, fails = [];
      function show() {
        clear(box);
        if (idx >= qs.length) {
          var pct = Math.round((score / qs.length) * 100);
          if (onEnd) onEnd(pct, fails);
          var msg = pct >= 90 ? "Dominado. Pasa a los ejercicios." : pct >= 70 ? "Bien. Repasa las falladas." : "Vuelve al esquema y al mapa, y repite.";
          add(box, h("div", { class: "card stack" },
            h("span", { class: "eyebrow" }, "Resultado"),
            h("div", { class: "score" }, pct + "%"),
            h("p", null, score + " de " + qs.length + " correctas. " + msg),
            h("div", { class: "row" },
              fails.length ? h("button", { class: "btn primary", onclick: function () { run(shuffle(fails)); } }, "Repetir falladas (" + fails.length + ")") : null,
              h("button", { class: "btn", onclick: function () { run(shuffle(questions)); } }, "Repetir todo"))
          ));
          return;
        }
        var q = qs[idx];
        var order = q.fixed ? q.o.map(function (_, i) { return i; }) : shuffle(q.o.map(function (_, i) { return i; }));
        var fb = h("div");
        var nextBtn = h("button", { class: "btn primary", hidden: true, onclick: function () { idx++; show(); } }, idx === qs.length - 1 ? "Ver resultado" : "Siguiente");
        var btns = order.map(function (oi) {
          var b = h("button", { class: "opt", html: md(q.o[oi]) });
          b.addEventListener("click", function () {
            var ok = oi === q.r;
            if (ok) score++; else fails.push(q);
            btns.forEach(function (bb, k) {
              bb.disabled = true;
              if (order[k] === q.r) bb.classList.add("right");
            });
            if (!ok) b.classList.add("wrong");
            add(fb, h("div", { class: "feedback " + (ok ? "ok" : "ko"), html: "<strong>" + (ok ? "Correcto." : "No.") + "</strong> " + md(q.x || "") }));
            nextBtn.hidden = false;
            nextBtn.focus();
          });
          return b;
        });
        add(box,
          h("div", { class: "meter", "aria-hidden": "true" }, h("i", { style: "width:" + Math.round((idx / qs.length) * 100) + "%" })),
          h("div", { class: "row", style: "justify-content:space-between" },
            h("span", { class: "eyebrow" }, "Pregunta " + (idx + 1) + " de " + qs.length),
            q.src && opts.showSrc ? h("span", { class: "src-tag" }, q.src) : null),
          h("div", { class: "qtext", html: md(q.q) }),
          h("div", { class: "opts" }, btns), fb, h("div", null, nextBtn));
      }
      show();
    }
    run(shuffle(questions));
    return box;
  }
  function saveTest(id, pct) {
    var s = st(id);
    s.test = { best: Math.max(pct, (s.test && s.test.best) || 0), last: pct, date: today() };
    saveStore();
  }
  function tabTest(t, el) {
    var s = st(t.id);
    add(el, section("Test", "Recuperar de memoria es lo que fija el aprendizaje. Responde sin mirar." + (s.test ? " Mejor resultado: " + s.test.best + "%." : "")));
    add(el, quiz(t.test.map(function (q) { return normalizeQ(q, t.autor); }), function (pct) { saveTest(t.id, pct); }));
  }

  /* --- Ejercicios --- */
  function exercise(ex, noteKey, owner) {
    var s = st(owner);
    var ta = h("textarea", { id: "ej-" + noteKey, placeholder: "Escribe tu respuesta antes de ver el modelo…" });
    ta.value = s.notes[noteKey] || "";
    ta.addEventListener("input", function () { s.notes[noteKey] = ta.value; saveStore(); });
    var pista = h("p", { class: "muted small", html: "Pista: " + md(ex.pista || ""), hidden: true });
    var checks = h("div", { class: "checks" }, (ex.criterios || []).map(function (c, i) {
      var id = "cr-" + noteKey + "-" + i;
      return h("label", { for: id }, h("input", { type: "checkbox", id: id }), h("span", { html: md(c) }));
    }));
    var model = h("div", { class: "stack", hidden: true },
      h("div", { class: "reveal", html: "<strong>Respuesta modelo.</strong> " + md(ex.modelo) }),
      ex.criterios ? h("div", { class: "stack" }, h("span", { class: "eyebrow" }, "¿Tu respuesta incluye…?"), checks) : null);
    var bModel = h("button", { class: "btn primary", onclick: function () { model.hidden = false; bModel.hidden = true; } }, "Comparar con el modelo");
    return h("div", { class: "card stack" },
      ex.k ? h("span", { class: "ex-k" }, ex.k) : null,
      h("h3", { html: md(ex.q) }),
      ex.pista ? h("div", null, h("button", { class: "btn ghost", onclick: function (e) { pista.hidden = false; e.target.hidden = true; } }, "Ver pista"), pista) : null,
      ta,
      h("div", { class: "row" }, bModel),
      model);
  }
  function tabEjercicios(t, el) {
    add(el, section("Ejercicios", "Escribe primero, compara después. Tus respuestas se guardan en este navegador."));
    t.ejercicios.forEach(function (ex, i) { add(el, exercise(ex, t.id + "-" + i, t.id)); });
  }

  /* --- Preguntas previas --- */
  function pretestBlock(t) {
    return h("div", { class: "stack" }, t.preguntasPrevias.map(function (p, i) {
      var noteKey = t.id + "-pre-" + i;
      var inp = h("input", { type: "text", id: "pre-" + noteKey, placeholder: "Tu intuición en una línea" });
      inp.value = st(t.id).notes[noteKey] || "";
      inp.addEventListener("input", function () { st(t.id).notes[noteKey] = inp.value; saveStore(); });
      var a = h("div", { class: "reveal", html: md(p.a), hidden: true });
      var b = h("button", { class: "btn", onclick: function () { a.hidden = false; b.hidden = true; } }, "Ver qué dice el texto");
      return h("div", { class: "card stack" }, h("h3", { html: md(p.q) }), inp, h("div", null, b), a);
    }));
  }

  /* --- Ruta 20 minutos --- */
  var STEPS = [
    { k: "activa", n: "Activa", min: 2, why: "Intenta responder antes de saber. Aunque falles, el intento prepara la memoria para la respuesta (efecto pre-test)." },
    { k: "panorama", n: "Panorama", min: 3, why: "Primero la idea general y luego los detalles: la tesis es el gancho del que cuelga todo lo demás." },
    { k: "estructura", n: "Estructura", min: 5, why: "Mapa + esquema lógico: verlo de dos formas (visual y verbal) se recuerda mejor que leerlo una vez." },
    { k: "claves", n: "Conceptos y casos", min: 3, why: "Define cada término antes de destaparlo. En cada caso, pregúntate qué prueba." },
    { k: "recupera", n: "Recupera", min: 5, why: "Test sin mirar. Recuperar de memoria es la técnica de estudio con más evidencia." },
    { k: "explica", n: "Explica", min: 2, why: "Explícalo como a alguien que no sabe nada. Donde te atasques, ahí está el hueco." }
  ];
  function tabRuta(t, el) {
    var s = st(t.id);
    var r = s.rutaState || { step: 0, left: 20 * 60 };
    var running = false;
    var clock = h("div", { class: "clock", "aria-live": "off" });
    var playBtn = h("button", { class: "btn primary" });
    var stepsBar = h("div", { class: "steps" });
    var content = h("div", { class: "stack-l" });

    function persist() { s.rutaState = r; saveStore(); }
    function fmt(sec) {
      var neg = sec < 0; sec = Math.abs(sec);
      return (neg ? "+" : "") + String(Math.floor(sec / 60)).padStart(2, "0") + ":" + String(sec % 60).padStart(2, "0");
    }
    function paintClock() {
      clock.textContent = fmt(r.left);
      clock.className = "clock" + (r.left < 0 ? " over" : "");
      playBtn.textContent = running ? "Pausar" : (r.left === 20 * 60 ? "Empezar" : "Continuar");
    }
    playBtn.addEventListener("click", function () { running = !running; paintClock(); });
    var iv = setInterval(function () {
      if (!running) return;
      r.left--; paintClock();
      if (r.left % 10 === 0) persist();
    }, 1000);
    timers.push(iv);

    function paintSteps() {
      clear(stepsBar);
      STEPS.forEach(function (sp, i) {
        add(stepsBar, h("button", {
          class: "step" + (i < r.step ? " done" : "") + (i === r.step ? " cur" : ""),
          onclick: function () { r.step = i; persist(); paintStep(); },
          "aria-label": "Paso " + (i + 1) + ": " + sp.n
        }, h("i"), h("span", null, sp.n)));
      });
    }
    function finish() {
      running = false;
      s.ruta = today();
      t.tarjetas.forEach(function (_, i) { if (!s.cards[i]) s.cards[i] = { box: 0, due: today(1) }; });
      r = { step: 0, left: 20 * 60 };
      s.rutaState = r;
      saveStore();
      clear(content);
      paintClock();
      add(content, h("div", { class: "card stack" },
        h("span", { class: "eyebrow" }, "Ruta completada"),
        h("h2", null, "Ya tienes el texto. Ahora, que no se olvide."),
        h("p", null, "Plan de repaso espaciado:"),
        h("ul", { class: "evid" },
          h("li", null, h("strong", null, "Mañana (5 min):"), " tarjetas."),
          h("li", null, h("strong", null, "En 3 días (8 min):"), " tarjetas + test completo."),
          h("li", null, h("strong", null, "En una semana (15 min):"), " ejercicios de ensayo y la comparación del seminario."),
          h("li", null, h("strong", null, "Antes del seminario:"), " test mixto del seminario y las citas clave.")),
        h("div", { class: "row" },
          h("button", { class: "btn primary", onclick: function () { go("t-" + t.id + "-ejercicios"); } }, "Ir a los ejercicios"),
          h("button", { class: "btn", onclick: function () { go(""); } }, "Volver al inicio"))
      ));
      toast("Ruta guardada. Repaso: mañana.");
    }
    function paintStep() {
      paintSteps();
      clear(content);
      var sp = STEPS[r.step];
      add(content, h("div", { class: "stack" },
        h("div", { class: "step-title" }, h("span", { class: "eyebrow" }, "Paso " + (r.step + 1) + " · " + sp.min + " min"), h("h2", null, sp.n)),
        h("p", { class: "muted" }, sp.why)));
      var body = h("div", { class: "stack-l" });
      if (sp.k === "activa") add(body, pretestBlock(t));
      if (sp.k === "panorama") {
        add(body, thesisBlock(t));
        add(body, h("div", { class: "prose" }, h("p", { html: md(t.parrafo) })));
      }
      if (sp.k === "estructura") { add(body, mapBlock(t)); add(body, h("h3", null, "Esquema del argumento")); add(body, argBlock(t)); }
      if (sp.k === "claves") { add(body, conceptsBlock(t, true)); add(body, h("h3", null, "Casos")); add(body, casesBlock(t)); }
      if (sp.k === "recupera") {
        add(body, quiz(shuffle(t.test).slice(0, 8).map(function (q) { return normalizeQ(q, t.autor); }), function (pct) { saveTest(t.id, pct); }));
      }
      if (sp.k === "explica") add(body, exercise(t.ejercicios[0], t.id + "-0", t.id));
      add(content, body);
      add(content, h("div", { class: "nav" },
        r.step > 0 ? h("button", { class: "btn", onclick: function () { r.step--; persist(); paintStep(); window.scrollTo(0, 0); } }, "← Anterior") : h("span"),
        r.step < STEPS.length - 1
          ? h("button", { class: "btn primary", onclick: function () { r.step++; persist(); paintStep(); window.scrollTo(0, 0); } }, "Siguiente: " + STEPS[r.step + 1].n + " →")
          : h("button", { class: "btn primary", onclick: finish }, "Terminar ruta ✓")));
    }

    add(el, h("div", { class: "stack" },
      h("div", { class: "route-head" },
        h("div", { class: "stack", style: "gap:2px" }, h("span", { class: "eyebrow" }, "Ruta guiada"), clock),
        h("div", { class: "row" }, playBtn,
          h("button", { class: "btn ghost", onclick: function () { r = { step: 0, left: 20 * 60 }; running = false; persist(); paintClock(); paintStep(); } }, "Reiniciar"))),
      stepsBar));
    add(el, content);
    paintClock();
    paintStep();
  }

  /* ---------- vista: seminario ---------- */
  function viewSeminar(id) {
    var s = SEMS.filter(function (x) { return x.id === id; })[0];
    if (!s) return viewHome();
    setCrumb([[s.nombre]]);
    add(app, h("header", { class: "thead" },
      h("span", { class: "eyebrow" }, s.tema),
      h("h1", null, s.nombre),
      s.orden ? h("p", { class: "es" }, s.orden) : null));
    var el = h("div", { class: "stack-l" });
    add(app, el);
    add(el, h("div", { class: "stack" }, s.textos.filter(function (x) { return TXT[x]; }).map(textItem)));
    if (s.comparacion) {
      add(el, section("Comparación", "Las dos lecturas, punto por punto."));
      add(el, h("div", { class: "tablebox" }, h("table", null,
        h("thead", null, h("tr", null, h("th", null, ""), s.comparacion.columnas.map(function (c) { return h("th", null, c); }))),
        h("tbody", null, s.comparacion.filas.map(function (f) {
          return h("tr", null, f.map(function (c) { return h("td", { html: md(c) }); }));
        }))
      )));
    }
    if (s.conexiones) {
      add(el, section("Conexiones", "Dónde coinciden y dónde chocan."));
      add(el, h("div", null, s.conexiones.map(function (c) {
        return h("div", { class: "concept" }, h("div", { class: "term", html: md(c.t) }), h("div", { html: md(c.d) }));
      })));
    }
    var tq = [];
    s.textos.forEach(function (x) { if (TXT[x]) TXT[x].test.forEach(function (q) { tq.push(normalizeQ(q, TXT[x].autor)); }); });
    if (s.textos.length > 1 && tq.length) {
      add(el, section("Test mixto", "Preguntas de ambos textos mezcladas. Mezclar temas obliga a distinguir a quién pertenece cada idea."));
      add(el, quiz(shuffle(tq).slice(0, 12), null, { showSrc: true }));
    }
    if (s.sintesis) {
      add(el, section("Preguntas de síntesis", "Para preparar la discusión del seminario."));
      s.sintesis.forEach(function (ex, i) { add(el, exercise(ex, "sem-" + s.id + "-" + i, "sem-" + s.id)); });
    }
  }

  /* ---------- vista: método ---------- */
  function viewMethod() {
    setCrumb([["Método"]]);
    add(app, h("header", { class: "thead" },
      h("span", { class: "eyebrow" }, "Cómo funciona"),
      h("h1", null, "El método de los 20 minutos"),
      h("p", { class: "es" }, "La app no te hace releer: te hace recuperar, estructurar y explicar, que es lo que la investigación sobre aprendizaje muestra que funciona.")));
    var el = h("div", { class: "stack-l" });
    add(app, el);
    add(el, h("div", { class: "method" }, STEPS.map(function (sp, i) {
      var acc = STEPS.slice(0, i).reduce(function (a, b) { return a + b.min; }, 0);
      return h("div", { class: "m" },
        h("div", { class: "t" }, acc + "–" + (acc + sp.min) + "′"),
        h("div", { class: "stack", style: "gap:4px" }, h("h3", null, sp.n), h("p", { class: "muted" }, sp.why)));
    })));
    add(el, section("En qué se basa"));
    var ev = [
      ["Práctica de recuperación (test)", "alta", "Hacerse preguntas mejora la retención a largo plazo mucho más que releer (Roediger y Karpicke, 2006). Dunlosky et al. (2013) la sitúan entre las dos técnicas de mayor utilidad."],
      ["Repaso espaciado", "alta", "Repartir los repasos en días separados vence a la curva del olvido (Ebbinghaus; Cepeda et al., 2006). Por eso las tarjetas vuelven a los 1, 3, 7, 14 y 30 días."],
      ["Pre-test", "media", "Intentar responder antes de estudiar, incluso fallando, mejora lo que se aprende después (Richland, Kornell y Kao, 2009)."],
      ["Organizador previo", "media", "Dar primero la idea general facilita integrar los detalles (Ausubel, 1960). De ahí la tesis en una frase."],
      ["Mapas y doble codificación", "media", "Combinar lo visual y lo verbal mejora el recuerdo (Paivio); los mapas conceptuales superan a la lectura de listas o textos (Nesbit y Adesope, 2006)."],
      ["Autoexplicación y Feynman", "media", "Explicar con tus palabras revela lo que no entiendes (Chi et al., 1994)."],
      ["Interrogación elaborativa", "media", "Preguntarse «¿por qué?» y «¿qué prueba esto?» ante cada caso conecta la idea con lo que ya sabes."],
      ["Práctica intercalada", "media", "Mezclar preguntas de varios textos obliga a discriminar entre ideas (Rohrer y Taylor, 2007). Es el test mixto del seminario."],
      ["Releer y subrayar", "baja", "Dan sensación de dominio pero rinden poco (Dunlosky et al., 2013). Aquí el subrayado solo marca lo que debes poder recuperar."]
    ];
    add(el, h("ul", { class: "evid" }, ev.map(function (e) {
      return h("li", null, h("strong", null, e[0]), h("span", { class: "lvl " + e[1] }, "utilidad " + e[1]), h("br"), h("span", { class: "muted" }, e[2]));
    })));
    add(el, section("Plan de repaso"));
    add(el, h("div", { class: "tablebox" }, h("table", null,
      h("thead", null, h("tr", null, h("th", null, "Cuándo"), h("th", null, "Qué"), h("th", null, "Tiempo"))),
      h("tbody", null, [
        ["Día 0", "Ruta 20′", "20 min"],
        ["Día 1", "Tarjetas pendientes", "5 min"],
        ["Día 3", "Tarjetas + test completo", "8 min"],
        ["Día 7", "Ejercicios de ensayo + comparación del seminario", "15 min"],
        ["Antes del seminario", "Test mixto + citas clave", "10 min"]
      ].map(function (r) { return h("tr", null, r.map(function (c) { return h("td", null, c); })); }))
    )));
    add(el, h("p", { class: "muted small" }, "Tu progreso (tarjetas, test, respuestas) se guarda solo en este navegador."));
  }

  window.addEventListener("hashchange", render);
  render();
})();
