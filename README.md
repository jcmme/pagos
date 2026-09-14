# Pagos

App personal para controlar gastos, pagos fijos, deudas y presupuestos.
Next.js + TypeScript + Prisma/Postgres, con notificaciones por email y push.

## Desarrollo local

1. Instala dependencias: `npm install`
2. Copia `.env.example` a `.env` y completa los valores (ver abajo).
3. Aplica las migraciones: `npx prisma migrate dev`
4. Crea el usuario y las categorías por defecto: `npx prisma db seed`
5. Levanta el servidor: `npm run dev`

## Variables de entorno

Ver `.env.example`. Resumen:

- `DATABASE_URL`: connection string de Postgres.
- `AUTH_SECRET`: secreto de sesión (`openssl rand -base64 32`).
- `ADMIN_EMAIL` / `ADMIN_PASSWORD`: credenciales del único usuario (usadas por el seed).
- `RESEND_API_KEY`, `EMAIL_FROM`: envío de recordatorios por email (opcional, se omite si está vacío).
- `VAPID_PUBLIC_KEY` / `VAPID_PRIVATE_KEY` / `VAPID_SUBJECT` / `NEXT_PUBLIC_VAPID_PUBLIC_KEY`: notificaciones push del navegador (`npx web-push generate-vapid-keys`).
- `NOTIFY_DAYS_BEFORE`: días de anticipación para avisar de un pago próximo.
- `CRON_SECRET`: protege `/api/cron/notify` de llamadas manuales no autorizadas.

## Notificaciones

`/api/cron/notify` revisa los pagos fijos activos y envía email + push cuando
faltan `NOTIFY_DAYS_BEFORE` días o menos. En Vercel se dispara automáticamente
según `vercel.json` (todos los días a las 13:00 UTC). Para probarlo en local:

```bash
curl -H "Authorization: Bearer $CRON_SECRET" http://localhost:3000/api/cron/notify
```

## Estructura

- `src/app/(app)`: páginas protegidas (dashboard, gastos, pagos, deudas, presupuestos, categorías).
- `src/modules/*`: lógica de dominio por módulo (schema de validación + server actions). Cada módulo nuevo se agrega aquí sin tocar los demás.
- `src/components/ui`: componentes base reutilizables (estética oscura estilo Apple).
- `prisma/schema.prisma`: modelo de datos.

## Despliegue

Pensado para Vercel + Postgres gestionado (Neon/Supabase). Configura las
variables de entorno del proyecto en Vercel, corre las migraciones contra la
base de producción (`npx prisma migrate deploy`) y despliega.
