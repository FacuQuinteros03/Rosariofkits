# Etapa 5 — los pasos de Facu: "Entrar con Google"

Son unos 15 minutos de clics, en tres lugares. Nada de esto toca la web en producción.
Los nombres de los botones pueden variar un poco.

## 1. Google Cloud: la llave para "Entrar con Google"

1. Entrar a <https://console.cloud.google.com> con tu cuenta de Google.
2. Arriba, en el selector de proyecto → **Proyecto nuevo** → nombre `rosariofkits-panel` →
   **Crear**, y dejarlo seleccionado.
3. Menú ☰ → **APIs y servicios** → **Pantalla de consentimiento de OAuth** (o "Google Auth
   Platform" → **Branding**):
   - Tipo de usuario: **Externo**.
   - Nombre de la app: `Rosario F Kits — Panel`. Mail de asistencia: el tuyo.
   - Guardar. En **Público** (Audience) dejarla en **Prueba** (Testing) y en **Usuarios de
     prueba** agregar tu mail y el de Vani. Así solo ustedes dos pueden entrar y Google no
     pide verificar la app.
4. **Credenciales** (o **Clientes**) → **Crear credenciales** → **ID de cliente de OAuth**:
   - Tipo: **Aplicación web**. Nombre: `Supabase`.
   - **URIs de redireccionamiento autorizados** → agregar exactamente:
     `https://pllefavvclhtkgbnmvuo.supabase.co/auth/v1/callback`
   - **Crear**. Aparecen un **ID de cliente** y un **Secreto del cliente**. No cierres esa
     ventana (o copialos a tu gestor de contraseñas). **No me los pases a mí**: van directo
     a Supabase en el paso 2.

## 2. Supabase: prender Google

Proyecto `rosariofkits-erp`:

1. **Authentication** → **Sign In / Providers** → **Google** → activarlo, pegar el **ID de
   cliente** y el **Secreto**, guardar.
2. **Authentication** → **URL Configuration**:
   - **Site URL**: `https://rosariofkits-git-erp-facuquinteros03s-projects.vercel.app`
   - **Redirect URLs** → agregar estas cuatro:
     - `https://rosariofkits-git-erp-facuquinteros03s-projects.vercel.app/**`
     - `https://*-facuquinteros03s-projects.vercel.app/**`
     - `http://localhost:3000/**`
     - `http://localhost:3100/**`
3. **Authentication** → **Users** → **Add user** → **Send invitation**: tu mail de Google y
   el de Vani. Como el registro está cerrado, sin esta invitación Google te deja pasar pero
   Supabase no.

## 3. Avisame

Pasame **los dos mails** (el tuyo de Google y el de Vani). Los cargo en la lista de
admins de la base: sin eso, aunque entren, el panel dice "Sin acceso".

Después probás en la versión de prueba: `/admin` → **Entrar con Google** → tiene que
aparecer el Inicio con tus números.
