import { useCallback, useEffect, useRef, useState } from "react";
import * as api from "../api.js";

// Mensagem quando a API Python não responde
const SEM_API = "Não consegui falar com a API. Rode `python api.py` na raiz do projeto.";

// HOOK CENTRAL DE DADOS: guarda a lista de movimentações, faz criar/editar/excluir/importar
// e controla os estados de carregamento. Todos os módulos usam este mesmo objeto.
export default function useExtrato() {
  // estados da tela
  const [movs, setMovs] = useState(null); // null = carregando
  const [erro, setErro] = useState("");
  const [aviso, setAviso] = useState("");
  const [ocupado, setOcupado] = useState(null); // "importando" | "salvando" | "excluindo"
  const [atualizando, setAtualizando] = useState(false);
  const [demora, setDemora] = useState(false);
  const [destaque, setDestaque] = useState(new Set());
  const [saindo, setSaindo] = useState(null);
  const anteriores = useRef(null);

  // Busca a lista no servidor. Compara com a anterior para destacar linhas novas ou editadas.
  const carregar = useCallback((editados = []) => {
    setAtualizando(true);
    return api
      .listar()
      .then((d) => {
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
      .catch(() => setErro(SEM_API))
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

  return { movs, erro, setErro, aviso, ocupado, atualizando, demora, destaque, saindo, carregar, salvar, excluir, importar };
}
