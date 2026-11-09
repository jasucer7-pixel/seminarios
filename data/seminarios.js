// Registro de seminarios. Para añadir un texto: crea data/<id>.js
// (copia data/plantilla.js), añádelo a index.html y pon su id en "textos".
window.SEMINARIOS = [
  {
    id: "filosofia-politica",
    nombre: "Filosofía política",
    tema: "Ética y derecho de la guerra",
    textos: ["mcmahan", "frowe"],
    orden: "Lee primero McMahan (marco general: moral vs. derecho, asimetría, liability) y después Frowe (aplica la liability a los civiles y discute con McMahan).",

    comparacion: {
      columnas: ["McMahan, Laws of War", "Frowe, Non-Combatant Liability"],
      filas: [
        ["Pregunta", "¿Por qué el derecho de la guerra es simétrico si la moral es asimétrica? ¿Deben coincidir?", "¿Pueden los no combatientes ser *liable* a la muerte defensiva?"],
        ["Respuesta", "Moral y derecho divergen hoy por razones epistémicas; el ideal es la congruencia.", "Sí, si contribuyen responsablemente a una guerra injusta."],
        ["Concepto eje", "Moral (se descubre) vs. derecho (artefacto).", "*Liability* vs. permisibilidad."],
        ["Fundamento", "Una sola moral: la de la legítima defensa, asimétrica y basada en la *liability*.", "Las reglas de la legítima defensa fundamentan matar en la guerra."],
        ["Civiles", "La inmunidad civil universal quizá no tenga base moral, pero debe ser ley absoluta.", "Los civiles responsables son *liable*; su protección es contingente (necesidad)."],
        ["Necesidad", "Interna a la *liability* (nota 9: eficacia instrumental).", "Externa: afecta a la permisibilidad, no a la *liability* (*Lucky Escape*)."],
        ["Consentimiento", "Los combatientes no consienten ser atacados (polaco).", "Los combatientes no pueden asumir por acuerdo la *liability* de los civiles."],
        ["Rivales", "Hobbes, Walzer, Hurka, Kutz, consecuencialistas.", "Rodin, McMahan (2009), Fabre, Manual británico."]
      ]
    },

    conexiones: [
      { t: "Mismo marco: individualismo y *liability*", d: "Ambos rechazan la «moral especial de la guerra» y juzgan matar en la guerra con los principios de la legítima defensa: asimetría y *liability*. Frowe lo asume (10.2) y McMahan lo argumenta (VIII: «solo hay una moral»)." },
      { t: "Convergencia sobre los civiles", d: "McMahan admite que la inmunidad civil universal quizá no tenga base en la moral básica y que la justicia podría permitir atacar a civiles muy responsables. Frowe lleva esto hasta el final: los civiles que contribuyen responsablemente son *liable*. Uno de los «orígenes» que cita McMahan (matar civiles no sirve militarmente) es justo la razón contingente que Frowe acepta." },
      { t: "Desacuerdo sobre la necesidad", d: "En la nota 9 McMahan define la *liability* con una condición de eficacia instrumental. Frowe (10.7) ataca exactamente esa tesis con *Lucky Escape*: la *liability* mira hacia atrás; la necesidad es una condición separada de permisibilidad." },
      { t: "Dos separaciones paralelas", d: "McMahan separa moral y derecho; Frowe separa *liability* y permisibilidad. En ambos casos, de que alguien no tenga derecho moral a no ser dañado no se sigue que debamos (o podamos legalmente) dañarle." },
      { t: "El consentimiento no hace el trabajo", d: "McMahan: ponerse el uniforme no es consentir ser atacado. Frowe: los combatientes no pueden «quedarse» con la *liability* de los civiles por acuerdo. Ambos niegan que el estatus de combatiente se explique por consentimiento." },
      { t: "Ley pragmática, moral profunda", d: "Combinando ambos: los civiles pueden ser moralmente *liable* (Frowe), pero el derecho debe protegerlos de forma absoluta (McMahan) porque un permiso legal sería abusado por el bando injusto." }
    ],

    sintesis: [
      { q: "¿Contradice la tesis de Frowe la defensa que hace McMahan de la inmunidad civil absoluta en el derecho?", modelo: "No necesariamente. Frowe habla de *liability* moral; McMahan, de lo que debe decir la ley. McMahan acepta que la inmunidad universal puede no tener base moral profunda y aun así la defiende como regla jurídica por razones epistémicas y de abuso. Frowe misma separa *liability* de permisibilidad y reconoce razones pragmáticas para pactos de no atacar civiles (10.4). Son compatibles: moralmente *liable*, jurídicamente inmune.", criterios: ["Distingue nivel moral y jurídico", "Cita la tesis de McMahan sobre la inmunidad", "Cita la separación *liability* / permisibilidad", "Concluye compatibilidad (o matiza)"] },
      { q: "¿Quién tiene razón sobre la necesidad: McMahan (interna a la *liability*) o Frowe (externa)?", modelo: "McMahan: la *liability* se justifica por la justicia preventiva, que solo redistribuye daños que sirven para algo; si dañar no sirve, no hay nada que redistribuir. Frowe: *Lucky Escape* muestra que el asesino no puede defenderse contra su víctima, señal de que sigue siendo *liable*; la *liability* depende de lo que uno ha hecho. Valoración: la de Frowe explica mejor la intuición de *Lucky Escape*; la de McMahan encaja mejor con la distinción *desert* / *liability* (si la *liability* no exige utilidad, se parece al merecimiento).", criterios: ["Expone ambas", "Usa *Lucky Escape*", "Usa la nota 9 / justicia preventiva", "Toma partido razonado"] },
      { q: "Aplica ambos textos al caso de un ingeniero civil que diseña drones para un ejército agresor.", modelo: "Frowe: amenaza indirecta material/tecnológica, moralmente responsable → *liable*; si matarle impide producir drones (necesidad) y es proporcionado, sería permisible. McMahan: moralmente quizá *liable* (responsabilidad significativa, contribución relevante), pero el derecho actual lo protege (no participa directamente) y debe seguir haciéndolo porque un permiso legal sería abusado. Combinación: moralmente atacable, legalmente no.", criterios: ["Análisis de Frowe", "Análisis de McMahan", "Distinción moral / ley", "Conclusión clara"] },
      { q: "¿Qué tendría que pasar para que el derecho recogiera la tesis de Frowe? Usa la propuesta de McMahan.", modelo: "Habría que superar el problema epistémico: un tribunal internacional que declare qué bando es injusto. Solo entonces podría el derecho tratar de forma asimétrica a los combatientes y, quizá, a ciertos civiles del bando injusto. Pero aun así McMahan teme el abuso: el permiso de atacar civiles es especialmente peligroso, así que probablemente sería lo último en cambiar.", criterios: ["Tribunal / problema epistémico", "Asimetría", "Riesgo de abuso", "Valoración"] }
    ]
  },
  {
    id: "historia",
    nombre: "Historia",
    tema: "Descolonización y Tercer Mundo",
    textos: ["fanon"],
    orden: "Empieza por la pestaña Contexto: Fanon escribe en 1961, en plena guerra de Argelia, y el texto se entiende mucho mejor sabiendo a qué responde."
  }
];
