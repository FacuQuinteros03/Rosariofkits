# Etapa 0 — los pasos de Facu

Son unos 15 minutos de clics. Nada de esto toca la web en producción ni los libros.
Los nombres de los botones pueden variar un poco: Supabase y Vercel cambian el panel
seguido.

## 1. Cuenta y proyecto de Supabase

1. Entrar a <https://supabase.com> → **Start your project** → registrarse con GitHub o con
   tu mail.
2. En la configuración de la cuenta, activar la **verificación en dos pasos (MFA)**. Es la
   llave de toda la plata del negocio.
3. **New project**:
   - Organization: la personal que crea por defecto (plan **Free**).
   - Name: `rosariofkits-erp`.
   - Database password: **Generate a password**, y guardala en tu gestor de contraseñas
     antes de seguir. No se vuelve a mostrar.
   - Region: **South America (São Paulo)**.
4. Esperar un par de minutos a que diga que el proyecto está listo.

## 2. Cerrar el registro

**Authentication → Sign In / Providers** (o **Settings**) → desactivar **Allow new users
to sign up** → guardar.

Así nadie puede crearse una cuenta. A vos y a Vani los vamos a invitar a mano en la
etapa 5, que es cuando se configura también el "Entrar con Google".

## 3. Las claves

Hacen falta tres datos. Están en **Project Settings** (el engranaje):

| Dato | Dónde | Cómo se ve |
|---|---|---|
| `SUPABASE_URL` | **Data API** (o **API**) → Project URL | `https://abcdefgh.supabase.co` |
| `SUPABASE_ANON_KEY` | **API Keys** → la **publishable** (si tu panel muestra las "legacy", la **anon public**) | `sb_publishable_...` o un texto largo que empieza con `eyJ` |
| `SUPABASE_DB_URL` | Botón **Connect** arriba → **Connection string** → **Session pooler** | `postgresql://postgres.abcdefgh:[YOUR-PASSWORD]@aws-0-sa-east-1.pooler.supabase.com:5432/postgres` |

En la del pooler, reemplazá `[YOUR-PASSWORD]` por la contraseña del paso 1.3. Se usa el
**Session pooler** y no la conexión directa porque la directa en el plan gratis es solo
IPv6, y ni tu casa ni GitHub Actions la garantizan.

**La `service_role` / `secret` key no la copies a ningún lado.** Cuando haga falta (el job
de backups, en la etapa 2) va directo a los *secrets* de GitHub.

## 4. `.env.local` de la rama `erp`

El ERP vive en una carpeta aparte, `C:\Users\facuq\Desktop\rosariofkits-web-erp` (la
rama `erp`). La carpeta de siempre, `rosariofkits-web`, sigue siendo `main` y no se
toca.

Crear `C:\Users\facuq\Desktop\rosariofkits-web-erp\.env.local` (no se sube a GitHub:
está en el `.gitignore`) con:

```
# lo mismo que tiene rosariofkits-web/.env.local hoy (SHEET_CSV_URL, etc.)
SHEET_CSV_URL=...

# ERP
SUPABASE_URL=https://abcdefgh.supabase.co
SUPABASE_ANON_KEY=sb_publishable_...
SUPABASE_DB_URL=postgresql://postgres.abcdefgh:LA_CONTRASEÑA@aws-0-sa-east-1.pooler.supabase.com:5432/postgres
CATALOGO_FUENTE=sheets
```

`CATALOGO_FUENTE=sheets` en tu compu es a propósito: hasta la etapa 4 no hay nada en la
base para mostrar. Si preferís, pasame los valores y lo armo yo, salvo la contraseña de
la base: esa pegala vos.

## 5. Vercel, solo para Preview

Proyecto de la web en Vercel → **Settings → Environment Variables** → agregar estas tres,
y en cada una dejar tildado **solo Preview** (destildar **Production** y
**Development**). Si te deja elegir la rama, elegí `erp`:

| Nombre | Valor |
|---|---|
| `SUPABASE_URL` | el del paso 3 |
| `SUPABASE_ANON_KEY` | el del paso 3 |
| `CATALOGO_FUENTE` | `supabase` |

`SUPABASE_DB_URL` **no** va a Vercel.

Revisá al final que en la lista ninguna de las tres diga "Production". Ese es el único
punto de este paso donde un error tocaría producción, y aun así no pasaría nada hasta
que el código que las lee llegue a `main`.

## 6. Avisame

Con un "listo" alcanza. Yo pruebo la conexión desde la compu y cierro la etapa 0.

**No hagas push de `main` con nada del ERP.** En `rosariofkits-web` (main) no quedó
nada del ERP; todo está en `rosariofkits-web-erp`.
