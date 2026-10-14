import { BotonGoogle } from "./BotonGoogle";

/** Mensajes de error que devuelve Supabase o el callback, dichos en castellano. */
function explicar(error?: string): string | null {
  if (!error) return null;
  if (/signup|not allowed|registr/i.test(error))
    return "Ese mail no tiene acceso al panel. Si es tuyo, hay que invitarlo desde Supabase.";
  return "No se pudo entrar. Probá de nuevo.";
}

export default async function Entrar({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
  const { error } = await searchParams;
  const mensaje = explicar(error);
  return (
    <main className="mx-auto flex min-h-[80dvh] max-w-md flex-col justify-center gap-6">
      <div>
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-gold">Rosario F Kits</p>
        <h1 className="mt-1 font-display text-5xl font-extrabold uppercase leading-none tracking-tight">
          Panel
        </h1>
        <p className="mt-3 text-sm text-muted">Ventas, cobros, stock y números del negocio.</p>
      </div>
      <BotonGoogle />
      {mensaje && (
        <p className="rounded-lg border border-red-500/40 bg-red-500/10 px-3 py-2 text-sm text-red-200">
          {mensaje}
        </p>
      )}
    </main>
  );
}
