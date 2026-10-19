import { useCallback, useEffect, useRef, useState } from "react";
import * as api from "../api.js";

const SEM_API = "Não consegui falar com a API. Rode `python api.py` na raiz do projeto.";

// dados das movimentacoes + operacoes + estados de carregamento, compartilhados pelos modulos
export default function useExtrato() {
  const [movs, setMovs] = useState(null); // null = carregando
  const [erro, setErro] = useState("");
  const [aviso, setAviso] = useState("");
  const [ocupado, setOcupado] = useState(null); // "importando" | "salvando" | "excluindo"
  const [atualizando, setAtualizando] = useState(false);
  const [demora, setDemora] = useState(false);
  const [destaque, setDestaque] = useState(new Set());
  const [saindo, setSaindo] = useState(null);
  const anteriores = useRef(null);

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

  useEffect(() => { carregar(); }, [carregar]);

  // banco serverless pode demorar para acordar: avisa em vez de parecer travado
  useEffect(() => {
    if (movs !== null || erro) return setDemora(false);
    const t = setTimeout(() => setDemora(true), 3500);
    return () => clearTimeout(t);
  }, [movs, erro]);

  // devolve o texto do erro (para o formulario mostrar) ou undefined se deu certo
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
