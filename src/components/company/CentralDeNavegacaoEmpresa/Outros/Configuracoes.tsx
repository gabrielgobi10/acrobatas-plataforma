// src/pages/Outros/ConfiguracoesConta.tsx
import { useEffect, useMemo, useState } from "react";
import {
  Save, ShieldCheck, Moon, Sun, Languages, Bell, Lock, Eye, EyeOff,
  Smartphone, LogOut, User, MonitorCog, KeyRound, AlertCircle
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { supabase } from "@/lib/supabase";

/** ========== Tipos ========== */
type Theme = "claro" | "escuro" | "auto";
type Size = "compacto" | "padrao" | "amplo";

type Prefs = {
  idioma: "pt" | "en" | "es";
  tema: Theme;
  tamanho: Size;
  notificacoesEmail: boolean;
  notificacoesSistema: boolean;
  somNotificacoes: boolean;
  resumoDiario: boolean;
  animacoesUI: boolean;
  layoutCompacto: boolean;
  dicasAtivas: boolean;
  doisFatores: boolean;
};

type UserProfile = { nome: string; email: string; cargo: string; };

type SessionInfo = {
  id: string;
  dispositivo: string;
  local: string;
  ultimoAcesso: string;
  atual?: boolean;
};

/** ========== UI helpers ========== */
function Card({
  title, subtitle, icon, children,
}: { title: string; subtitle?: string; icon?: JSX.Element; children: React.ReactNode }) {
  return (
    <div
      className="
        rounded-2xl border shadow-sm p-5
        bg-white/90 border-slate-200
        dark:bg-slate-900/70 dark:border-slate-700 backdrop-blur-[2px]
      "
    >
      <div className="flex items-center gap-3 mb-3">
        {icon}
        <div>
          <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-50">{title}</h2>
          {subtitle && <p className="text-sm text-slate-500 dark:text-slate-400">{subtitle}</p>}
        </div>
      </div>
      {children}
    </div>
  );
}

function SectionRow({ children }: { children: React.ReactNode }) {
  return <div className="grid grid-cols-1 md:grid-cols-2 gap-4">{children}</div>;
}

function Label({ children }: { children: React.ReactNode }) {
  return (
    <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
      {children}
    </label>
  );
}

function Input(props: React.InputHTMLAttributes<HTMLInputElement>) {
  const { className = "", ...rest } = props;
  return (
    <input
      {...rest}
      className={[
        "w-full rounded-lg px-3 py-2 text-sm outline-none",
        "border bg-white text-slate-900",
        "focus:ring-2 focus:ring-blue-500/30",
        "border-slate-300",
        "dark:bg-slate-800 dark:text-slate-100 dark:border-slate-700",
        "placeholder:text-slate-400 dark:placeholder:text-slate-500",
        className,
      ].join(" ")}
    />
  );
}

function Select({
  children, className = "", ...rest
}: React.SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <select
      {...rest}
      className={[
        "w-full rounded-lg px-3 py-2 text-sm outline-none",
        "border bg-white text-slate-900",
        "focus:ring-2 focus:ring-blue-500/30",
        "border-slate-300",
        "dark:bg-slate-800 dark:text-slate-100 dark:border-slate-700",
        className,
      ].join(" ")}
    >
      {children}
    </select>
  );
}

function Toggle({ checked, onChange }: { checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <button
      type="button"
      aria-pressed={checked}
      onClick={() => onChange(!checked)}
      className={[
        "relative inline-flex h-6 w-11 items-center rounded-full transition-colors",
        checked ? "bg-blue-600" : "bg-slate-300 dark:bg-slate-600",
      ].join(" ")}
    >
      <span
        className={[
          "inline-block h-5 w-5 transform rounded-full bg-white shadow transition-transform",
          checked ? "translate-x-6" : "translate-x-1",
        ].join(" ")}
      />
    </button>
  );
}

/** ========== Página ========== */
export default function ConfiguracoesConta() {
  // Perfil
  const [perfil, setPerfil] = useState<UserProfile>({ nome: "", email: "", cargo: "" });

  // Preferências
  const [pref, setPref] = useState<Prefs>({
    idioma: "pt",
    tema: "auto",
    tamanho: "padrao",
    notificacoesEmail: true,
    notificacoesSistema: true,
    somNotificacoes: false,
    resumoDiario: false,
    animacoesUI: true,
    layoutCompacto: false,
    dicasAtivas: true,
    doisFatores: false,
  });

  // Segurança
  const [pwdOpen, setPwdOpen] = useState(false);
  const [pwd, setPwd] = useState({ atual: "", nova: "", confirmar: "" });
  const [pwdShow, setPwdShow] = useState({ atual: false, nova: false, confirmar: false });
  const [saving, setSaving] = useState(false);

  // Sessões (mock)
  const [sessoes] = useState<SessionInfo[]>([
    { id: "s1", dispositivo: "Windows • Chrome", local: "Lisboa, PT", ultimoAcesso: "Hoje 16:22", atual: true },
    { id: "s2", dispositivo: "iPhone • Safari", local: "Porto, PT", ultimoAcesso: "Ontem 11:05" },
  ]);

  /** ====== Carregar dados existentes (Supabase) ====== */
  useEffect(() => {
    (async () => {
      try {
        const u = (await supabase.auth.getUser()).data.user;
        if (u) {
          setPerfil({
            nome: (u.user_metadata as any)?.full_name ?? "",
            email: u.email ?? "",
            cargo: (u.user_metadata as any)?.role ?? "",
          });
        }
        const { data } = await supabase.from("user_prefs").select("*").single();
        if (data) setPref((p) => ({ ...p, ...data }));
      } catch {
        // ignora se tabela não existir no ambiente local
      }
    })();
  }, []);

  /** ====== Aplicar tema (e escutar mudanças do sistema) ====== */
  useEffect(() => {
    const root = document.documentElement;
    const mm = window.matchMedia?.("(prefers-color-scheme: dark)");

    const apply = (dark: boolean) => {
      if (dark) root.classList.add("dark");
      else root.classList.remove("dark");
    };

    if (pref.tema === "auto") apply(!!mm?.matches);
    else apply(pref.tema === "escuro");

    const listener = (e: MediaQueryListEvent) => {
      if (pref.tema === "auto") apply(e.matches);
    };
    mm?.addEventListener?.("change", listener);
    return () => mm?.removeEventListener?.("change", listener);
  }, [pref.tema]);

  /** ====== Handlers ====== */
  const handlePref = <K extends keyof Prefs>(k: K, v: Prefs[K]) => setPref((p) => ({ ...p, [k]: v }));
  const handlePerfil = <K extends keyof UserProfile>(k: K, v: UserProfile[K]) => setPerfil((p) => ({ ...p, [k]: v }));

  const progressoConfiguracao = useMemo(() => {
    let filled = 0;
    if (perfil.nome) filled++;
    if (perfil.cargo) filled++;
    if (pref.idioma) filled++;
    if (pref.tema) filled++;
    const total = 4;
    return Math.round((filled / total) * 100);
  }, [perfil, pref]);

  async function salvarTudo() {
    setSaving(true);
    try {
      const userRes = await supabase.auth.getUser();
      if (userRes.data.user) {
        await supabase.auth.updateUser({ data: { full_name: perfil.nome, role: perfil.cargo } });
      }
      await supabase.from("user_prefs").upsert({
        idioma: pref.idioma,
        tema: pref.tema,
        tamanho: pref.tamanho,
        notificacoesEmail: pref.notificacoesEmail,
        notificacoesSistema: pref.notificacoesSistema,
        somNotificacoes: pref.somNotificacoes,
        resumoDiario: pref.resumoDiario,
        animacoesUI: pref.animacoesUI,
        layoutCompacto: pref.layoutCompacto,
        dicasAtivas: pref.dicasAtivas,
        doisFatores: pref.doisFatores,
      });
      alert("Configurações salvas ✅");
    } catch (e: any) {
      alert("Erro ao salvar: " + e.message);
    } finally {
      setSaving(false);
    }
  }

  async function alterarSenha() {
    if (!pwd.nova || pwd.nova !== pwd.confirmar) {
      alert("A nova palavra-passe não confere.");
      return;
    }
    try {
      await supabase.auth.updateUser({ password: pwd.nova });
      setPwd({ atual: "", nova: "", confirmar: "" });
      setPwdOpen(false);
      alert("Palavra-passe alterada ✅");
    } catch (e: any) {
      alert("Erro ao alterar: " + e.message);
    }
  }

  async function encerrarTodasSessoes() {
    try {
      // @ts-ignore
      await supabase.auth.signOut({ scope: "global" });
      alert("Todas as sessões foram encerradas.");
    } catch {
      alert("Não foi possível encerrar agora.");
    }
  }

  return (
    <div className="p-6 max-w-6xl mx-auto">
      {/* Título + progresso */}
      <div className="mb-6">
        <h1 className="text-2xl font-semibold text-slate-900 dark:text-slate-50">
          ⚙️ Configurações da Conta
        </h1>
        <div className="mt-3">
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Configuração geral da experiência do utilizador.
          </p>
          <div className="mt-2 h-2 rounded-full bg-slate-200 dark:bg-slate-700/60 overflow-hidden">
            <div
              className="h-2 rounded-full bg-gradient-to-r from-blue-500 to-indigo-500"
              style={{ width: `${progressoConfiguracao}%` }}
            />
          </div>
          <span className="text-xs text-slate-500 dark:text-slate-400">
            {progressoConfiguracao}% concluído
          </span>
        </div>
      </div>

      <div className="flex flex-col gap-6">
        {/* Perfil */}
        <Card
          title="Dados do Utilizador"
          subtitle="Informações básicas do responsável pela conta."
          icon={<User className="text-blue-500" />}
        >
          <SectionRow>
            <div>
              <Label>Nome completo</Label>
              <Input
                value={perfil.nome}
                onChange={(e) => handlePerfil("nome", e.target.value)}
                placeholder="Ex.: João Silva"
              />
            </div>
            <div>
              <Label>E-mail</Label>
              <Input value={perfil.email} readOnly disabled className="opacity-70" />
            </div>
            <div>
              <Label>Cargo / Função</Label>
              <Input
                value={perfil.cargo}
                onChange={(e) => handlePerfil("cargo", e.target.value)}
                placeholder="Engenheiro, Diretor, RH…"
              />
            </div>
          </SectionRow>
        </Card>

        {/* Preferências */}
        <Card
          title="Preferências de Interface"
          subtitle="Idioma, tema e usabilidade do painel."
          icon={<MonitorCog className="text-blue-500" />}
        >
          <SectionRow>
            <div>
              <Label><Languages className="inline w-4 h-4 mr-1" /> Idioma do sistema</Label>
              <Select
                value={pref.idioma}
                onChange={(e) => handlePref("idioma", e.target.value as Prefs["idioma"])}
              >
                <option value="pt">Português</option>
                <option value="en">English</option>
                <option value="es">Español</option>
              </Select>
            </div>
            <div>
              <Label><Sun className="inline w-4 h-4 mr-1" /> Tema da interface</Label>
              <Select
                value={pref.tema}
                onChange={(e) => handlePref("tema", e.target.value as Theme)}
              >
                <option value="auto">Automático (seguir o sistema)</option>
                <option value="claro">Claro</option>
                <option value="escuro">Escuro</option>
              </Select>
            </div>
            <div>
              <Label><Moon className="inline w-4 h-4 mr-1" /> Tamanho / densidade</Label>
              <Select
                value={pref.tamanho}
                onChange={(e) => handlePref("tamanho", e.target.value as Size)}
              >
                <option value="compacto">Compacto</option>
                <option value="padrao">Padrão</option>
                <option value="amplo">Amplo</option>
              </Select>
            </div>
          </SectionRow>

          <div className="mt-4 grid grid-cols-1 md:grid-cols-3 gap-4">
            <ToggleItem label="Animações de interface" checked={pref.animacoesUI}
              onChange={(v) => handlePref("animacoesUI", v)} />
            <ToggleItem label="Layout compacto" checked={pref.layoutCompacto}
              onChange={(v) => handlePref("layoutCompacto", v)} />
            <ToggleItem label="Mostrar dicas no sistema" checked={pref.dicasAtivas}
              onChange={(v) => handlePref("dicasAtivas", v)} />
          </div>
        </Card>

        {/* Notificações */}
        <Card title="Notificações" subtitle="Escolha como quer ser avisado." icon={<Bell className="text-blue-500" />}>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <ToggleItem label="Receber notificações por e-mail" checked={pref.notificacoesEmail}
              onChange={(v) => handlePref("notificacoesEmail", v)} />
            <ToggleItem label="Receber notificações dentro do sistema" checked={pref.notificacoesSistema}
              onChange={(v) => handlePref("notificacoesSistema", v)} />
            <ToggleItem label="Som de alertas" checked={pref.somNotificacoes}
              onChange={(v) => handlePref("somNotificacoes", v)} />
            <ToggleItem label="Resumo diário de atividades" checked={pref.resumoDiario}
              onChange={(v) => handlePref("resumoDiario", v)} />
          </div>
        </Card>

        {/* Segurança */}
        <Card title="Segurança da Conta" subtitle="Proteja o acesso e gerencie sessões."
          icon={<ShieldCheck className="text-blue-500" />}>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="rounded-xl border p-4 border-slate-200 dark:border-slate-700">
              <p className="text-sm font-medium text-slate-900 dark:text-slate-100 mb-2">
                <KeyRound className="inline w-4 h-4 mr-1" /> Palavra-passe
              </p>
              <p className="text-xs text-slate-500 dark:text-slate-400 mb-3">
                Use pelo menos 8 caracteres.
              </p>
              <button
                onClick={() => setPwdOpen(true)}
                className="px-3 py-2 text-sm rounded-lg bg-blue-600 text-white hover:bg-blue-700"
              >
                Alterar palavra-passe
              </button>
            </div>

            <div className="rounded-xl border p-4 border-slate-200 dark:border-slate-700">
              <p className="text-sm font-medium text-slate-900 dark:text-slate-100 mb-2">
                <Smartphone className="inline w-4 h-4 mr-1" /> Verificação em 2 passos (2FA)
              </p>
              <p className="text-xs text-slate-500 dark:text-slate-400 mb-3">
                Ative uma etapa extra no login. *A aplicação efetiva é no backend.*
              </p>
              <Toggle checked={pref.doisFatores} onChange={(v) => handlePref("doisFatores", v)} />
            </div>
          </div>

          <div className="mt-4 rounded-xl border p-4 border-slate-200 dark:border-slate-700">
            <p className="text-sm font-medium text-slate-900 dark:text-slate-100 mb-2">
              <Lock className="inline w-4 h-4 mr-1" /> Sessões ativas
            </p>
            <div className="space-y-2">
              {sessoes.map((s) => (
                <div
                  key={s.id}
                  className="flex items-center justify-between text-sm bg-slate-50 dark:bg-slate-800/60 rounded-lg p-3"
                >
                  <div className="text-slate-700 dark:text-slate-300">
                    <span className="font-medium">{s.dispositivo}</span> • {s.local}
                    <span className="ml-2 text-xs text-slate-500 dark:text-slate-400">
                      Último acesso: {s.ultimoAcesso}
                    </span>
                    {s.atual && (
                      <span className="ml-2 text-xs px-2 py-0.5 rounded-full bg-blue-600 text-white">
                        Atual
                      </span>
                    )}
                  </div>
                  {!s.atual && <button className="text-rose-500 hover:underline text-xs">Encerrar</button>}
                </div>
              ))}
            </div>
            <button onClick={encerrarTodasSessoes} className="mt-3 inline-flex items-center gap-2 text-sm text-rose-500">
              <LogOut className="w-4 h-4" /> Encerrar todas as sessões
            </button>
          </div>
        </Card>

        {/* Ações */}
        <div className="flex items-center gap-3">
          <button
            onClick={salvarTudo}
            disabled={saving}
            className="inline-flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-5 py-2 rounded-lg transition disabled:opacity-70"
          >
            <Save className="w-4 h-4" />
            {saving ? "Salvando…" : "Salvar alterações"}
          </button>
          <button onClick={() => window.location.reload()} className="text-sm text-slate-600 dark:text-slate-300 hover:underline">
            Restaurar padrão
          </button>
        </div>
      </div>

      {/* Modal Alterar Senha */}
      <AnimatePresence>
        {pwdOpen && (
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[90] grid place-items-center p-4"
          >
            <motion.div
              initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: 20, opacity: 0 }}
              className="w-full max-w-md rounded-2xl border border-slate-700 bg-slate-900 p-5"
            >
              <h3 className="text-lg font-semibold text-white mb-1">Alterar palavra-passe</h3>
              <p className="text-xs text-slate-400 mb-4 flex items-center gap-1">
                <AlertCircle className="w-4 h-4" /> A nova palavra-passe deve ter pelo menos 8 caracteres.
              </p>

              <div className="space-y-3">
                <div>
                  <Label>Palavra-passe atual</Label>
                  <div className="relative">
                    <Input
                      type={pwdShow.atual ? "text" : "password"}
                      value={pwd.atual}
                      onChange={(e) => setPwd({ ...pwd, atual: e.target.value })}
                      placeholder="••••••••"
                    />
                    <button
                      type="button"
                      onClick={() => setPwdShow((s) => ({ ...s, atual: !s.atual }))}
                      className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400"
                    >
                      {pwdShow.atual ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>
                <div>
                  <Label>Nova palavra-passe</Label>
                  <div className="relative">
                    <Input
                      type={pwdShow.nova ? "text" : "password"}
                      value={pwd.nova}
                      onChange={(e) => setPwd({ ...pwd, nova: e.target.value })}
                      placeholder="********"
                    />
                    <button
                      type="button"
                      onClick={() => setPwdShow((s) => ({ ...s, nova: !s.nova }))}
                      className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400"
                    >
                      {pwdShow.nova ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>
                <div>
                  <Label>Confirmar nova palavra-passe</Label>
                  <div className="relative">
                    <Input
                      type={pwdShow.confirmar ? "text" : "password"}
                      value={pwd.confirmar}
                      onChange={(e) => setPwd({ ...pwd, confirmar: e.target.value })}
                      placeholder="********"
                    />
                    <button
                      type="button"
                      onClick={() => setPwdShow((s) => ({ ...s, confirmar: !s.confirmar }))}
                      className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400"
                    >
                      {pwdShow.confirmar ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>
              </div>

              <div className="mt-5 flex items-center justify-end gap-2">
                <button onClick={() => setPwdOpen(false)} className="px-3 py-2 rounded-lg bg-white/10 text-slate-200">
                  Cancelar
                </button>
                <button onClick={alterarSenha} className="px-3 py-2 rounded-lg bg-blue-600 text-white hover:bg-blue-700">
                  Salvar nova senha
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

/** ========== Itens com toggle ========== */
function ToggleItem({
  label, checked, onChange,
}: { label: string; checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <div
      className="
        flex items-center justify-between rounded-xl px-4 py-3
        border bg-slate-50/80 border-slate-200
        dark:bg-slate-800/60 dark:border-slate-700
      "
    >
      <span className="text-sm text-slate-700 dark:text-slate-300">{label}</span>
      <Toggle checked={checked} onChange={onChange} />
    </div>
  );
}
