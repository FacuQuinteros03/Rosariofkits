/** El logo es un PNG blanco: se usa de máscara para pintarlo del color que haga falta. */
export function Logo({ className = "" }: { className?: string }) {
  return (
    <span
      aria-hidden
      className={`inline-block [mask:url(/logo.png)_center/contain_no-repeat] ${className}`}
    />
  );
}
