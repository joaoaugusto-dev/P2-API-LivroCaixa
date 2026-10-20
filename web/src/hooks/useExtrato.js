// DADOS DA APLICAÇÃO (hook central): lista de movimentações e categorias, todas as operações e os estados de carregamento.
import { useCallback, useEffect, useRef, useState } from "react";
import * as api from "../api.js";
import { plural } from "../format.js";

// Mensagem quando a API Python não responde
const SEM_API = "Não consegui falar com a API. Rode `python api.py` na raiz do projeto.";

// HOOK CENTRAL DE DADOS: guarda a lista de movimentações, faz criar/editar/excluir/importar
// e controla os estados de carregamento. Todos os módulos usam este mesmo objeto.
export default function useExtrato() {
  // estados da tela
  const [movs, setMovs] = useState(null); // null = carregando
  const [categorias, setCategorias] = useState([]); // [{id, nome, cor, qtd, total}]
  const [erro, setErro] = useState("");
  const [aviso, setAviso] = useState("");
  const [ocupado, setOcupado] = useState(null); // "importando" | "salvando" | "excluindo"
  const [atualizando, setAtualizando] = useState(false);
  const [demora, setDemora] = useState(false);
  const [destaque, setDestaque] = useState(new Set());
  const [saindo, setSaindo] = useState(null);
  const anteriores = useRef(null);
  // ids das movimentações cuja confirmação está ANIMANDO agora (id -> posição, para o efeito em cascata)
  const [confirmando, setConfirmando] = useState(new Map());

  // Busca a lista no servidor. Compara com a anterior para destacar linhas novas ou editadas.
  const carregar = useCallback((editados = []) => {
    setAtualizando(true);
    // busca movimentações e categorias juntas (a tela sempre precisa das duas)
    return Promise.all([api.listar(), api.categorias()])
      .then(([d, cats]) => {
        setCategorias(cats);
        const novos = anteriores.current ? d.filter((m) => !anteriores.current.has(m.id)).map((m) => m.id) : [];
        anteriores.current = new Set(d.map((m) => m.id));
        setSaindo(null);
        setMovs(d);
        setErro("");
        if (novos.length || editados.length) {
          setDestaque(new Set([...novos, ...editados]));
          setTimeout(() => setDestaque(new Set()), 1800);
        }
      })
      .catch((e) => setErro(typeof e === "string" ? e : SEM_API)) // mensagem do servidor (ex.: sem banco) ou "API fora do ar"
      .finally(() => setAtualizando(false));
  }, []);

  // carrega a lista ao abrir a página
  useEffect(() => { carregar(); }, [carregar]);

  // O banco serverless (Neon) pode demorar para acordar: depois de 3,5 s avisa em vez de parecer travado
  useEffect(() => {
    if (movs !== null || erro) return setDemora(false);
    const t = setTimeout(() => setDemora(true), 3500);
    return () => clearTimeout(t);
  }, [movs, erro]);

  // CRIAR/EDITAR: devolve o texto do erro (o formulário mostra) ou nada se deu certo
  const salvar = async (corpo, id) => {
    setOcupado("salvando");
    try {
      const r = await api.salvar(corpo, id);
      if (!r.ok) return (await r.json()).erro;
      setAviso(id ? "Movimentação atualizada." : "Movimentação adicionada.");
      carregar(id ? [id] : []);
    } catch {
      return "Não consegui falar com a API. Tente de novo.";
    } finally {
      setOcupado(null);
    }
  };

  // EXCLUIR: a linha sai da tela antes de a lista recarregar
  const excluir = async (id) => {
    setOcupado("excluindo");
    try {
      await api.excluir(id);
      setSaindo(id); // a linha sai antes de a lista recarregar
      setAviso("Movimentação excluída.");
      setTimeout(carregar, 220);
      return true;
    } catch {
      setAviso("Não consegui excluir. Tente de novo.");
    } finally {
      setOcupado(null);
    }
  };

  // CATEGORIA: a pessoa escolhe ou confirma. A tela muda na hora (otimista) e o servidor aprende com a escolha.
  const definirCategoria = async (id, categoriaId) => {
    setMovs((l) => l.map((m) => (m.id === id ? { ...m, categoria_id: categoriaId, auto: false, confianca: null } : m)));
    try {
      const r = await api.definirCategoria(id, categoriaId);
      const d = await r.json();
      if (!r.ok) throw new Error();
      setAviso(d.atualizadas ? `Categoria definida. Aprendi com isso e atualizei ${plural(d.atualizadas, "sugestão", "sugestões")}.` : "Categoria definida.");
    } catch {
      setAviso("Não consegui salvar a categoria. Tente de novo.");
    }
    carregar();
  };

  // Espera a animação de confirmação terminar antes de gravar (sem espera se a pessoa pediu menos movimento)
  const esperar = (ms) => new Promise((ok) => setTimeout(ok, matchMedia("(prefers-reduced-motion: reduce)").matches ? 0 : ms));
  // liga a animação nas movimentações indicadas ([id, posição])
  const marcar = (pares) => setConfirmando((m) => new Map([...m, ...pares]));
  // desliga a animação (depois de gravar)
  const desmarcar = (ids) => setConfirmando((m) => new Map([...m].filter(([id]) => !ids.includes(id))));

  // CONFIRMAR UMA sugestão (o ✓): toca a animação (~0,65 s) e só então grava. Cada confirmação vira exemplo de treino.
  const confirmarCategoria = async (mov) => {
    if (confirmando.has(mov.id)) return; // evita clique duplo
    marcar([[mov.id, 0]]);
    await esperar(650);
    await definirCategoria(mov.id, mov.categoria_id);
    desmarcar([mov.id]);
  };

  // CONFIRMAR TODAS de uma vez: as linhas animam em cascata (70 ms entre uma e outra) e depois tudo é gravado
  const confirmarTodas = async (lista) => {
    if (!lista.length) return;
    marcar(lista.map((m, i) => [m.id, i]));
    await esperar(650 + lista.length * 70);
    const ids = new Set(lista.map((m) => m.id));
    setMovs((l) => l.map((m) => (ids.has(m.id) ? { ...m, auto: false, confianca: null } : m)));
    for (const m of lista) await api.definirCategoria(m.id, m.categoria_id);
    setAviso(`${plural(lista.length, "sugestão confirmada", "sugestões confirmadas")}. O sistema aprendeu com todas.`);
    await carregar();
    desmarcar(lista.map((m) => m.id));
  };

  // Cria uma categoria (devolve o texto do erro, ou {id} se deu certo)
  const criarCategoria = async (nome, cor) => {
    try {
      const r = await api.criarCategoria({ nome, cor });
      const d = await r.json();
      if (!r.ok) return { erro: d.erro };
      await carregar();
      return { id: d.id };
    } catch {
      return { erro: "Não consegui falar com a API. Tente de novo." };
    }
  };

  // Cria uma categoria com a próxima cor livre e já atribui à movimentação (fluxo "criar na hora" do menu)
  const criarEAtribuir = async (movId, nome) => {
    const usadas = new Set(categorias.map((c) => c.cor));
    const cor = [1, 2, 3, 4, 5, 6, 7, 8].find((n) => !usadas.has(n)) ?? (categorias.length % 8) + 1;
    const r = await criarCategoria(nome, cor);
    if (!r.erro) await definirCategoria(movId, r.id);
    return r;
  };

  // Renomeia / troca a cor de uma categoria (devolve o texto do erro, se houver)
  const editarCategoria = async (id, nome, cor) => {
    try {
      const r = await api.editarCategoria(id, { nome, cor });
      if (!r.ok) return (await r.json()).erro;
      setAviso("Categoria atualizada.");
      carregar();
    } catch {
      return "Não consegui falar com a API. Tente de novo.";
    }
  };

  // Apaga a categoria; as movimentações dela voltam a ser classificadas
  const excluirCategoria = async (id) => {
    try {
      await api.excluirCategoria(id);
      setAviso("Categoria excluída. As movimentações dela foram reclassificadas.");
      carregar();
      return true;
    } catch {
      setAviso("Não consegui excluir a categoria. Tente de novo.");
    }
  };

  // Botão "Reaprender": refaz o treino com tudo que já foi confirmado
  const reaprender = async () => {
    setOcupado("aprendendo");
    try {
      const d = await (await api.reclassificar()).json();
      setAviso(d.mudaram ? `Reaprendi e atualizei ${plural(d.mudaram, "classificação", "classificações")}.` : "Reaprendi: nenhuma classificação precisou mudar.");
      await carregar();
    } catch {
      setAviso("Não consegui reaprender agora. Tente de novo.");
    } finally {
      setOcupado(null);
    }
  };

  // IMPORTAR .ofx: envia o arquivo e avisa quantas foram gravadas e quantas já existiam
  const importar = async (arquivo) => {
    if (!arquivo) return;
    setAviso("");
    setOcupado("importando");
    let r, d;
    try {
      r = await api.importar(arquivo);
      d = await r.json();
    } catch {
      return setAviso("Não consegui falar com a API. Tente de novo.");
    } finally {
      setOcupado(null);
    }
    if (!r.ok) return setAviso(d.erro + ". Escolha um arquivo .ofx de extrato.");
    setAviso(
      d.inseridas
        ? `${d.inseridas} movimentações gravadas${d.ignoradas ? `, ${d.ignoradas} já existiam e foram ignoradas` : ""}.`
        : `Nenhuma movimentação nova: as ${d.ignoradas} já estavam salvas.`
    );
    carregar();
  };

  return { movs, categorias, confirmando, confirmarCategoria, criarEAtribuir, definirCategoria, confirmarTodas, criarCategoria, editarCategoria, excluirCategoria, reaprender, erro, setErro, aviso, ocupado, atualizando, demora, destaque, saindo, carregar, salvar, excluir, importar };
}
