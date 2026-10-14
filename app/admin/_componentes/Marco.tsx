import Link from "next/link";
import { LayoutDashboard, LogOut, Plus, ArrowLeftRight, Receipt, Users } from "lucide-react";

/** Barra de arriba del panel, con los accesos de todos los días. */
export function Barra({ email }: { email: string }) {
  return (
    <header className="mb-6 flex items-center justify-between gap-3">
      <Link href="/admin" className="flex items-center gap-2.5">
        <span className="grid h-9 w-9 place-items-center rounded-lg bg-gold font-display text-lg font-extrabold text-ground">
          RF
        </span>
        <span className="hidden leading-none min-[400px]:block">
          <span className="block font-display text-xl font-extrabold uppercase tracking-tight">Panel</span>
          <span className="hidden text-[11px] text-muted sm:block">{email}</span>
        </span>
      </Link>
      <nav className="flex items-center gap-0.5 sm:gap-1.5">
        <Link href="/admin" className="hidden items-center gap-1.5 rounded-lg px-2 py-2 text-sm sm:px-3 text-muted hover:text-ink sm:flex">
          <LayoutDashboard className="h-4 w-4" /> Inicio
        </Link>
        <Link href="/admin/ventas" className="flex items-center gap-1.5 rounded-lg px-2 py-2 text-sm sm:px-3 text-muted hover:text-ink">
          <Receipt className="h-4 w-4" /> <span className="hidden sm:inline">Ventas</span>
        </Link>
        <Link href="/admin/clientes" className="flex items-center gap-1.5 rounded-lg px-2 py-2 text-sm sm:px-3 text-muted hover:text-ink">
          <Users className="h-4 w-4" /> <span className="hidden sm:inline">Clientes</span>
        </Link>
        <Link href="/admin/movimiento" className="flex items-center gap-1.5 rounded-lg border border-line px-2 py-2 text-sm sm:px-3 hover:border-muted">
          <ArrowLeftRight className="h-4 w-4" /> <span className="hidden sm:inline">Gasto / aporte</span>
        </Link>
        <Link href="/admin/venta" className="flex items-center gap-1.5 rounded-lg bg-gold px-2.5 py-2 text-sm sm:px-3 font-semibold text-ground">
          <Plus className="h-4 w-4" /> Venta
        </Link>
        <form action="/admin/salir" method="post">
          <button aria-label="Salir" className="rounded-lg p-2 text-muted hover:text-ink">
            <LogOut className="h-4 w-4" />
          </button>
        </form>
      </nav>
    </header>
  );
}

export function SinAcceso({ email }: { email: string }) {
  return (
    <main className="mx-auto flex min-h-[70dvh] max-w-md flex-col justify-center gap-4">
      <h1 className="font-display text-4xl font-extrabold uppercase">Sin acceso</h1>
      <p className="text-sm text-muted">
        Entraste como <span className="text-ink">{email}</span>, pero esa cuenta no tiene permiso para ver el panel.
      </p>
      <form action="/admin/salir" method="post">
        <button className="rounded-lg border border-line px-3 py-1.5 text-xs text-muted hover:text-ink">Salir</button>
      </form>
    </main>
  );
}
