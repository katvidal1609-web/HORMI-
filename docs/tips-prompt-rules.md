# Reglas del prompt de sugerencias personalizadas (tips)

Extraído de `loadPersonalizedTips()` en `legacy.js` antes de deprecar su
llamada automática desde `openHormiDetail()`. Se reusa en el job mensual
de reportes.

## Contexto de invocación

Variables disponibles al armar el prompt: `desc` (descripción/comercio del
gasto), `ci` (id de categoría), `total` (monto acumulado del período),
`veces` (cantidad de apariciones), `avgD` (promedio por vez = `total/veces`).

Request al edge function: `POST SCAN_URL` con body `{prompt, mode:'tips'}`,
`Authorization: Bearer {access_token de sesión Supabase}`, timeout de 45s
vía `AbortController`.

## Prompt completo (template literal)

```
Usuario en Lima, Perú. Gasto: "${desc}" (categoría: ${ci}). Registrado ${veces} vez(es) este mes, total ${fmt(total)}, promedio ${fmt(avgD)} por vez.

Tu única misión: encontrar 2 formas concretas de que este usuario GASTE MENOS en esto. No des alternativas laterales ni observaciones sobre el precio: cada sugerencia debe representar un ahorro real frente a los ${fmt(avgD)} que paga hoy.

Busca en internet precios reales y actuales en Lima para lograrlo.

REGLAS OBLIGATORIAS para cada sugerencia:
1. Debe implicar pagar menos de ${fmt(avgD)}. Si algo cuesta igual o más, NO lo incluyas.
2. Debe incluir el ahorro estimado por vez, calculado sobre ${fmt(avgD)}.
3. Debe incluir entre 1 y 2 fuentes verificables (ver reglas de fuentes abajo). Solo URLs reales de tu búsqueda — nunca inventadas.
4. Prohibido: consejos genéricos ("cocina en casa", "compra marca propia"), comparaciones de precio sin ahorro, o sugerir que revise descuentos.
5. Si tras buscar no encuentras ninguna opción más barata verificable, devuelve un array vacío [].
6. Prioriza como primera fuente contenido social peruano reciente (TikTok, Reels, IG) de los últimos 12 meses si existe uno relevante con comentarios útiles (tipo:'social'). Si encuentras también una tienda online donde se pueda verificar el precio, agrégala como segunda fuente (tipo:'tienda'). Mínimo 1 fuente, máximo 2. Las URLs deben venir de resultados reales de web_search, nunca inventadas.

Responde SOLO este JSON, sin markdown:
[{"texto":"acción concreta en máx 18 palabras","ahorro":"S/X por vez","fuentes":[{"tipo":"social","url":"https://...","label":"..."}]},{"texto":"...","ahorro":"S/X por vez","fuentes":[{"tipo":"tienda","url":"https://...","label":"..."}]}]
```

## Nota sobre "precio con unidad" y "punto de equilibrio"

El texto anterior es el prompt de **usuario** enviado desde `legacy.js`
(`loadPersonalizedTips`). Las reglas de "precio EXACTO con su unidad"
("S/52.90 por 100g", prohibido 'desde'/'aprox'/'alrededor de') y de
"punto de equilibrio" (N = costo_inicial / ahorro_por_uso, sumar
insumos como leche/azúcar) **no están en este prompt** — viven en el
`system` prompt del edge function (`HORMI/supabase/functions/scan-payment/index.ts`,
rama `mode === 'tips'`), como reglas adicionales obligatorias aplicadas
sobre cualquier prompt de usuario en modo tips. Si se reusa este prompt
en el job mensual sin pasar por ese edge function, esas reglas deben
copiarse también — quedan documentadas aparte por vivir en otro archivo.

## Formato de salida esperado

Array de hasta 2 objetos:
```json
{"texto":"...", "ahorro":"S/X por vez", "fuentes":[{"tipo":"social"|"tienda","url":"...","label":"..."}]}
```
Renderizado vía `renderTipCards()` (se mantiene sin cambios). Cache local
en `localStorage` bajo la key `'hormi_tips_v2_'+normalizeMerchant(desc).slice(0,60)`
(se mantiene sin cambios).
