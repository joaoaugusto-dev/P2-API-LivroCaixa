// GERADORES DE ARQUIVO da exportação: cada função recebe as movimentações e devolve { buffer, tipo }
// (buffer = os bytes do arquivo; tipo = o MIME que diz ao navegador que arquivo é).
// Dois formatos: Excel (.xlsx, bonito, com a identidade visual) e OFX (o formato dos bancos, reimportável).
import ExcelJS from "exceljs";

// Cores no formato ARGB do Excel (FF = opaco). Paleta do Livro-caixa (a mesma do styles.css), para a planilha ter a identidade do sistema
const PETROLEO = "FF0D3A40", PETROLEO_2 = "FF164A52", OURO = "FFF2B632";
const ENTRADA = "FF14805F", SAIDA = "FFC8472F", FUNDO = "FFEEF3F0", LINHA = "FFD3DCD8", SUAVE = "FF566A6E", BRANCO = "FFFFFFFF";
const MOEDA = '"R$" #,##0.00;-"R$" #,##0.00';
const FONTE = "Calibri";

const preencher = (cor) => ({ type: "pattern", pattern: "solid", fgColor: { argb: cor } });
const borda = (estilo) => ({ bottom: { style: estilo, color: { argb: LINHA } } });
const dataBR = (iso) => iso.split("-").reverse().join("/");

// "Extrato de 05/10/2026 a 12/10/2026, só saídas"
export function descricaoDoFiltro({ de, ate, tipo }) {
  const periodo = de && ate ? `${dataBR(de)} a ${dataBR(ate)}` : de ? `a partir de ${dataBR(de)}` : ate ? `até ${dataBR(ate)}` : "todo o período";
  return `Extrato de ${periodo}` + { todas: "", entradas: ", só entradas", saidas: ", só saídas" }[tipo];
}

// EXCEL (.xlsx). Passos: 1) título 2) indicadores 3) cabeçalho da tabela 4) uma linha por movimentação.
// Faixa de título, indicadores em fórmulas (recalculam se a pessoa editar) e tabela
export async function gerarXlsx(linhas, filtro, nomesCategoria) {
  const wb = new ExcelJS.Workbook();
  const ws = wb.addWorksheet("Extrato", {
    properties: { tabColor: { argb: PETROLEO } },
    views: [{ showGridLines: false, state: "frozen", ySplit: 9 }],
    pageSetup: { orientation: "portrait", fitToPage: true, fitToWidth: 1, fitToHeight: 0, printTitlesRow: "9:9" },
  });
  ws.columns = [14, 46, 18, 24].map((width) => ({ width }));
  const colunas = ["A", "B", "C", "D"];
  const fonte = (o = {}) => ({ name: FONTE, ...o });

  // 1) faixa de título verde-petróleo com um filete dourado embaixo
  for (const r of [1, 2]) for (const c of colunas) ws.getCell(`${c}${r}`).fill = preencher(PETROLEO);
  for (const c of colunas) ws.getCell(`${c}3`).fill = preencher(OURO);
  Object.assign(ws.getCell("A1"), { value: "Livro-caixa" }).font = fonte({ size: 20, bold: true, color: { argb: BRANCO } });
  Object.assign(ws.getCell("A2"), { value: filtro }).font = fonte({ size: 10, color: { argb: "FF9FBBB8" } });
  ws.getRow(1).height = 34; ws.getRow(2).height = 20; ws.getRow(3).height = 4;

  // 2) indicadores Entradas / Saídas / Saldo. São FÓRMULAS do Excel (SUMIF/SUM): se a pessoa editar a planilha, recalculam.
  //    "result" é o valor já calculado, para aparecer certo mesmo antes de o Excel recalcular.
  const topo = 10, fim = topo + Math.max(linhas.length, 1) - 1, faixa = `$C$${topo}:$C$${fim}`;
  const soma = (f) => linhas.filter(f).reduce((s, m) => s + m.valor, 0);
  [
    ["Entradas", `SUMIF(${faixa},">0")`, soma((m) => m.valor > 0), ENTRADA],
    ["Saídas", `SUMIF(${faixa},"<0")`, soma((m) => m.valor < 0), SAIDA],
    ["Saldo", `SUM(${faixa})`, soma(() => true), PETROLEO],
  ].forEach(([nome, formula, resultado, cor], i) => {
    const r = 5 + i;
    ws.mergeCells(`A${r}:B${r}`);
    ws.getCell(`A${r}`).value = nome;
    ws.getCell(`A${r}`).font = fonte({ size: 11, color: { argb: SUAVE } });
    const c = ws.getCell(`C${r}`);
    c.value = { formula, result: resultado };
    c.numFmt = MOEDA;
    c.font = fonte({ size: nome === "Saldo" ? 15 : 13, bold: true, color: { argb: cor } });
    c.alignment = { horizontal: "right" };
    for (const col of ["A", "B", "C"]) ws.getCell(`${col}${r}`).border = borda("thin");
  });
  ws.getCell("A8").value = `${linhas.length} movimentações`;
  ws.getCell("A8").font = fonte({ size: 10, italic: true, color: { argb: SUAVE } });

  // 3) cabeçalho da tabela
  const cab = topo - 1;
  ["Data", "Descrição", "Valor", "Categoria"].forEach((titulo, i) => {
    const c = ws.getCell(`${colunas[i]}${cab}`);
    c.value = titulo;
    c.font = fonte({ bold: true, color: { argb: BRANCO } });
    c.fill = preencher(PETROLEO_2);
    c.alignment = { horizontal: i === 2 ? "right" : "left", vertical: "middle", indent: 1 };
  });
  ws.getRow(cab).height = 24;

  // 4) uma linha por movimentação (listrada: linhas ímpares com fundo claro; valor verde se entrou, vermelho se saiu)
  linhas.forEach((m, i) => {
    const r = topo + i;
    const valores = [new Date(m.data + "T00:00:00Z"), m.descricao, m.valor, nomesCategoria.get(m.categoria_id) ?? "Sem categoria"];
    colunas.forEach((col, j) => {
      const c = ws.getCell(`${col}${r}`);
      c.value = valores[j];
      c.font = fonte(j === 2 ? { bold: true, color: { argb: m.valor > 0 ? ENTRADA : SAIDA } } : j === 1 ? {} : { color: { argb: SUAVE } });
      c.border = borda("hair");
      c.alignment = { horizontal: j === 2 ? "right" : "left", indent: 1, vertical: "middle" };
      if (i % 2) c.fill = preencher(FUNDO);
    });
    ws.getCell(`A${r}`).numFmt = "DD/MM/YYYY";
    ws.getCell(`C${r}`).numFmt = MOEDA;
    ws.getRow(r).height = 20;
  });
  if (linhas.length) ws.autoFilter = `A${cab}:D${fim}`;

  return { buffer: Buffer.from(await wb.xlsx.writeBuffer()), tipo: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" };
}

// OFX 1.02 (SGML, o formato dos bancos): cabeçalho + conta + uma tag <STMTTRN> por movimentação + saldo.
// Mantém o fitid de cada linha, então dá para reimportar sem duplicar
export function gerarOfx(linhas) {
  const hoje = new Date().toISOString().slice(0, 10).replaceAll("-", "");
  const dt = (iso) => iso.replaceAll("-", "") + "000000";
  const datas = linhas.map((m) => m.data);
  const ini = datas.length ? datas[0] : null, fim = datas.length ? datas.at(-1) : null; // já vêm ordenadas
  const esc = (t) => t.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;"); // texto seguro no OFX
  const trans = linhas.map((m) =>
    `<STMTTRN>\n<TRNTYPE>${m.valor > 0 ? "CREDIT" : "DEBIT"}\n<DTPOSTED>${dt(m.data)}\n<TRNAMT>${m.valor.toFixed(2)}\n<FITID>${m.fitid}\n<MEMO>${esc(m.descricao)}\n</STMTTRN>\n`
  ).join("");
  const saldo = linhas.reduce((s, m) => s + m.valor, 0);
  const texto =
    "OFXHEADER:100\nDATA:OFXSGML\nVERSION:102\nSECURITY:NONE\nENCODING:UTF-8\nCHARSET:NONE\nCOMPRESSION:NONE\nOLDFILEUID:NONE\nNEWFILEUID:NONE\n\n" +
    `<OFX>\n<SIGNONMSGSRSV1>\n<SONRS>\n<STATUS>\n<CODE>0\n<SEVERITY>INFO\n</STATUS>\n<DTSERVER>${hoje}000000\n<LANGUAGE>POR\n</SONRS>\n</SIGNONMSGSRSV1>\n` +
    "<BANKMSGSRSV1>\n<STMTTRNRS>\n<TRNUID>1\n<STATUS>\n<CODE>0\n<SEVERITY>INFO\n</STATUS>\n<STMTRS>\n<CURDEF>BRL\n<BANKACCTFROM>\n<BANKID>000\n<ACCTID>exportado\n<ACCTTYPE>CHECKING\n</BANKACCTFROM>\n" +
    `<BANKTRANLIST>\n<DTSTART>${ini ? dt(ini) : hoje + "000000"}\n<DTEND>${fim ? dt(fim) : hoje + "000000"}\n${trans}</BANKTRANLIST>\n` +
    `<LEDGERBAL>\n<BALAMT>${saldo.toFixed(2)}\n<DTASOF>${fim ? dt(fim) : hoje + "000000"}\n</LEDGERBAL>\n</STMTRS>\n</STMTTRNRS>\n</BANKMSGSRSV1>\n</OFX>\n`;
  return { buffer: Buffer.from(texto, "utf8"), tipo: "application/x-ofx" };
}
