// CONTROLADOR da exportação: busca as movimentações filtradas, gera o arquivo e manda para download.
import { listar as listarMovimentacoes } from "../movimentacoes/movimentacoes.servico.js";
import { listar as listarCategorias } from "../categorias/categorias.servico.js";
import { descricaoDoFiltro, gerarOfx, gerarXlsx } from "./formatos.js";

// GET /api/exportacao?formato=ofx|xlsx&de=&ate=&tipo=  -> baixa o arquivo filtrado
export async function exportar(req, res) {
  const filtro = req.query; // já validado e com valores padrão (rotas)
  // O filtro (período e tipo) é aplicado no próprio SQL do serviço de movimentações
  const linhas = await listarMovimentacoes(filtro);
  // Excel precisa do nome das categorias (id -> nome); o OFX não
  const { buffer, tipo } = filtro.formato === "xlsx"
    ? await gerarXlsx(linhas, descricaoDoFiltro(filtro), new Map((await listarCategorias()).map((c) => [c.id, c.nome])))
    : gerarOfx(linhas);
  // Nome do arquivo, ex.: extrato-2026-10-01-2026-10-31-saidas.xlsx
  const nome = ["extrato", filtro.de, filtro.ate, filtro.tipo !== "todas" && filtro.tipo].filter(Boolean).join("-");
  // "attachment" faz o navegador baixar em vez de abrir; o tipo (MIME) diz que arquivo é
  res.set({ "Content-Type": tipo, "Content-Disposition": `attachment; filename="${nome}.${filtro.formato}"`, "Content-Length": buffer.length });
  res.send(buffer);
}
