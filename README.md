# HORMI v2 — Arquitectura Modular

## Estructura
```
src/
├── core/          — config, estado, supabase, formatters
├── features/      — módulos por feature (auth, scan, voice, home...)
├── ui/            — toast, modales, nav
└── styles/        — CSS separado por responsabilidad
```

## Comandos
```bash
npm install        # instalar dependencias
npm run dev        # desarrollo local (localhost:5173)
npm run build      # build para producción (carpeta dist/)
npm run preview    # previsualizar build
```

## Deploy
Vercel detecta automáticamente Vite. Solo conecta el repo y despliega.
