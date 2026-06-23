# HORMI — Product Requirements Document
**Versión:** 2.0  
**Fecha:** Junio 2026  
**Fundadoras:** Kat Vidali & Pablo Enríquez  
**Dominio:** hormi.com.pe

---

## 1. Visión

> *"menos hormis, más money"*

HORMI es una PWA de finanzas personales para jóvenes peruanos (20–35 años) que ayuda a identificar y reducir los **gastos hormiga** — pequeños gastos recurrentes e impulsivos que erosionan silenciosamente el presupuesto mensual.

La propuesta central: hacer visible lo invisible. El café diario, el taxi de más, el antojo de las 11pm... solos parecen insignificantes, juntos suman S/ 300–500/mes en promedio en LATAM.

---

## 2. Problema

Los jóvenes peruanos no tienen visibilidad de sus gastos pequeños. Las apps de finanzas existentes (Fintonic, Wallet, Spendee) son complejas, no están adaptadas al contexto peruano (Yape, Plin, boletas físicas) y no tienen IA para el registro automático.

**Datos clave:**
- Promedio LATAM: S/ 300–500/mes en gastos hormiga
- 68% de jóvenes peruanos no lleva registro de gastos (UPC Observatorio de Marketing)
- Penetración de smartphones en Perú: 78% (OSIPTEL 2024)
- Usuarios de Yape: +15M en Perú

---

## 3. Usuarios Objetivo

### Persona 1 — "La Profesional Ocupada"
- Mujer, 25–32 años, Lima
- Trabaja en empresa, ingreso S/ 2,500–5,000/mes
- Gasta sin darse cuenta en delivery, cafés, Uber
- Quiere ahorrar pero no sabe por dónde empezar
- Usa Yape diariamente, iPhone o Android gama media

### Persona 2 — "El Universitario Consciente"
- Hombre/mujer, 20–25 años, Lima o provincias
- Estudiante o primer trabajo
- Ingreso S/ 800–2,000/mes (mesada o part-time)
- Muy sensible al precio, busca apps gratuitas
- Heavy user de redes sociales, TikTok, Instagram

### Persona 3 — "El Emprendedor Informal"
- 28–38 años, cualquier ciudad del Perú
- Ingresos variables, sin planificación financiera
- Usa Yape/Plin para todo
- Necesita entender su flujo de caja real

---

## 4. Propuesta de Valor

| Para... | Que... | HORMI ofrece... | A diferencia de... |
|---------|--------|-----------------|-------------------|
| Jóvenes peruanos 20–35 | No llevan registro de gastos pequeños | Registro por foto (Yape/Plin/boleta) y voz con IA | Registro manual tedioso |
| Usuarios de Yape/Plin | Sus pagos digitales no quedan organizados | Escaneo automático de capturas con extracción de datos | Excel o apps genéricas |
| Personas sin educación financiera | No entienden sus patrones de gasto | Visualización clara + límites diarios + metas | Dashboards complejos |

---

## 5. Features

### 5.1 Features Actuales (v1)

#### Registro de Gastos
- ✅ Registro manual (monto, descripción, categoría, fecha/hora)
- ✅ Escaneo de boletas físicas con IA (Claude Sonnet)
- ✅ Escaneo de capturas de Yape/Plin con IA
- ✅ Escaneo múltiple (varias fotos a la vez)
- ✅ Registro por voz con procesamiento IA
- ✅ Conversión automática HEIC → JPEG (iOS)
- ✅ Detección de duplicados
- ✅ Categorización automática por IA
- ✅ Toggle "¿es hormiga?"
- ✅ Gastos borrador

#### Visualización
- ✅ Calendario semanal con montos por día
- ✅ Feed del día con detalle de gastos
- ✅ Stats: racha, mes, hoy
- ✅ Barra de progreso vs límite diario
- ✅ Análisis mensual por categoría
- ✅ Comparativa semanas

#### Planificador (Pro)
- ✅ Wizard 4 pasos: objetivo → ingresos → gastos fijos → variables
- ✅ Generación de plan con IA
- ✅ Cálculo de ahorro posible vs hormis
- ✅ Aplicación de límites desde el plan

#### Metas
- ✅ Crear meta mensual por categoría o hormiga específica
- ✅ Seguimiento del progreso
- ✅ Evaluación automática al registrar gasto

#### Social
- ✅ Tarjeta de compartir progreso (canvas generado)
- ✅ Descarga de imagen

#### Cuenta
- ✅ Auth con email/contraseña
- ✅ Auth con Google (OAuth)
- ✅ Onboarding 4 pasos
- ✅ Perfil editable
- ✅ Exportar datos a CSV
- ✅ Eliminar cuenta

### 5.2 Roadmap (v2+)

#### Q3 2026 — Monetización
- [ ] Integración Culqi (pagos con tarjeta peruana)
- [ ] Plan mensual S/ 15.90 / anual S/ 89.90
- [ ] Trial gratuito 15 días sin tarjeta
- [ ] Flujo de upgrade in-app

#### Q3 2026 — Retención
- [ ] Notificaciones push (gasto límite, racha, resumen semanal)
- [ ] Widget iOS (gasto del día en pantalla de inicio)
- [ ] Recordatorios personalizados

#### Q4 2026 — Crecimiento
- [ ] Referidos (invita y gana días Pro)
- [ ] Integración con banco (lectura de movimientos)
- [ ] Versión LATAM (Colombia, México)
- [ ] App Store / Play Store (Capacitor)

#### 2027 — Expansión
- [ ] Comunidad (grupos de ahorro)
- [ ] Marketplace de consejos financieros
- [ ] API para empresas (beneficio empleados)

---

## 6. Arquitectura Técnica

### Frontend
- **Stack:** Vanilla JS + Vite (v2) → migración gradual a React
- **Estructura:** Modular por features (`src/features/`)
- **Diseño:** CSS variables, Lexend font, design system propio
- **Deploy:** Vercel + dominio `hormi.com.pe`

### Backend
- **Auth:** Supabase Auth (email + Google OAuth con PKCE)
- **DB:** Supabase PostgreSQL
  - `profiles` — datos del usuario y configuración
  - `transactions` — gastos registrados
  - `feedback` — feedback de usuarios
  - `waitlist` — lista de espera pre-lanzamiento
- **Edge Functions:** Supabase (Deno)
  - `claude-proxy` — proxy seguro para llamadas a Claude API
  - `scan-payment` — escaneo de boletas/vouchers con visión IA
- **Storage:** Supabase Storage (thumbnails de boletas)

### IA
- **Modelo:** Claude Sonnet 4.6 (Anthropic)
- **Usos:** escaneo de imágenes, registro por voz, planificador financiero
- **Rate limiting:** 1 scan/día (free), 30 scans cada 8 horas (Pro)

### Design System
```
--lime:    #d3e458  (CTA principal)
--primary: #407178  (nav, textos secundarios)
--accent:  #a6b1e7  (Pro, badges)
--bg:      #f5f8f6  (fondo)
--text:    #1a2e2a  (texto principal)
```

---

## 7. Modelo de Negocio

### Freemium
| Feature | Free | Pro |
|---------|------|-----|
| Registro manual | ✅ Ilimitado | ✅ Ilimitado |
| Escaneo con IA | 1/día | 30 cada 8 horas |
| Registro por voz | ❌ | ✅ |
| Planificador IA | ❌ | ✅ |
| Exportar CSV | ✅ | ✅ |
| Metas activas | 1/mes | Ilimitadas + multi-categoría |

### Precios
- **Mensual:** S/ 15.90/mes
- **Anual:** S/ 89.90/año (≈ S/ 7.49/mes, 53% descuento)
- **Trial:** 15 días gratis sin tarjeta de crédito

### Proyección (12 meses)
- Meta usuarios activos: 5,000
- Conversión free → pro esperada: 8–12%
- MRR objetivo: S/ 6,000–9,000

---

## 8. Métricas de Éxito

### Adquisición
- Usuarios registrados (waitlist → activos)
- CAC (costo de adquisición por canal)
- Tasa de conversión landing → registro

### Activación
- % usuarios que registran al menos 1 gasto en primeras 24h
- % usuarios que completan el onboarding
- Tiempo hasta primer escaneo con IA

### Retención
- DAU/MAU ratio (objetivo: >30%)
- Racha promedio (días consecutivos de registro)
- Churn mensual (objetivo: <5%)

### Monetización
- MRR (Monthly Recurring Revenue)
- Conversión free → Pro
- LTV por usuario Pro

### Producto
- Tasa de éxito del escaneo IA (objetivo: >90%)
- Tiempo de escaneo (objetivo: <5s)
- NPS (Net Promoter Score)

---

## 9. Go-to-Market

### Canales actuales
- Waitlist en `hormi.com.pe`
- Demos en eventos (Vibe Code Fest UTEC, etc.)
- Activación manual vía WhatsApp + Yape

### Canales planificados
- TikTok / Instagram (contenido de finanzas personales)
- Referidos entre usuarios
- Alianzas con universidades (ULima, PUCP, UPC)
- PR en medios de finanzas personales peruanos

---

## 10. Riesgos y Mitigaciones

| Riesgo | Probabilidad | Impacto | Mitigación |
|--------|-------------|---------|------------|
| Competidor grande entra al mercado | Media | Alto | Profundizar contexto peruano (Yape, boletas, cultura local) |
| Precisión IA insuficiente | Baja | Alto | Sistema de edición post-escaneo, feedback loop |
| Regulación de datos financieros | Baja | Alto | Cumplimiento LPDP (Ley 29733), no almacenar datos bancarios |
| Churn alto en free tier | Alta | Medio | Mejorar onboarding, notificaciones de valor |
| Costos API Anthropic escalan | Media | Medio | Rate limiting, caché de respuestas comunes |

---

*Documento mantenido por el equipo fundador de HORMI.*
*Última actualización: Junio 2026*
