# Seminarios

App minimalista para entender un texto de seminario en unos 20 minutos y no olvidarlo después.

Ábrela con doble clic en `index.html` o con la versión de un solo archivo `dist/seminarios.html`. No necesita instalación ni conexión, salvo para las fuentes tipográficas. El progreso se guarda en el navegador.

## Qué incluye cada texto

| Herramienta | Para qué |
|---|---|
| **Ruta 20′** | Sesión guiada con cronómetro: Activa (2′) → Panorama (3′) → Estructura (5′) → Conceptos y casos (3′) → Recupera (5′) → Explica (2′) |
| Resumen | Tesis en una frase, el texto en un párrafo y resumen sección por sección |
| Contexto | Cronología histórica (solo en los textos que la tienen) |
| Mapa | Mapa mental plegable (y vista de lista) |
| Esquema | Estructura lógica: premisas, conclusiones, objeciones y respuestas |
| Conceptos | Glosario con modo autoevaluación (definiciones ocultas) |
| Casos | Experimentos mentales y ejemplos, con «¿qué prueba?» |
| Debate | Con qué autores discute el texto y errores de interpretación frecuentes |
| Tarjetas | Repetición espaciada (cajas de Leitner: 1, 3, 7, 14 y 30 días) |
| Test | Opción múltiple y verdadero/falso con explicación; repetir solo las falladas |
| Ejercicios | Feynman, aplicación y ensayo, con respuesta modelo y criterios de autocorrección |
| Citas | Citas clave con página |

Cada seminario tiene además una página de **comparación**, **conexiones** entre textos, un **test mixto** (intercalado) y **preguntas de síntesis**.

El método y la evidencia que lo respalda están en la pestaña **Método** de la app.

## Textos actuales

- Filosofía política: McMahan, *Laws of War* (2010); Frowe, *Non-Combatant Liability in War* (2014).
- Historia: Fanon, *Los condenados de la tierra*, cap. I «La violencia» (1961).

## Añadir un texto

1. Copia `data/plantilla.js` como `data/<id>.js` y rellénalo.
2. Añade `<script src="data/<id>.js"></script>` en `index.html`.
3. Pon el `id` en `textos` del seminario correspondiente en `data/seminarios.js`.
4. `python3 scripts/build.py` regenera `dist/seminarios.html`.
