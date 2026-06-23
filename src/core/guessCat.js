// core/guessCat.js — detecta categoría por descripción
import { CATS } from './constants.js'

const MAP = {
  food:   /restauran|almuerzo|cena|pollo|pizza|burger|sushi|menu|comida|mcdon|kfc|bembos|norky|rosto/i,
  drink:  /café|coffee|starbucks|jugo|bebida|agua|gaseosa|té|latte|capuccino/i,
  snack:  /snack|dulce|postre|helado|galleta|chocolate|chifa|empanada|sanguchería/i,
  del:    /delivery|rappi|pedido|glovo|uber eat|ifood/i,
  trans:  /taxi|uber|beat|cabify|bus|metro|combi|combustibl|gasolina|peaje/i,
  subs:   /netflix|spotify|disney|amazon|youtube|prime|hbo|apple|suscri|app/i,
  health: /farmacia|clínica|médico|doctor|salud|mifarma|inkafarma|hospital/i,
  beauty: /peluquer|salon|spa|manicure|pedicure|cosmétic|belleza/i,
  sport:  /gimnasio|gym|deporte|yoga|crossfit|piscina/i,
  edu:    /libro|curso|universidad|colegio|educación|clase/i,
  shop:   /ropa|zara|saga|ripley|tienda|moda|calzado|zapatilla/i,
  soc:    /bar|discoteca|fiesta|cóctel|social|cerveza|licor/i,
  enter:  /cine|cinema|teatro|concierto|evento|entretenimiento/i,
}

export function guessCat(desc) {
  const d = (desc || '').toLowerCase()
  for (const [id, re] of Object.entries(MAP)) {
    if (re.test(d)) return CATS.find(c => c.id === id) || CATS[CATS.length - 1]
  }
  return CATS[CATS.length - 1] // 'otros'
}
