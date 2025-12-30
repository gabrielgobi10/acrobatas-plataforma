import React, { useState, useEffect, useRef } from "react";
import { motion } from "framer-motion";
import {
  Building2,
  Send,
  Loader2,
  MapPin,
  Calendar,
  Users,
  FileText,
  AlertTriangle,
} from "lucide-react";
import { supabase } from "../../../../lib/supabase";
import toast from "react-hot-toast";
import { useNavigate, useLocation } from "react-router-dom";
import { useAuth } from "../../../../context/AuthContext";

type RuaSugestao = {
  display_name: string;
  lat: string;
  lon: string;
  address?: {
    road?: string;
    pedestrian?: string;
    house_number?: string;
    postcode?: string;
    city?: string;
    town?: string;
    village?: string;
    municipality?: string;
    county?: string;
    state?: string;
    suburb?: string;
    city_district?: string;
  };
};

export default function AdicionarObra() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const location = useLocation();
  const dadosPedido = (location.state as any) || {};
  const pedidoId: string | undefined = dadosPedido?.pedidoId;

  const [loading, setLoading] = useState(false);

  const [form, setForm] = useState({
    nomeObra: "",
    empresa: user?.email || "",
    codigo_postal: "",
    rua: "",
    numero: "",
    distrito: "",
    concelho: "",
    freguesia: "",
    local: "",
    dataInicio: "",
    previsaoTermino: "",
    profissionais: "",
    descricao: "",
  });

  // ====== estados para auto-complete / auto-preenchimento ======
  const [cpLoading, setCpLoading] = useState(false);
  const [ruaSugestoes, setRuaSugestoes] = useState<RuaSugestao[]>([]);
  const [ruaLoading, setRuaLoading] = useState(false);
  const ruaDebounce = useRef<number | null>(null);

  useEffect(() => {
    if (dadosPedido && Object.keys(dadosPedido).length > 0) {
      setForm((prev) => ({
        ...prev,
        nomeObra: dadosPedido.nomeObra || "",
        empresa:
          dadosPedido.empresa || dadosPedido.nome_empresa || user?.email || "",
        local: dadosPedido.local || prev.local,
        dataInicio: dadosPedido.dataInicio || dadosPedido.data_inicio || "",
        previsaoTermino:
          dadosPedido.previsaoTermino || dadosPedido.data_fim || "",
        profissionais:
          dadosPedido.profissionais ||
          (dadosPedido.quantidade ? String(dadosPedido.quantidade) : "") ||
          "",
        descricao: dadosPedido.descricao || dadosPedido.observacoes || "",
      }));
    }
  }, [dadosPedido, user]);

  const setField = (
    name: keyof typeof form,
    value: string | number | null | undefined
  ) => setForm((f) => ({ ...f, [name]: (value ?? "") as any }));

  const onInput =
    (name: keyof typeof form) =>
    (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
      setField(name, e.target.value);

  // ===================== CÓDIGO-POSTAL COM AUTOPREENCHIMENTO =====================
  const onCodigoPostal = (e: React.ChangeEvent<HTMLInputElement>) => {
    let v = e.target.value.toUpperCase().replace(/\s+/g, "");
    v = v.replace(/[^0-9-]/g, "");
    const digits = v.replace(/-/g, "");
    if (/^\d{4}\d{0,3}$/.test(digits)) {
      v =
        digits.length > 4 ? `${digits.slice(0, 4)}-${digits.slice(4, 7)}` : digits;
    }
    setField("codigo_postal", v);

    if (/^\d{4}-\d{3}$/.test(v)) {
      preencherEnderecoPorCodigoPostal(v);
    }
  };

  const preencherEnderecoPorCodigoPostal = async (cp: string) => {
    try {
      setCpLoading(true);

      const url =
        "https://nominatim.openstreetmap.org/search?format=json" +
        "&limit=1&addressdetails=1&country=Portugal&postalcode=" +
        encodeURIComponent(cp);

      const r = await fetch(url, {
        headers: {
          "Accept-Language": "pt-PT",
        },
      });

      if (!r.ok) {
        setCpLoading(false);
        return;
      }

      const j = (await r.json()) as RuaSugestao[];
      const addr = j?.[0]?.address;
      if (!addr) {
        setCpLoading(false);
        return;
      }

      setForm((prev) => ({
        ...prev,
        concelho:
          prev.concelho ||
          addr.city ||
          addr.town ||
          addr.village ||
          addr.municipality ||
          "",
        distrito: prev.distrito || addr.state || "",
        freguesia:
          prev.freguesia ||
          addr.suburb ||
          addr.city_district ||
          addr.county ||
          "",
        local: prev.local || addr.city || addr.town || addr.village || "",
      }));
    } catch (err) {
      console.error("Erro ao buscar dados do código-postal:", err);
    } finally {
      setCpLoading(false);
    }
  };

  // ===================== AUTO-COMPLETE DA RUA =====================
  useEffect(() => {
    if (!form.rua || form.rua.trim().length < 3) {
      setRuaSugestoes([]);
      return;
    }

    if (ruaDebounce.current) {
      window.clearTimeout(ruaDebounce.current);
    }

    ruaDebounce.current = window.setTimeout(() => {
      buscarSugestoesRua(form.rua, form.codigo_postal);
    }, 450);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [form.rua, form.codigo_postal]);

  const buscarSugestoesRua = async (textoRua: string, cp: string) => {
    try {
      setRuaLoading(true);

      const params = new URLSearchParams({
        format: "json",
        addressdetails: "1",
        limit: "5",
        country: "Portugal",
        street: textoRua,
      });

      if (/^\d{4}-\d{3}$/.test(cp)) {
        params.append("postalcode", cp);
      }

      const url = `https://nominatim.openstreetmap.org/search?${params.toString()}`;

      const r = await fetch(url, {
        headers: { "Accept-Language": "pt-PT" },
      });
      if (!r.ok) {
        setRuaSugestoes([]);
        setRuaLoading(false);
        return;
      }

      const j = (await r.json()) as RuaSugestao[];
      setRuaSugestoes(j);
    } catch (err) {
      console.error("Erro ao buscar sugestões de rua:", err);
      setRuaSugestoes([]);
    } finally {
      setRuaLoading(false);
    }
  };

  const escolherSugestaoRua = (s: RuaSugestao) => {
    const addr = s.address || {};
    const nomeRua =
      addr.road || addr.pedestrian || form.rua || s.display_name || "";

    setRuaSugestoes([]);

    setForm((prev) => ({
      ...prev,
      rua: nomeRua,
      numero: prev.numero || addr.house_number || "",
      codigo_postal: prev.codigo_postal || addr.postcode || "",
      concelho:
        prev.concelho ||
        addr.city ||
        addr.town ||
        addr.village ||
        addr.municipality ||
        "",
      distrito: prev.distrito || addr.state || "",
      freguesia:
        prev.freguesia ||
        addr.suburb ||
        addr.city_district ||
        addr.county ||
        "",
      local: prev.local || addr.city || addr.town || addr.village || "",
    }));
  };

  // ===================== GEOCODING FINAL (lat/lon) =====================
  const geocode = async (address: string) => {
    try {
      const url = `https://nominatim.openstreetmap.org/search?format=json&limit=1&addressdetails=1&q=${encodeURIComponent(
        address
      )}`;
      const r = await fetch(url, { headers: { "Accept-Language": "pt-PT" } });
      if (!r.ok)
        return { lat: null as number | null, lon: null as number | null };
      const j = (await r.json()) as Array<{ lat: string; lon: string }>;
      if (j?.[0]) {
        return {
          lat: Number(j[0].lat) || null,
          lon: Number(j[0].lon) || null,
        };
      }
    } catch {}
    return { lat: null as number | null, lon: null as number | null };
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (
      !form.nomeObra.trim() ||
      !form.empresa ||
      !form.dataInicio ||
      !form.previsaoTermino ||
      !form.profissionais ||
      !form.codigo_postal ||
      !form.numero
    ) {
      toast.error(
        "Campos obrigatórios: Nome, Empresa, Datas, Nº de Profissionais, Código-postal e Número."
      );
      return;
    }

    try {
      setLoading(true);

      // garante que temos utilizador autenticado
      if (!user?.id) {
        toast.error("Sessão inválida. Inicie sessão novamente.");
        setLoading(false);
        return;
      }

      // usa a RPC que recebe o auth_uid
      const { data: empresaRPC, error: empErr } = await supabase.rpc(
        "minha_empresa_id_by_auth",
        { auth_uid: user.id }
      );

      if (empErr) {
        console.error("Erro RPC minha_empresa_id_by_auth:", empErr);
        toast.error("Não foi possível encontrar a empresa desta conta.");
        setLoading(false);
        return;
      }

      const empresaId = (empresaRPC as string) || null;

      // 🔔 caso não exista empresa associada, mostra alerta bonito e não cria obra
      if (!empresaId) {
        toast.custom((t) => (
          <div
            className={`max-w-sm w-full bg-amber-50 border border-amber-200 rounded-xl shadow-lg p-4 flex gap-3 ${
              t.visible ? "animate-enter" : "animate-leave"
            }`}
          >
            <div className="mt-1">
              <AlertTriangle className="w-5 h-5 text-amber-500" />
            </div>
            <div className="flex-1">
              <p className="text-sm font-semibold text-amber-900">
                Complete o perfil da empresa
              </p>
              <p className="mt-1 text-xs text-amber-800">
                Para criar obras, é necessário concluir o registo da empresa e
                associar esta conta a uma empresa ativa.
              </p>

              <div className="mt-3 flex gap-2">
                <button
                  onClick={() => {
                    toast.dismiss(t.id);
                  }}
                  className="text-xs px-3 py-1.5 rounded-lg border border-amber-200 text-amber-800 hover:bg-amber-100 transition"
                >
                  Agora não
                </button>
                <button
                  onClick={() => {
                    toast.dismiss(t.id);
                    navigate("/empresa/configuracoes/perfil");
                  }}
                  className="text-xs px-3 py-1.5 rounded-lg bg-amber-500 text-white hover:bg-amber-600 transition"
                >
                  Ir para o perfil da empresa
                </button>
              </div>
            </div>
          </div>
        ));
        setLoading(false);
        return;
      }

      const enderecoCompleto = [
        form.rua && `${form.rua} ${form.numero}`,
        form.codigo_postal,
        form.freguesia,
        form.concelho,
        form.distrito,
        "Portugal",
      ]
        .filter(Boolean)
        .join(", ");

      const { lat, lon } = await geocode(enderecoCompleto);

      const enderecoResumido = [
        form.rua && `${form.rua}${form.numero ? ", " + form.numero : ""}`,
        form.codigo_postal,
        form.concelho,
        form.distrito || "Portugal",
      ]
        .filter(Boolean)
        .join(" — ");

      const payload: any = {
        nome: form.nomeObra,
        descricao: form.descricao || "",
        endereco: enderecoResumido || form.local || "",
        cidade: form.concelho || form.local || "",
        pais: "Portugal",

        local: form.local || null,
        cep: form.codigo_postal || null,
        rua: form.rua || null,
        numero: form.numero || null,
        distrito: form.distrito || null,
        concelho: form.concelho || null,

        coordenadas: lat !== null && lon !== null ? { lat, lon } : null,
        latitude: lat,
        longitude: lon,

        data_inicio: form.dataInicio,
        data_fim: form.previsaoTermino,
        status: "A iniciar",
        progresso_total: 0,
        custo_total: 0,
        horas_trabalhadas_total: 0,
        criado_em: new Date().toISOString(),
        empresa_id: empresaId,
      };

      const { data, error } = await supabase
        .from("obras")
        .insert([payload])
        .select("id");

      if (error) {
        console.error("Erro ao salvar obra:", error);
        toast.error("Erro ao salvar obra.");
        setLoading(false);
        return;
      }

      const novaObraId = data?.[0]?.id as string | undefined;

      if (pedidoId) {
        const { error: convErr } = await supabase
          .from("pedidos_empresa_v2")
          .update({ convertido: true })
          .eq("id", pedidoId);
        if (convErr) console.error("Erro ao marcar convertido:", convErr);
      }

      toast.success("🏗️ Obra criada com sucesso!");

      window.dispatchEvent(
        new CustomEvent("setSection", { detail: "obras-ativas" })
      );

      if (novaObraId) {
        navigate(`/empresa/obras/ativas?novaObra=${novaObraId}`, {
          replace: true,
        });
      } else {
        navigate(`/empresa/obras/ativas`, { replace: true });
      }
    } catch (e: any) {
      console.error("Erro ao criar obra:", e?.message || e);
      toast.error("Erro inesperado ao criar obra.");
    } finally {
      setLoading(false);
    }
  };

  // ====== CLASSES BASE PARA INPUTS / TEXTAREA ======
  const inputBase =
    "w-full rounded-xl border px-3 py-2.5 text-sm md:text-[15px] " +
    "bg-white/90 border-slate-200 text-slate-900 placeholder:text-slate-400 " +
    "focus:outline-none focus:ring-2 focus:ring-blue-500/60 focus:border-blue-500 " +
    "dark:bg-slate-900/70 dark:border-slate-700 dark:text-slate-100 dark:placeholder:text-slate-500 " +
    "transition-colors";

  const textareaBase =
    "w-full rounded-2xl border px-3 py-3 text-sm md:text-[15px] " +
    "bg-white/90 border-slate-200 text-slate-900 placeholder:text-slate-400 " +
    "focus:outline-none focus:ring-2 focus:ring-blue-500/60 focus:border-blue-500 " +
    "dark:bg-slate-900/70 dark:border-slate-700 dark:text-slate-100 dark:placeholder:text-slate-500 " +
    "transition-colors";

  const cardBase =
    "bg-white/80 dark:bg-slate-950/70 border border-slate-200/70 dark:border-slate-800/80 " +
    "rounded-2xl shadow-sm md:shadow-md p-4 md:p-6 space-y-4";

  return (
    <div className="px-4 md:px-8 py-6 md:py-8">
      <div className="max-w-6xl mx-auto space-y-6 md:space-y-8 pb-16">
        {/* HEADER FORA DO CARTÃO */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.25 }}
          className="flex items-start gap-3"
        >
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-50 text-blue-600 dark:bg-blue-500/10 dark:text-blue-400">
            <Building2 className="w-5 h-5" />
          </div>

          <div className="flex flex-col gap-1">
            <h1 className="text-xl md:text-2xl font-semibold text-slate-900 dark:text-slate-50">
              Adicionar Obra
            </h1>
            <p className="text-xs md:text-sm text-slate-500 dark:text-slate-400 max-w-2xl">
              Registe uma nova obra com os dados principais e o endereço
              completo para facilitar a gestão das equipas em campo.
            </p>
          </div>
        </motion.div>

        {/* FORM EM GRID DE CARTÕES */}
        <motion.form
          onSubmit={handleSubmit}
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
          className="space-y-6 md:space-y-7"
        >
          {/* IDENTIFICAÇÃO + ENDEREÇO EM DUAS COLUNAS */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* IDENTIFICAÇÃO */}
            <section className={cardBase}>
              <div className="flex items-center gap-2">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-50 text-blue-600 dark:bg-blue-500/10 dark:text-blue-400">
                  <FileText className="w-4 h-4" />
                </div>
                <div>
                  <h2 className="text-sm md:text-base font-semibold text-slate-900 dark:text-slate-50">
                    Identificação
                  </h2>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    Dados principais da obra e da empresa responsável.
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-1 gap-4 mt-2">
                <div>
                  <label className="block text-xs md:text-sm font-medium mb-1 text-slate-700 dark:text-slate-200">
                    Nome da Obra
                  </label>
                  <input
                    type="text"
                    value={form.nomeObra}
                    onChange={onInput("nomeObra")}
                    placeholder="Ex: Remodelação Apartamento"
                    required
                    className={inputBase}
                  />
                </div>

                <div>
                  <label className="block text-xs md:text-sm font-medium mb-1 text-slate-700 dark:text-slate-200">
                    Empresa
                  </label>
                  <input
                    type="text"
                    value={form.empresa}
                    readOnly
                    className={`${inputBase} bg-slate-50/90 dark:bg-slate-900/60 text-slate-500 dark:text-slate-400 cursor-not-allowed`}
                  />
                </div>
              </div>
            </section>

            {/* ENDEREÇO */}
            <section className={cardBase}>
              <div className="flex items-center gap-2">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-50 text-blue-600 dark:bg-blue-500/10 dark:text-blue-400">
                  <MapPin className="w-4 h-4" />
                </div>
                <div>
                  <h2 className="text-sm md:text-base font-semibold text-slate-900 dark:text-slate-50">
                    Endereço
                  </h2>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    A morada completa permite gerar automaticamente a
                    localização (lat/lon) da obra.
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-2 md:grid-cols-2 gap-4 mt-2">
                <div className="col-span-2 md:col-span-1">
                  <label className="block text-xs md:text-sm font-medium mb-1 text-slate-700 dark:text-slate-200">
                    Código-postal *
                  </label>
                  <div className="relative">
                    <input
                      type="text"
                      inputMode="numeric"
                      value={form.codigo_postal}
                      onChange={onCodigoPostal}
                      placeholder="Ex: 1200-123"
                      required
                      className={inputBase}
                    />
                    {cpLoading && (
                      <Loader2 className="w-4 h-4 animate-spin absolute right-3 top-1/2 -translate-y-1/2 text-slate-400" />
                    )}
                  </div>
                </div>

                <div className="col-span-2 md:col-span-1">
                  <label className="block text-xs md:text-sm font-medium mb-1 text-slate-700 dark:text-slate-200">
                    Nº da Porta *
                  </label>
                  <input
                    type="text"
                    value={form.numero}
                    onChange={onInput("numero")}
                    placeholder="Ex: 245"
                    required
                    className={inputBase}
                  />
                </div>
              </div>

              <div className="relative mt-3">
                <label className="block text-xs md:text-sm font-medium mb-1 text-slate-700 dark:text-slate-200">
                  Rua
                </label>
                <input
                  type="text"
                  value={form.rua}
                  onChange={onInput("rua")}
                  placeholder="Ex: Rua da Prata"
                  className={inputBase}
                  autoComplete="off"
                />

                {ruaSugestoes.length > 0 && (
                  <div className="absolute z-20 mt-1 w-full max-h-56 overflow-y-auto rounded-xl border border-slate-200 bg-white shadow-lg text-sm dark:bg-slate-900 dark:border-slate-700">
                    {ruaSugestoes.map((s, idx) => (
                      <button
                        key={idx}
                        type="button"
                        onClick={() => escolherSugestaoRua(s)}
                        className="w-full text-left px-3 py-2 hover:bg-blue-50 dark:hover:bg-slate-800"
                      >
                        {s.display_name}
                      </button>
                    ))}
                    {ruaLoading && (
                      <div className="flex items-center gap-2 px-3 py-2 text-xs text-slate-500 dark:text-slate-400">
                        <Loader2 className="w-3 h-3 animate-spin" />
                        A carregar sugestões…
                      </div>
                    )}
                  </div>
                )}
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-3">
                <div>
                  <label className="block text-xs md:text-sm font-medium mb-1 text-slate-700 dark:text-slate-200">
                    Concelho
                  </label>
                  <input
                    type="text"
                    value={form.concelho}
                    onChange={onInput("concelho")}
                    placeholder="Ex: Lisboa"
                    className={inputBase}
                  />
                </div>

                <div>
                  <label className="block text-xs md:text-sm font-medium mb-1 text-slate-700 dark:text-slate-200">
                    Distrito
                  </label>
                  <input
                    type="text"
                    value={form.distrito}
                    onChange={onInput("distrito")}
                    placeholder="Ex: Lisboa"
                    className={inputBase}
                  />
                </div>

                <div>
                  <label className="block text-xs md:text-sm font-medium mb-1 text-slate-700 dark:text-slate-200">
                    Freguesia
                  </label>
                  <input
                    type="text"
                    value={form.freguesia}
                    onChange={onInput("freguesia")}
                    placeholder="Ex: Santa Maria Maior"
                    className={inputBase}
                  />
                </div>
              </div>

              <div className="mt-3">
                <label className="block text-xs md:text-sm font-medium mb-1 text-slate-700 dark:text-slate-200">
                  Local (livre)
                </label>
                <input
                  type="text"
                  value={form.local}
                  onChange={onInput("local")}
                  placeholder="Ex: Almada, Setúbal"
                  className={inputBase}
                />
              </div>
            </section>
          </div>

          {/* DATAS & EQUIPE */}
          <section className={cardBase}>
            <div className="flex items-center gap-2">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-50 text-blue-600 dark:bg-blue-500/10 dark:text-blue-400">
                <Calendar className="w-4 h-4" />
              </div>
              <div>
                <h2 className="text-sm md:text-base font-semibold text-slate-900 dark:text-slate-50">
                  Datas & Equipe
                </h2>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Período previsto e tamanho da equipa alocada.
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-2">
              <div>
                <label className="block text-xs md:text-sm font-medium mb-1 text-slate-700 dark:text-slate-200">
                  Data de Início
                </label>
                <input
                  type="date"
                  value={form.dataInicio}
                  onChange={onInput("dataInicio")}
                  required
                  className={inputBase}
                />
              </div>

              <div>
                <label className="block text-xs md:text-sm font-medium mb-1 text-slate-700 dark:text-slate-200">
                  Previsão de Término
                </label>
                <input
                  type="date"
                  value={form.previsaoTermino}
                  onChange={onInput("previsaoTermino")}
                  required
                  className={inputBase}
                />
              </div>

              <div>
                <label className="block text-xs md:text-sm font-medium mb-1 text-slate-700 dark:text-slate-200">
                  Nº de Profissionais
                </label>
                <div className="relative">
                  <Users className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 dark:text-slate-500 pointer-events-none" />
                  <input
                    type="number"
                    value={form.profissionais}
                    onChange={onInput("profissionais")}
                    min={1}
                    required
                    className={`${inputBase} pl-9`}
                  />
                </div>
              </div>
            </div>
          </section>

          {/* DESCRIÇÃO */}
          <section className={cardBase}>
            <div className="flex items-center gap-2">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-50 text-blue-600 dark:bg-blue-500/10 dark:text-blue-400">
                <FileText className="w-4 h-4" />
              </div>
              <div>
                <h2 className="text-sm md:text-base font-semibold text-slate-900 dark:text-slate-50">
                  Descrição / Observações
                </h2>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Contexto da obra, detalhes importantes e notas internas.
                </p>
              </div>
            </div>

            <textarea
              value={form.descricao}
              onChange={onInput("descricao")}
              rows={4}
              placeholder="Descreva brevemente o tipo de obra, principais frentes de trabalho, horários, acessos, etc."
              className={textareaBase}
            />
          </section>

          {/* FOOTER / BOTÃO */}
          <div className="flex justify-end pt-1">
            <motion.button
              whileTap={{ scale: 0.97 }}
              type="submit"
              disabled={loading}
              className="flex items-center gap-2 rounded-xl px-6 py-2.5 text-sm font-medium
                         bg-blue-600 text-white hover:bg-blue-700
                         disabled:opacity-60 disabled:cursor-not-allowed
                         shadow-sm dark:shadow-none transition-colors"
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Salvando…
                </>
              ) : (
                <>
                  <Send className="w-4 h-4" />
                  Adicionar Obra
                </>
              )}
            </motion.button>
          </div>
        </motion.form>
      </div>
    </div>
  );
}
