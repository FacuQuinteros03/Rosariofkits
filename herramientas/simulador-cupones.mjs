/**
 * Apps Script de mentira, para probar la ruleta entera en localhost sin tocar
 * el libro de verdad. Mismo contrato que apps-script/cupones/Cupones.gs, pero
 * las filas viven en memoria y se pierden al cortarlo.
 *
 *   node herramientas/simulador-cupones.mjs
 *
 * y en .env.local:
 *   CUPONES_URL=http://localhost:8799
 *
 * (el CUPONES_TOKEN que ya tengas sirve: si no se lo pasás por entorno, el
 * simulador acepta cualquiera)
 *
 * Cada cupón que se emite se imprime como si fuera una fila de la hoja.
 */
import { createServer } from "node:http";

/* El token sale del entorno: este archivo va al repo y no puede llevarlo
   adentro. Sin CUPONES_TOKEN definido, acepta cualquier pedido. */
const TOKEN = process.env.CUPONES_TOKEN || null;
const filas = [];

const porTelefono = (t) => {
  const n = String(t || "").replace(/\D/g, "");
  return filas.find((f) => f.telefono.replace(/\D/g, "") === n) || null;
};
const porCodigo = (c) =>
  filas.find((f) => f.codigo.toUpperCase() === String(c || "").trim().toUpperCase()) || null;

createServer((req, res) => {
  /* Imita poner SI a mano en la columna Usado de la hoja:
     curl "http://localhost:8799/usar?codigo=RFK-5-..."  */
  if (req.method === "GET" && req.url.startsWith("/usar")) {
    const codigo = new URL(req.url, "http://localhost").searchParams.get("codigo");
    const fila = porCodigo(codigo);
    if (fila) fila.usado = true;
    res.writeHead(200, { "Content-Type": "application/json" });
    return res.end(JSON.stringify({ ok: Boolean(fila), cupon: fila }));
  }

  let cuerpo = "";
  req.on("data", (c) => (cuerpo += c));
  req.on("end", () => {
    const responder = (o) => {
      res.writeHead(200, { "Content-Type": "application/json" });
      res.end(JSON.stringify(o));
    };
    let p = {};
    try {
      p = JSON.parse(cuerpo || "{}");
    } catch {
      return responder({ ok: false, error: "json" });
    }
    if (TOKEN && p.token !== TOKEN) return responder({ ok: false, error: "token" });

    if (p.accion === "buscar") return responder({ ok: true, cupon: porTelefono(p.telefono) });
    if (p.accion === "porCodigo") return responder({ ok: true, cupon: porCodigo(p.codigo) });
    if (p.accion === "registrar") {
      const previo = porTelefono(p.telefono);
      if (previo) return responder({ ok: true, cupon: previo, yaEstaba: true });
      const fila = {
        codigo: p.codigo,
        nombre: p.nombre,
        telefono: p.telefono,
        premio: p.premio,
        usado: false,
      };
      filas.push(fila);
      console.log(`[hoja CUPONES] fila ${filas.length}: ${fila.nombre} · ${fila.telefono} · ${fila.codigo} · ${fila.premio}`);
      return responder({ ok: true, cupon: fila, yaEstaba: false });
    }
    responder({ ok: false, error: "accion" });
  });
}).listen(8799, () => console.log("falso Apps Script en http://localhost:8799"));
