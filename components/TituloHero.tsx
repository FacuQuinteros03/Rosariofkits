const LINEAS = [
  ["Bienvenido", "a"],
  ["Rosario", "F", "Kits"],
];

/**
 * Título de la portada, palabra por palabra.
 *
 * La animación es CSS y no Motion a propósito. Motion anima con
 * requestAnimationFrame, que el navegador pausa mientras la pestaña está en
 * segundo plano: si alguien abre el sitio en una pestaña de fondo, el título
 * se queda en opacity 0 hasta que le da foco. Para el mensaje principal del
 * sitio eso no es aceptable. Las animaciones CSS corren igual.
 *
 * Regla del proyecto: entradas en CSS, interacciones (hover, layout) en Motion.
 */
export function TituloHero() {
  let n = 0;

  return (
    <h1
      className="font-display text-5xl font-extrabold uppercase leading-[0.88]
                 tracking-tight text-white [perspective:800px]
                 drop-shadow-[0_2px_20px_rgba(0,0,0,0.55)] sm:text-7xl lg:text-8xl"
    >
      {LINEAS.map((linea, i) => (
        <span key={i} className="block">
          {linea.map((palabra, j) => {
            const delay = 120 + n++ * 85;
            return (
              <span
                key={`${i}-${j}`}
                className="palabra inline-block"
                style={{ animationDelay: `${delay}ms` }}
              >
                {palabra}
                {j < linea.length - 1 ? " " : null}
              </span>
            );
          })}
        </span>
      ))}
    </h1>
  );
}
