// PLANTILLA para un texto nuevo. Copia este archivo como data/<id>.js (id sin guiones),
// rellena los campos, añade <script src="data/<id>.js"></script> en index.html
// y pon el id en la lista "textos" de su seminario en data/seminarios.js.
// En los textos puedes usar **negrita (subrayado)** y *cursiva*.
window.TEXTOS = window.TEXTOS || {};
window.TEXTOS.ejemplo = {
  id: "ejemplo",
  seminario: "historia",
  autor: "Autor",
  titulo: "Título original",
  tituloEs: "Título en español",
  fuente: "Referencia bibliográfica.",
  tesis: "La tesis en una frase.",
  parrafo: "El texto entero en un párrafo.",
  preguntasPrevias: [{ q: "Pregunta antes de leer", a: "Lo que dice el texto" }],
  secciones: [{ t: "1. Sección", p: ["Idea 1", "Idea 2"] }],
  mapa: { t: "Tema central", c: [{ t: "Rama", c: [{ t: "Hoja" }] }] },
  argumento: [{ k: "premisa", id: "P1", t: "…" }, { k: "conclusion", id: "C1", t: "…" }], // k: premisa | conclusion | objecion | respuesta
  conceptos: [{ t: "Término", en: "Original", d: "Definición", e: "Ejemplo" }],
  casos: [{ n: "Nombre", de: "Autor del caso", d: "Descripción", prueba: "Qué demuestra" }],
  autores: [{ n: "Autor", pos: "Su posición", resp: "Respuesta del texto" }],
  citas: [{ c: "Cita", p: "p. 1", n: "Comentario" }],
  errores: ["Malentendido frecuente"],
  tarjetas: [{ q: "Pregunta", a: "Respuesta" }],
  test: [
    { q: "Pregunta de opción múltiple", o: ["A", "B", "C", "D"], r: 0, x: "Explicación" },
    { v: true, q: "Afirmación verdadera o falsa", x: "Explicación" }
  ],
  ejercicios: [{ k: "Feynman", q: "Enunciado", pista: "Pista", modelo: "Respuesta modelo", criterios: ["Punto clave"] }]
};
