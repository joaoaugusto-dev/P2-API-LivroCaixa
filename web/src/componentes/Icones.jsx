// Ícones em SVG feitos à mão (sem biblioteca). `Icone` é a moldura; `lapis` e `lixeira` são os desenhos.
export const Icone = ({ d }) => (
  <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">{d}</svg>
);
export const lapis = <path d="M12 20h9M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4Z" />;
export const lixeira = <path d="M3 6h18M8 6V4h8v2m-9 0 1 14h8l1-14M10 11v5m4-5v5" />;

// Bolinha que gira nos botões enquanto algo está carregando
export const Girar = () => <span className="girar" aria-hidden="true" />;

// Logo do Livro-caixa: um degrau, como o gráfico de saldo
export function Logo() {
  return (
    <svg className="logo" viewBox="0 0 32 32" aria-hidden="true">
      <rect width="32" height="32" rx="8" />
      <path d="M6 23h6v-6h5v-5h9" />
    </svg>
  );
}
