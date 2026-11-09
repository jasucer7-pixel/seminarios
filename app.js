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
    ["ruta", "Ruta 20′"], ["juego", "Juego"], ["resumen", "Resumen"], ["contexto", "Contexto"], ["mapa", "Mapa"], ["esquema", "Esquema"],
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
    if (hsh === "juego") return viewGame("");
    if (hsh.indexOf("j-") === 0) return viewGame(hsh.slice(2));
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
    if (s.game && s.game.best) chips.push(h("span", { class: "chip medal " + (s.game.medal || "none") }, (s.game.medal ? s.game.medal[0].toUpperCase() + s.game.medal.slice(1) + " · " : "Juego · ") + s.game.best + " pts"));
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
      h("div", { class: "row" },
        h("a", { class: "btn primary", href: "#juego" }, "Jugar con todos los textos"),
        h("a", { class: "btn ghost", href: "#metodo" }, "Cómo funciona el método")),
      (function () {
        var pr = gProfile(); if (!pr.xp) return null;
        var L = gLevel(pr.xp);
        return h("div", { class: "g-mini" }, h("span", null, "Nivel " + L.lvl), h("div", { class: "meter" }, h("i", { style: "width:" + Math.round(L.into / L.need * 100) + "%" })), h("span", null, (pr.days || 0) + (pr.days === 1 ? " día" : " días") + " seguidos"));
      })()
    ));
    SEMS.forEach(function (s) {
      var head = h("div", { class: "sem-head" },
        h("div", null, h("span", { class: "eyebrow" }, s.tema), h("h2", null, s.nombre)),
        s.textos.length > 1 ? h("div", { class: "row" }, h("a", { href: "#j-" + s.id, class: "small" }, "Jugar mezclados"), h("a", { href: "#s-" + s.id, class: "small" }, "Comparar y sintetizar →")) : null
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
      if (tb[0] === "contexto" && !t.cronologia) return;
      var label = tb[1];
      if (tb[0] === "tarjetas") { var d = dueCount(id); if (d && (st(id).ruta || Object.keys(st(id).cards).length)) label += " · " + d; }
      add(tabs, h("button", { class: "tab", role: "tab", "aria-selected": tb[0] === tab ? "true" : "false", onclick: function () { go("t-" + id + "-" + tb[0]); } }, label));
    });
    add(app, tabs);
    var body = h("div", { class: "stack-l" });
    add(app, body);
    var fn = {
      ruta: tabRuta, juego: tabJuego, resumen: tabResumen, contexto: t.cronologia ? tabContexto : null, mapa: tabMapa, esquema: tabEsquema, conceptos: tabConceptos,
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

  /* --- Contexto histórico (cronología) --- */
  function timeline(t) {
    return h("ol", { class: "timeline" }, t.cronologia.map(function (c) {
      return h("li", null, h("span", { class: "yr" }, c.a), h("span", { html: md(c.t) }));
    }));
  }
  function tabContexto(t, el) {
    add(el, section("Contexto histórico", "Sitúa el texto: qué pasaba cuando se escribió y a qué responde."));
    add(el, timeline(t));
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
          h("button", { class: "btn primary", onclick: function () { go("t-" + t.id + "-juego"); } }, "Jugar ahora"),
          h("button", { class: "btn", onclick: function () { go("t-" + t.id + "-ejercicios"); } }, "Ir a los ejercicios"),
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
        if (t.cronologia) { add(body, h("h3", null, "Contexto")); add(body, timeline(t)); }
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

  /* ---------- JUEGO ---------- */
  // Partida de 12 retos generados del contenido de uno o varios textos.
  // Recompensas: puntos por rapidez, rachas que multiplican, preguntas doradas (x2),
  // vidas, récords, medallas, XP con niveles y racha de días.
  var G_TOTAL = 12, G_LIVES = 3;
  function gProfile() {
    mem._game = mem._game || { xp: 0, days: 0, last: "", sound: true };
    return mem._game;
  }
  function gLevel(xp) {
    var lvl = 1, need = 300;
    while (xp >= need) { xp -= need; lvl++; need = 300 + (lvl - 1) * 150; }
    return { lvl: lvl, into: xp, need: need };
  }
  function gMedal(acc) { return acc >= 90 ? "oro" : acc >= 75 ? "plata" : acc >= 50 ? "bronce" : ""; }
  function gRank(acc) { return acc >= 90 ? "Maestría" : acc >= 75 ? "Muy bien" : acc >= 50 ? "Vas bien" : "Calentando"; }
  function short(s, n) { s = String(s).replace(/\*\*/g, ""); return s.length > n ? s.slice(0, n - 1).replace(/\s+\S*$/, "") + "…" : s; }
  function pick(a, n, not) {
    return shuffle(a.filter(function (x) { return x !== not; })).slice(0, n);
  }

  /* Sonido: tonos cortos con WebAudio, solo tras interacción */
  var actx = null;
  function beep(freqs, dur, type) {
    if (!gProfile().sound) return;
    try {
      actx = actx || new (window.AudioContext || window.webkitAudioContext)();
      var t0 = actx.currentTime;
      freqs.forEach(function (f, i) {
        var o = actx.createOscillator(), g = actx.createGain();
        o.type = type || "sine"; o.frequency.value = f;
        g.gain.setValueAtTime(0.0001, t0 + i * dur);
        g.gain.exponentialRampToValueAtTime(0.18, t0 + i * dur + 0.01);
        g.gain.exponentialRampToValueAtTime(0.0001, t0 + (i + 1) * dur);
        o.connect(g); g.connect(actx.destination);
        o.start(t0 + i * dur); o.stop(t0 + (i + 1) * dur + 0.02);
      });
    } catch (e) { /* sin audio */ }
  }
  function sfxRight(combo) { var b = 520 * Math.pow(1.06, Math.min(combo, 12)); beep([b, b * 1.25], 0.07, "triangle"); }
  function sfxWrong() { beep([220, 160], 0.12, "sawtooth"); }
  function sfxBig() { beep([523, 659, 784, 1047], 0.09, "triangle"); }
  function buzz(ms) { try { if (navigator.vibrate) navigator.vibrate(ms); } catch (e) { /* nada */ } }
  var reduced = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  /* Confeti en canvas */
  function confetti(amount) {
    if (reduced) return;
    var cv = h("canvas", { class: "confetti", "aria-hidden": "true" });
    document.body.appendChild(cv);
    var W = cv.width = window.innerWidth, H = cv.height = window.innerHeight, ctx = cv.getContext("2d");
    var cs = getComputedStyle(document.documentElement);
    var cols = ["--b1", "--b2", "--b3", "--b4", "--b5", "--gold"].map(function (v) { return cs.getPropertyValue(v).trim() || "#888"; });
    var ps = [];
    for (var i = 0; i < (amount || 120); i++) {
      ps.push({ x: W / 2 + (Math.random() - 0.5) * W * 0.3, y: H * 0.35, vx: (Math.random() - 0.5) * 14, vy: -Math.random() * 14 - 4,
        r: Math.random() * 6 + 4, c: cols[i % cols.length], a: Math.random() * 6, va: (Math.random() - 0.5) * 0.4 });
    }
    var start = performance.now();
    (function frame(now) {
      ctx.clearRect(0, 0, W, H);
      ps.forEach(function (p) {
        p.vy += 0.4; p.x += p.vx; p.y += p.vy; p.vx *= 0.99; p.a += p.va;
        ctx.save(); ctx.translate(p.x, p.y); ctx.rotate(p.a); ctx.fillStyle = p.c;
        ctx.fillRect(-p.r / 2, -p.r / 4, p.r, p.r / 2); ctx.restore();
      });
      if (now - start < 1800) requestAnimationFrame(frame); else cv.remove();
    })(start);
  }

  /* Generador de retos a partir de los datos del texto */
  function makeChallenges(texts) {
    var multi = texts.length > 1, pool = [];
    texts.forEach(function (t) {
      var tag = t.autor;
      t.test.forEach(function (q) {
        if (typeof q.v === "boolean") pool.push({ kind: "vf", src: tag, q: q.q, o: ["Verdadero", "Falso"], r: q.v ? 0 : 1, x: q.x, fixed: true, time: 9 });
        else pool.push({ kind: "mc", src: tag, q: q.q, o: q.o, r: q.r, x: q.x, time: 16 });
      });
      t.tarjetas.forEach(function (c) {
        var others = pick(t.tarjetas, 2, c).map(function (o) { return o.a; });
        pool.push({ kind: "mc", label: "Tarjeta", src: tag, q: c.q, o: [c.a].concat(others), r: 0, x: "", time: 18 });
      });
      t.conceptos.forEach(function (c) {
        var others = pick(t.conceptos, 3, c);
        pool.push({ kind: "mc", label: "¿Qué término es?", src: tag, q: short(c.d, 170), o: [c.t].concat(others.map(function (o) { return o.t; })), r: 0, x: "**" + c.t + "**: " + c.d, time: 14 });
        var fake = Math.random() < 0.5, other = others[0];
        pool.push({ kind: "vf", label: "Relámpago", src: tag, q: "**" + c.t + "**: " + short(fake ? other.d : c.d, 150), o: ["Verdadero", "Falso"], r: fake ? 1 : 0, fixed: true,
          x: fake ? "Esa es la definición de **" + other.t + "**." : "Correcto: es su definición.", time: 8 });
      });
      if (t.conceptos.length >= 4) {
        for (var k = 0; k < 3; k++) pool.push({ kind: "match", src: tag, pairs: pick(t.conceptos, 4), time: 40 });
      }
      t.casos.forEach(function (c) {
        if (t.casos.length < 3) return;
        var others = pick(t.casos, 2, c);
        pool.push({ kind: "mc", label: "Caso", src: tag, q: "¿Qué prueba **" + c.n + "**?", o: [c.prueba].concat(others.map(function (o) { return o.prueba; })), r: 0, x: c.d, time: 20 });
      });
      var obs = t.argumento.filter(function (a) { return a.k === "objecion"; });
      var res = t.argumento.filter(function (a) { return a.k === "respuesta"; });
      if (obs.length >= 2 && res.length >= 2) {
        obs.forEach(function (o) {
          var i = t.argumento.indexOf(o), ans = t.argumento[i + 1];
          if (!ans || ans.k !== "respuesta") return;
          pool.push({ kind: "mc", label: "Réplica", src: tag, q: "Objeción: " + o.t + " ¿Qué responde el texto?", o: [ans.t].concat(pick(res, 2, ans).map(function (x) { return x.t; })), r: 0, x: "", time: 20 });
        });
      }
      if (t.cronologia && t.cronologia.length >= 4) {
        for (var j = 0; j < 3; j++) pool.push({ kind: "order", src: tag, items: pick(t.cronologia, 4), time: 30 });
      }
      if (multi) {
        t.citas.forEach(function (c) {
          pool.push({ kind: "mc", label: "¿Quién lo dijo?", src: "", q: "«" + c.c + "»", o: texts.map(function (x) { return x.autor; }), r: texts.indexOf(t), x: c.n, fixed: true, time: 12 });
        });
      }
    });
    // Mezcla equilibrada por tipo, para que la partida sea variada
    var byKind = {};
    shuffle(pool).forEach(function (c) { (byKind[c.kind + (c.label || "")] = byKind[c.kind + (c.label || "")] || []).push(c); });
    var keys = Object.keys(byKind), out = [], ki = 0;
    while (out.length < G_TOTAL + 6 && keys.some(function (k) { return byKind[k].length; })) {
      var k2 = keys[ki++ % keys.length];
      if (byKind[k2].length) out.push(byKind[k2].pop());
    }
    out = shuffle(out);
    out.forEach(function (c) { c.gold = Math.random() < 0.13; });
    return out;
  }

  function gameView(texts, key, title) {
    var root = h("div", { class: "game" });
    var prof = gProfile();
    var ivTimer = null;

    function stopTimer() { if (ivTimer) { clearInterval(ivTimer); ivTimer = null; } }

    function intro() {
      stopTimer();
      clear(root);
      var gs = st(key).game || {};
      var L = gLevel(prof.xp);
      add(root,
        h("div", { class: "g-hero" },
          h("span", { class: "eyebrow" }, title),
          h("h2", null, "¿Cuánto aguantas?"),
          h("div", { class: "g-stats" },
            h("div", null, h("b", null, gs.best || 0), h("span", null, "récord")),
            h("div", null, h("b", null, gs.medal ? gs.medal : "—"), h("span", null, "medalla")),
            h("div", null, h("b", null, "Nv " + L.lvl), h("span", null, "nivel")),
            h("div", null, h("b", null, prof.days || 0), h("span", null, "días seguidos"))),
          h("ul", { class: "g-rules" },
            h("li", null, "12 retos · 3 vidas"),
            h("li", null, "Rápido = más puntos"),
            h("li", null, "Encadena aciertos: x2, x3, x4"),
            h("li", null, "Pregunta dorada: puntos dobles")),
          h("div", { class: "row" },
            h("button", { class: "btn primary g-play", onclick: play }, "Jugar"),
            h("button", { class: "btn ghost", onclick: function () { prof.sound = !prof.sound; saveStore(); intro(); } }, prof.sound ? "Sonido: sí" : "Sonido: no"))));
    }

    function play() {
      var deck = makeChallenges(texts);
      var S = { i: 0, lives: G_LIVES, score: 0, combo: 0, maxCombo: 0, right: 0, done: 0, wrongs: [] };
      var hud = h("div", { class: "g-hud" });
      var stage = h("div", { class: "g-stage" });
      clear(root); add(root, hud, stage);
      beep([440], 0.05);

      function mult() { return S.combo >= 10 ? 4 : S.combo >= 6 ? 3 : S.combo >= 3 ? 2 : 1; }
      function paintHud(pop) {
        clear(hud);
        var hearts = h("span", { class: "g-lives", "aria-label": S.lives + " vidas" });
        for (var i = 0; i < G_LIVES; i++) add(hearts, h("i", { class: i < S.lives ? "on" : "off" }));
        add(hud,
          hearts,
          h("span", { class: "g-prog" }, Math.min(S.i + 1, G_TOTAL) + "/" + G_TOTAL),
          h("span", { class: "g-combo m" + mult() + (pop ? " pop" : "") }, "x" + mult(), h("small", null, S.combo ? " · racha " + S.combo : "")),
          h("span", { class: "g-score" + (pop ? " pop" : "") }, S.score));
      }
      function floatPts(anchor, txt, cls) {
        var f = h("div", { class: "g-float " + (cls || "") }, txt);
        anchor.appendChild(f);
        setTimeout(function () { f.remove(); }, 900);
      }
      function banner(txt, cls) {
        var b = h("div", { class: "g-banner " + (cls || "") }, txt);
        root.appendChild(b);
        setTimeout(function () { b.remove(); }, 1300);
      }

      function resolve(ok, c, card, frac, explain) {
        stopTimer();
        S.done++;
        if (ok) {
          S.right++; S.combo++; S.maxCombo = Math.max(S.maxCombo, S.combo);
          var pts = Math.round((100 + 100 * Math.max(0, frac)) * mult() * (c.gold ? 2 : 1));
          S.score += pts;
          paintHud(true);
          floatPts(card, "+" + pts, c.gold ? "gold" : "");
          sfxRight(S.combo); buzz(15);
          card.classList.add("g-ok");
          if (S.combo === 3 || S.combo === 6 || S.combo === 10) { banner("Racha " + S.combo + " · x" + mult(), "combo"); sfxBig(); confetti(S.combo * 12); }
          setTimeout(next, 850);
        } else {
          S.combo = 0; S.lives--; S.wrongs.push(c);
          paintHud(false);
          sfxWrong(); buzz([40, 40, 40]);
          card.classList.add("g-ko");
          add(card, h("div", { class: "feedback ko", html: "<strong>" + (frac < 0 ? "Tiempo." : "Fallo.") + "</strong> " + (explain || "") }),
            h("button", { class: "btn primary", onclick: next }, S.lives > 0 ? "Seguir" : "Ver resultado"));
          var btn = card.querySelector(".btn.primary:last-child"); if (btn) btn.focus();
        }
      }

      function timerBar(c, card, onTimeout) {
        var bar = h("div", { class: "g-timer" }, h("i"));
        var total = c.time * 1000, t0 = Date.now();
        ivTimer = setInterval(function () {
          var left = 1 - (Date.now() - t0) / total;
          bar.firstChild.style.width = Math.max(0, left * 100) + "%";
          bar.classList.toggle("low", left < 0.3);
          if (left <= 0) { stopTimer(); onTimeout(); }
        }, 80);
        timers.push(ivTimer);
        return { el: bar, frac: function () { return 1 - (Date.now() - t0) / total; } };
      }

      function head(c) {
        var lbl = c.kind === "vf" ? (c.label || "Verdadero o falso") : c.kind === "match" ? "Empareja" : c.kind === "order" ? "Ordena en el tiempo" : (c.label || "Pregunta");
        return h("div", { class: "row", style: "justify-content:space-between" },
          h("span", { class: "eyebrow" }, lbl, c.gold ? h("span", { class: "g-gold" }, " · dorada x2") : null),
          texts.length > 1 && c.src ? h("span", { class: "src-tag" }, c.src) : null);
      }

      function renderChoice(c) {
        var card = h("div", { class: "card stack g-card" + (c.gold ? " gold" : "") });
        var idx = c.o.map(function (_, i) { return i; });
        var order = c.fixed ? idx : shuffle(idx);
        var locked = false;
        var tb = timerBar(c, card, function () { if (!locked) { locked = true; mark(-1); resolve(false, c, card, -1, rightTxt()); } });
        function rightTxt() { return "Era: <em>" + md(short(c.o[c.r], 220)) + "</em>" + (c.x ? "<br>" + md(c.x) : ""); }
        var btns = order.map(function (oi) {
          return h("button", { class: "opt", html: md(c.o[oi]), onclick: function (e) {
            if (locked) return; locked = true;
            var ok = oi === c.r;
            mark(ok ? -2 : oi, e.currentTarget);
            resolve(ok, c, card, tb.frac(), ok ? "" : rightTxt());
          } });
        });
        function mark(chosen, el) {
          btns.forEach(function (b, k) { b.disabled = true; if (order[k] === c.r) b.classList.add("right"); });
          if (chosen >= 0 && el) el.classList.add("wrong");
        }
        add(card, head(c), tb.el, h("div", { class: "qtext", html: md(c.q) }), h("div", { class: "opts" + (c.kind === "vf" ? " vf" : "") }, btns));
        return card;
      }

      function renderMatch(c) {
        var card = h("div", { class: "card stack g-card" + (c.gold ? " gold" : "") });
        var terms = shuffle(c.pairs), defs = shuffle(c.pairs);
        var sel = null, found = 0, misses = 0, done = false;
        var tb = timerBar(c, card, function () { if (!done) { done = true; resolve(false, c, card, -1, solution()); } });
        function solution() { return c.pairs.map(function (p) { return "<br><strong>" + esc(p.t) + "</strong>: " + md(short(p.d, 110)); }).join(""); }
        var tBtns = terms.map(function (p) {
          var b = h("button", { class: "g-chip", onclick: function () {
            if (done || b.disabled) return;
            tBtns.forEach(function (x) { x.classList.remove("sel"); });
            sel = p; b.classList.add("sel");
          } }, p.t);
          b._p = p; return b;
        });
        var dBtns = defs.map(function (p) {
          var b = h("button", { class: "opt small-opt", html: md(short(p.d, 120)), onclick: function () {
            if (done || !sel || b.disabled) return;
            if (sel === p) {
              found++; b.disabled = true; b.classList.add("right");
              tBtns.forEach(function (x) { if (x._p === p) { x.disabled = true; x.classList.remove("sel"); x.classList.add("done"); } });
              sel = null; beep([660 + found * 60], 0.05, "triangle");
              if (found === c.pairs.length) { done = true; resolve(misses <= 1, c, card, tb.frac(), solution()); }
            } else {
              misses++; b.classList.add("shake"); setTimeout(function () { b.classList.remove("shake"); }, 400);
              beep([200], 0.08, "sawtooth");
              if (misses > 2) { done = true; resolve(false, c, card, 0, "Demasiados fallos. Solución:" + solution()); }
            }
          } });
          return b;
        });
        add(card, head(c), tb.el, h("div", { class: "qtext" }, "Toca un término y luego su definición"),
          h("div", { class: "g-chips" }, tBtns), h("div", { class: "opts" }, dBtns),
          h("p", { class: "muted small" }, "Máximo 1 fallo para que cuente como acierto."));
        return card;
      }

      function renderOrder(c) {
        var card = h("div", { class: "card stack g-card" + (c.gold ? " gold" : "") });
        var correct = c.items.slice().sort(function (a, b) { return String(a.a).localeCompare(String(b.a)); });
        var picked = [], done = false;
        var tb = timerBar(c, card, function () { if (!done) { done = true; resolve(false, c, card, -1, sol()); } });
        function sol() { return correct.map(function (x) { return "<br><strong>" + esc(x.a) + "</strong> " + md(short(x.t, 90)); }).join(""); }
        var list = h("div", { class: "opts" });
        var btns = shuffle(c.items).map(function (it) {
          var b = h("button", { class: "opt", html: md(short(it.t, 120)), onclick: function () {
            if (done || b.disabled) return;
            picked.push(it); b.disabled = true;
            var pos = picked.length;
            b.insertBefore(h("span", { class: "g-num" }, pos), b.firstChild);
            if (correct[pos - 1] !== it && correct[pos - 1].a !== it.a) {
              done = true; b.classList.add("wrong"); resolve(false, c, card, 0, "Orden correcto:" + sol());
            } else {
              b.classList.add("right"); beep([600 + pos * 80], 0.05, "triangle");
              if (pos === correct.length) { done = true; resolve(true, c, card, tb.frac()); }
            }
          } });
          return b;
        });
        add(list, btns);
        add(card, head(c), tb.el, h("div", { class: "qtext" }, "Toca los hechos del más antiguo al más reciente"), list);
        return card;
      }

      function next() {
        stopTimer();
        if (S.lives <= 0 || S.i >= G_TOTAL || S.i >= deck.length) return end();
        var c = deck[S.i];
        S.i++;
        paintHud(false);
        clear(stage);
        var card = c.kind === "match" ? renderMatch(c) : c.kind === "order" ? renderOrder(c) : renderChoice(c);
        add(stage, card);
        if (c.gold) { banner("Pregunta dorada", "gold"); beep([880, 1175], 0.06, "triangle"); }
      }

      function end() {
        stopTimer();
        var acc = S.done ? Math.round((S.right / S.done) * 100) : 0;
        var survived = S.lives > 0;
        if (survived) S.score += S.lives * 150;
        var gs = st(key).game || { best: 0, plays: 0, medal: "" };
        var record = S.score > (gs.best || 0);
        var medal = survived ? gMedal(acc) : "";
        var rankOrder = ["", "bronce", "plata", "oro"];
        gs.best = Math.max(gs.best || 0, S.score);
        gs.plays = (gs.plays || 0) + 1;
        if (rankOrder.indexOf(medal) > rankOrder.indexOf(gs.medal || "")) gs.medal = medal;
        st(key).game = gs;
        // XP, nivel y racha de días
        var before = gLevel(prof.xp);
        var gained = Math.round(S.score / 10);
        prof.xp += gained;
        var after = gLevel(prof.xp);
        var td = today();
        if (prof.last !== td) { prof.days = prof.last === today(-1) ? (prof.days || 0) + 1 : 1; prof.last = td; }
        saveStore();

        clear(root);
        var bar = h("div", { class: "meter g-xp" }, h("i", { style: "width:" + Math.round((before.lvl === after.lvl ? before.into : 0) / after.need * 100) + "%" }));
        add(root, h("div", { class: "card stack g-end" },
          h("span", { class: "eyebrow" }, survived ? "Partida completada" : "Sin vidas"),
          h("div", { class: "g-final" }, h("span", { class: "score", "data-to": S.score }, "0"), record ? h("span", { class: "g-record" }, "Nuevo récord") : null),
          h("p", null, gRank(acc) + " · " + acc + "% de aciertos · racha máxima " + S.maxCombo + (survived ? " · +" + S.lives * 150 + " por vidas" : "")),
          medal ? h("div", { class: "g-medal " + medal }, "Medalla de " + medal) : null,
          h("div", { class: "stack", style: "gap:6px" },
            h("div", { class: "row", style: "justify-content:space-between" }, h("span", { class: "eyebrow" }, "Nivel " + after.lvl), h("span", { class: "src-tag" }, "+" + gained + " XP")),
            bar),
          S.wrongs.length ? h("details", { class: "sec" }, h("summary", null, "Repasa tus fallos (" + S.wrongs.length + ")"),
            h("ul", null, S.wrongs.map(function (w) {
              if (w.kind === "match") return h("li", null, "Emparejar: " + w.pairs.map(function (p) { return p.t; }).join(", "));
              if (w.kind === "order") return h("li", null, "Cronología: " + w.items.slice().sort(function (a, b) { return String(a.a).localeCompare(String(b.a)); }).map(function (x) { return x.a; }).join(" → "));
              return h("li", { html: md(short(w.q, 140)) + " → <strong>" + md(short(w.o[w.r], 140)) + "</strong>" });
            }))) : null,
          h("div", { class: "row" },
            h("button", { class: "btn primary g-play", onclick: play }, "Otra partida"),
            h("button", { class: "btn ghost", onclick: intro }, "Salir"))));
        // contador animado
        var sc = root.querySelector("[data-to]"), to = S.score, t0 = performance.now();
        (function tick(now) {
          var k = Math.min(1, (now - t0) / (reduced ? 1 : 900));
          sc.textContent = Math.round(to * (1 - Math.pow(1 - k, 3)));
          if (k < 1) requestAnimationFrame(tick);
        })(t0);
        setTimeout(function () {
          bar.firstChild.style.width = Math.round(after.into / after.need * 100) + "%";
          if (after.lvl > before.lvl) { banner("Subes a nivel " + after.lvl, "combo"); sfxBig(); confetti(160); }
          else if (record || medal === "oro") { sfxBig(); confetti(110); }
        }, 500);
      }

      next();
    }

    intro();
    return root;
  }
  function tabJuego(t, el) { add(el, gameView([t], t.id, t.autor + " · " + t.titulo)); }
  function viewGame(semId) {
    var s = SEMS.filter(function (x) { return x.id === semId; })[0];
    var ids = s ? s.textos : SEMS.reduce(function (a, x) { return a.concat(x.textos); }, []);
    var texts = ids.filter(function (id) { return TXT[id]; }).map(function (id) { return TXT[id]; });
    setCrumb(s ? [[s.nombre, "s-" + s.id], ["Juego"]] : [["Juego"]]);
    add(app, h("header", { class: "thead" },
      h("span", { class: "eyebrow" }, "Partida mixta"),
      h("h1", null, s ? "Juego: " + s.nombre : "Juego: todos los textos"),
      h("p", { class: "es" }, "Retos de " + texts.map(function (t) { return t.autor; }).join(", ") + " mezclados. Incluye «¿Quién lo dijo?».")));
    add(app, gameView(texts, s ? "game-" + s.id : "game-all", "Partida mixta"));
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
    if (s.textos.length > 1) add(el, h("div", { class: "row" }, h("a", { class: "btn primary", href: "#j-" + s.id }, "Jugar con los " + s.textos.length + " textos mezclados")));
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
