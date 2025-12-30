// src/components/professional/PortfolioTab.tsx
"use client";

import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  FolderPlus,
  Upload,
  Image as ImageIcon,
  Video,
  X,
  Search,
  SortAsc,
  SortDesc,
  Grid3X3,
  List,
  Eye,
  EyeOff,
  Pencil,
  Trash2,
  Star,
  ChevronRight,
  ChevronLeft,
  Settings2,
  Shield,
  Plus,
  Check,
  Loader2,
  AlertTriangle,
} from "lucide-react";
import { supabase } from "@/lib/supabase";

/* ======================
   Tipos & Props
====================== */
type Props = {
  /**
   * ownerId aqui deve ser public.profissionais.id (profissional_id),
   * e NÃO auth.users.id.
   * Para Admin/Empresa visualizar portfólio de um profissional, passe o profissional_id.
   */
  ownerId?: string | null;
  perfil?: {
    /**
     * IMPORTANTE:
     * Não confie que perfil.id seja profissional_id.
     * Neste componente, perfil.id NÃO é usado para resolver o owner do "meu perfil"
     * (para não confundir auth.uid com profissional_id).
     */
    id?: string | null;
    nome?: string | null;
    slug?: string | null;
    email?: string | null;
  } | null;
};

type Folder = {
  id: string;
  nome: string;
  descricao?: string | null;
  capa_url?: string | null;
  visibilidade: "publico" | "privado";
  tags?: string[] | null;
  created_at: string;
  total_media?: number | null;
};

type Media = {
  id: string;
  tipo: "image" | "video";
  url: string;
  thumb_url?: string | null;
  titulo?: string | null;
  descricao?: string | null;
  created_at: string;
  path?: string | null;
  visibilidade: "publico" | "privado";
};

/* ======================
   Componente principal
====================== */
export default function PortfolioTab({ perfil, ownerId: ownerIdProp }: Props) {
  /**
   * ownerId = public.profissionais.id
   * REGRA:
   * - Admin/Empresa: usa ownerIdProp (profissional_id) e resolve ownerAuthUid do DONO (profissionais.usuario_id) para storage path.
   * - Meu perfil: resolve via auth + rpc current_profissional_id() (NUNCA usa perfil.id).
   */
  const [ownerId, setOwnerId] = useState<string | null>(ownerIdProp ?? null);

  // auth uid apenas para storage path (não usar para profissional_id)
  const [ownerAuthUid, setOwnerAuthUid] = useState<string | null>(null);

  // PASSO 1 — ready lock
  const [ownerReady, setOwnerReady] = useState(false);

  const [folders, setFolders] = useState<Folder[]>([]);
  const [selectedFolder, setSelectedFolder] = useState<Folder | null>(null);
  const [medias, setMedias] = useState<Media[]>([]);
  const [search, setSearch] = useState("");
  const [view, setView] = useState<"grid" | "list">("grid");
  const [sort, setSort] = useState<{ by: "created_at" | "nome"; dir: "asc" | "desc" }>({
    by: "created_at",
    dir: "desc",
  });
  const [loadingFolders, setLoadingFolders] = useState(false);
  const [loadingMedia, setLoadingMedia] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Criar pasta
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newFolderName, setNewFolderName] = useState("");
  const [newFolderVisibility, setNewFolderVisibility] = useState<"publico" | "privado">("publico");
  const [savingFolder, setSavingFolder] = useState(false);

  // Renomear / Excluir pasta
  const [renameTarget, setRenameTarget] = useState<{ id: string; nome: string } | null>(null);
  const [renaming, setRenaming] = useState(false);

  const [deleteTarget, setDeleteTarget] = useState<{ folder: Folder; count?: number } | null>(null);
  const [deleting, setDeleting] = useState(false);

  // Upload
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [uploading, setUploading] = useState(false);
  const [uploadPct, setUploadPct] = useState(0);

  // Evitar race condition ao trocar ownerIdProp rapidamente
  const lastResolveKeyRef = useRef<string | null>(null);

  /**
   * PASSO 1 — travar resolução
   * Resolve IDs:
   * - Admin/Empresa: usa ownerIdProp (profissional_id) + busca profissionais.usuario_id (dono) para storage
   * - Meu perfil: pega auth uid + rpc current_profissional_id()
   */
  async function resolveOwnerContext() {
    if (ownerReady) return;

    const resolveKey = `${ownerIdProp ?? "self"}:${Date.now()}:${Math.random().toString(36).slice(2)}`;
    lastResolveKeyRef.current = resolveKey;

    setErrorMsg(null);

    // Admin / Empresa
    if (ownerIdProp) {
      const profId = String(ownerIdProp);

      const { data, error } = await supabase
        .from("profissionais")
        .select("usuario_id")
        .eq("id", profId)
        .maybeSingle();

      // se já mudou o ownerIdProp no meio, ignora
      if (lastResolveKeyRef.current !== resolveKey) return;

      if (error) {
        console.error("[PortfolioTab] Erro ao resolver dono (profissionais.usuario_id):", error);
        setErrorMsg("Não foi possível identificar o dono do portfólio.");
        return;
      }

      if (!data?.usuario_id) {
        setErrorMsg("Portfólio sem dono (profissionais.usuario_id ausente).");
        return;
      }

      setOwnerId(profId);
      setOwnerAuthUid(String(data.usuario_id));
      setOwnerReady(true);
      return;
    }

    // Meu perfil
    const { data: sessionData } = await supabase.auth.getSession();
    const authUid = sessionData?.session?.user?.id ?? null;

    // se já mudou o ownerIdProp no meio, ignora
    if (lastResolveKeyRef.current !== resolveKey) return;

    if (!authUid) return;

    setOwnerAuthUid(authUid);

    const { data: profId, error } = await supabase.rpc("current_profissional_id");

    // se já mudou o ownerIdProp no meio, ignora
    if (lastResolveKeyRef.current !== resolveKey) return;

    if (error || !profId) {
      setErrorMsg("Profissional não identificado.");
      return;
    }

    setOwnerId(String(profId));
    setOwnerReady(true);
  }

  /**
   * PASSO 2 — reagir à troca de ownerIdProp
   * (reset + re-resolve)
   */
  useEffect(() => {
    // reset de contexto (evita mostrar dados do owner anterior)
    setOwnerReady(false);
    setOwnerId(ownerIdProp ?? null);
    setOwnerAuthUid(null);
    setFolders([]);
    setSelectedFolder(null);
    setMedias([]);
    setErrorMsg(null);

    resolveOwnerContext();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ownerIdProp]);

  /* ====== PASSO 3 — carregar pastas só quando estiver pronto ====== */
  useEffect(() => {
    if (!ownerReady || !ownerId) return;

    let cancelled = false;

    async function load() {
      setLoadingFolders(true);

      const { data, error } = await supabase
        .from("portfolio_pastas")
        .select("id, nome, descricao, capa_url, visibilidade, tags, created_at")
        .eq("profissional_id", ownerId)
        .order("created_at", { ascending: false });

      if (cancelled) return;

      if (error) {
        console.error("[PortfolioTab] Erro ao carregar pastas:", error);
        setErrorMsg(error.message || "Não foi possível carregar as pastas. Verifique permissões/RLS.");
        setFolders([]);
        setLoadingFolders(false);
        return;
      }

      setFolders((data as Folder[]) || []);
      setLoadingFolders(false);
    }

    load();

    return () => {
      cancelled = true;
    };
  }, [ownerReady, ownerId]);

  /* ====== carregar media da pasta ====== */
  useEffect(() => {
    let cancelled = false;

    async function loadMedia(folder: Folder) {
      setLoadingMedia(true);
      setErrorMsg(null);

      const { data, error } = await supabase
        .from("portfolio_media")
        .select("id, tipo, url, thumb_url, titulo, descricao, created_at, path, visibilidade")
        .eq("folder_id", folder.id)
        .order("created_at", { ascending: false });

      if (cancelled) return;

      if (error) {
        console.error("[PortfolioTab] Erro ao carregar arquivos:", error);
        setErrorMsg(error.message || "Não foi possível carregar os arquivos. Verifique permissões/RLS.");
        setMedias([]);
        setLoadingMedia(false);
        return;
      }

      const list = (data as Media[]) || [];
      setMedias(list);
      setLoadingMedia(false);

      // Capa automática
      if (!ownerIdProp && !folder.capa_url) {
        const firstImage = list.find((m) => m.tipo === "image");
        if (firstImage) {
          await handleSetCoverInternal(folder, firstImage.url, { silent: true });
        }
      }
    }

    if (!selectedFolder) {
      setMedias([]);
      return;
    }

    loadMedia(selectedFolder);

    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedFolder?.id]);

  /* ====== filtros ====== */
  const filteredFolders = useMemo(() => {
    const term = search.trim().toLowerCase();
    let items = folders;

    if (term) {
      items = items.filter((f) =>
        [f.nome, f.descricao, (f.tags || []).join(" ")].join(" ").toLowerCase().includes(term)
      );
    }

    items = [...items].sort((a, b) => {
      const dir = sort.dir === "asc" ? 1 : -1;
      if (sort.by === "nome") return a.nome.localeCompare(b.nome) * dir;
      return (new Date(a.created_at).getTime() - new Date(b.created_at).getTime()) * dir;
    });

    return items;
  }, [folders, search, sort]);

  const filteredMedia = useMemo(() => {
    const term = search.trim().toLowerCase();
    let items = medias;

    if (term) {
      items = items.filter((m) => [m.titulo ?? "", m.descricao ?? ""].join(" ").toLowerCase().includes(term));
    }

    // capa primeiro
    if (selectedFolder?.capa_url) {
      items = [...items].sort((a, b) => {
        const aIsCover = a.url === selectedFolder.capa_url ? -1 : 0;
        const bIsCover = b.url === selectedFolder.capa_url ? -1 : 0;
        if (aIsCover !== bIsCover) return aIsCover - bIsCover;
        return 0;
      });
    }

    return items;
  }, [medias, search, selectedFolder?.capa_url]);

  /* ====== criar pasta ====== */
  async function handleConfirmCreateFolder() {
    if (!newFolderName.trim()) return;

    // profissional_id para a pasta: sempre public.profissionais.id
    let profissionalId = ownerIdProp ? String(ownerIdProp) : ownerId;

    // se ainda não resolveu (caso "meu perfil"), resolve e tenta novamente
    if (!ownerReady || !profissionalId) {
      await resolveOwnerContext();
      profissionalId = ownerIdProp ? String(ownerIdProp) : ownerId;

      // fallback final (meu perfil)
      if (!profissionalId && !ownerIdProp) {
        const { data: profId } = await supabase.rpc("current_profissional_id");
        profissionalId = profId ? String(profId) : null;
      }
    }

    if (!profissionalId) {
      setErrorMsg("Profissional não encontrado para este utilizador.");
      return;
    }

    setSavingFolder(true);
    setErrorMsg(null);

    const novaPasta = {
      profissional_id: profissionalId,
      nome: newFolderName.trim(),
      descricao: "",
      visibilidade: newFolderVisibility,
    };

    const { data, error } = await supabase
      .from("portfolio_pastas")
      .insert(novaPasta)
      .select("id, nome, descricao, capa_url, visibilidade, tags, created_at")
      .single();

    if (error) {
      console.error("[PortfolioTab] Erro ao criar pasta:", error);
      setErrorMsg(error.message || "Erro ao criar pasta. Verifique permissões/RLS.");
      setSavingFolder(false);
      return;
    }

    setFolders((prev) => [data as Folder, ...prev]);
    setSavingFolder(false);
    setShowCreateModal(false);
    setNewFolderName("");
    setNewFolderVisibility("publico");
  }

  /* ====== renomear pasta ====== */
  async function renameFolder(id: string, nome: string) {
    if (!nome.trim()) return;
    try {
      setRenaming(true);
      const { error } = await supabase.from("portfolio_pastas").update({ nome: nome.trim() }).eq("id", id);

      if (error) throw error;

      setFolders((prev) => prev.map((f) => (f.id === id ? { ...f, nome: nome.trim() } : f)));
      if (selectedFolder?.id === id) setSelectedFolder({ ...selectedFolder, nome: nome.trim() });
      setRenameTarget(null);
    } catch (e) {
      console.error(e);
      setErrorMsg("Não foi possível renomear a pasta.");
    } finally {
      setRenaming(false);
    }
  }

  /* ====== alternar visibilidade ====== */
  async function toggleVisibility(folder: Folder) {
    const next = folder.visibilidade === "publico" ? "privado" : "publico";
    try {
      // otimista
      setFolders((prev) => prev.map((f) => (f.id === folder.id ? { ...f, visibilidade: next } : f)));
      if (selectedFolder?.id === folder.id) setSelectedFolder({ ...folder, visibilidade: next });

      const { error } = await supabase.from("portfolio_pastas").update({ visibilidade: next }).eq("id", folder.id);
      if (error) throw error;
    } catch (e) {
      console.error(e);
      // rollback
      setFolders((prev) => prev.map((f) => (f.id === folder.id ? { ...f, visibilidade: folder.visibilidade } : f)));
      if (selectedFolder?.id === folder.id) setSelectedFolder({ ...folder });
      setErrorMsg("Falha ao alternar visibilidade.");
    }
  }

  /* ====== excluir pasta ====== */
  async function openDeleteModal(folder: Folder) {
    try {
      const { count } = await supabase.from("portfolio_media").select("id", { count: "exact", head: true }).eq("folder_id", folder.id);
      setDeleteTarget({ folder, count: count ?? 0 });
    } catch {
      setDeleteTarget({ folder });
    }
  }

  async function deleteFolderConfirmed() {
    if (!deleteTarget) return;
    const folder = deleteTarget.folder;

    setDeleting(true);
    setErrorMsg(null);

    try {
      const { data: mediaRows, error: mediaErr } = await supabase.from("portfolio_media").select("id, path").eq("folder_id", folder.id);
      if (mediaErr) throw mediaErr;

      const paths = (mediaRows || []).map((m) => m.path).filter((p): p is string => !!p);

      if (paths.length) {
        const { error: rmErr } = await supabase.storage.from("portfolio").remove(paths);
        if (rmErr) console.warn("[PortfolioTab] Falha ao remover do storage (ignorada):", rmErr.message);
      }

      if ((mediaRows || []).length) {
        const { error: delMediaErr } = await supabase.from("portfolio_media").delete().eq("folder_id", folder.id);
        if (delMediaErr) throw delMediaErr;
      }

      const { error: delFolderErr } = await supabase.from("portfolio_pastas").delete().eq("id", folder.id);
      if (delFolderErr) throw delFolderErr;

      setFolders((prev) => prev.filter((f) => f.id !== folder.id));
      if (selectedFolder?.id === folder.id) setSelectedFolder(null);
      setDeleteTarget(null);
    } catch (e) {
      console.error(e);
      setErrorMsg("Não foi possível excluir a pasta.");
    } finally {
      setDeleting(false);
    }
  }

  /* ====== upload ====== */
  function openFilePicker(targetFolder?: Folder | null) {
    if (targetFolder) setSelectedFolder(targetFolder);
    fileInputRef.current?.click();
  }

  async function uploadFiles(files: FileList, targetFolder: Folder) {
    if (!files || !targetFolder) return;

    setUploading(true);
    setUploadPct(0);
    setErrorMsg(null);

    try {
      const bucket = "portfolio";
      let done = 0;
      const total = files.length;

      // auth uid para path do storage
      let authUid = ownerAuthUid;

      // Requisito: Admin/Empresa deve usar UID DO DONO (profissionais.usuario_id),
      // e NÃO pode cair no uid do admin.
      if (ownerIdProp && !authUid) {
        throw new Error("UID do profissional não identificado para o storage (profissionais.usuario_id).");
      }

      // Meu perfil: pode resolver via sessão
      if (!ownerIdProp && !authUid) {
        const { data: sessionData } = await supabase.auth.getSession();
        authUid = sessionData?.session?.user?.id ?? null;
        if (!authUid) throw new Error("Sessão inválida (sem auth uid).");
        setOwnerAuthUid(authUid);
      }

      if (!authUid) {
        throw new Error("UID inválido para o storage.");
      }

      const uploads = Array.from(files).map(async (file) => {
        const ext = file.name.split(".").pop() || "";
        const path = `${authUid}/${targetFolder.id}/${Date.now()}_${Math.random().toString(36).slice(2)}.${ext}`;

        const { error: upErr } = await supabase.storage.from(bucket).upload(path, file, {
          upsert: false,
          cacheControl: "3600",
        });
        if (upErr) throw upErr;

        const { data: pub } = supabase.storage.from(bucket).getPublicUrl(path);
        const publicUrl = pub?.publicUrl || "";

        const tipo: "image" | "video" = file.type.startsWith("video") ? "video" : "image";

        const { error: insErr } = await supabase.from("portfolio_media").insert({
          folder_id: targetFolder.id,
          url: publicUrl,
          path,
          tipo,
          titulo: file.name,
          visibilidade: "publico",
        });
        if (insErr) throw insErr;

        // capa automática
        if (!targetFolder.capa_url && tipo === "image") {
          await handleSetCoverInternal(targetFolder, publicUrl, { silent: true });
        }

        done += 1;
        setUploadPct(Math.round((done / total) * 100));
      });

      await Promise.all(uploads);

      if (selectedFolder && selectedFolder.id === targetFolder.id) {
        const { data } = await supabase
          .from("portfolio_media")
          .select("id, tipo, url, thumb_url, titulo, descricao, created_at, path, visibilidade")
          .eq("folder_id", selectedFolder.id)
          .order("created_at", { ascending: false });

        setMedias((data as Media[]) || []);
      }
    } catch (e: any) {
      console.error("[PortfolioTab] Erro no upload:", e);
      setErrorMsg(e?.message || "Falha ao enviar um ou mais arquivos.");
    } finally {
      setUploading(false);
      setUploadPct(0);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  }

  function onFilesChosen(e: React.ChangeEvent<HTMLInputElement>) {
    const files = e.target.files;
    if (!files || files.length === 0) return;
    if (!selectedFolder) return;
    uploadFiles(files, selectedFolder);
  }

  /* ====== definir capa ====== */
  async function handleSetCover(url: string) {
    if (!selectedFolder) return;
    await handleSetCoverInternal(selectedFolder, url);
  }

  async function handleSetCoverInternal(folder: Folder, url: string, opts?: { silent?: boolean }) {
    const { error } = await supabase.from("portfolio_pastas").update({ capa_url: url }).eq("id", folder.id);
    if (error) {
      console.error(error);
      if (!opts?.silent) setErrorMsg("Não foi possível definir a capa.");
      return;
    }
    if (selectedFolder?.id === folder.id) setSelectedFolder({ ...folder, capa_url: url });
    setFolders((prev) => prev.map((f) => (f.id === folder.id ? { ...f, capa_url: url } : f)));
  }

  /* ====== apagar mídia ====== */
  async function handleDeleteMedia(media: Media) {
    if (!selectedFolder) return;
    const sure = window.confirm("Apagar este arquivo do portfólio?");
    if (!sure) return;
    try {
      if (media.path) await supabase.storage.from("portfolio").remove([media.path]);
      await supabase.from("portfolio_media").delete().eq("id", media.id);

      setMedias((prev) => prev.filter((m) => m.id !== media.id));

      if (selectedFolder.capa_url === media.url) {
        const nextImage = medias.find((m) => m.id !== media.id && m.tipo === "image");
        const nextUrl = nextImage?.url ?? null;
        await supabase.from("portfolio_pastas").update({ capa_url: nextUrl }).eq("id", selectedFolder.id);
        setSelectedFolder({ ...selectedFolder, capa_url: nextUrl ?? undefined });
        setFolders((prev) => prev.map((f) => (f.id === selectedFolder.id ? { ...f, capa_url: nextUrl ?? undefined } : f)));
      }
    } catch (e) {
      console.error(e);
      setErrorMsg("Não foi possível apagar o arquivo.");
    }
  }

  return (
    <div className="w-full space-y-4">
      {/* Top bar */}
      <div className="flex flex-col md:flex-row md:items-center gap-3 justify-between">
        <div className="flex flex-1 items-center gap-2">
          <div className="relative flex-1 max-w-xl">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 opacity-60" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder={selectedFolder ? "Buscar nos arquivos..." : "Buscar em pastas..."}
              className="w-full pl-9 pr-3 py-2 rounded-xl
                         bg-white/60 text-slate-800 placeholder:text-slate-500 ring-1 ring-black/10
                         focus:ring-2 focus:ring-primary/40
                         dark:bg-white/[0.06] dark:text-white dark:placeholder:text-white/55 dark:ring-white/15"
            />
          </div>

          <button
            onClick={() => setSort((s) => ({ ...s, dir: s.dir === "asc" ? "desc" : "asc" }))}
            className="px-3 py-2 rounded-xl bg-black/5 ring-1 ring-black/10 hover:bg-black/10
                       dark:bg-white/5 dark:ring-white/10 dark:hover:bg-white/10 flex items-center gap-2"
            title="Ordenar"
          >
            {sort.dir === "asc" ? <SortAsc className="w-4 h-4" /> : <SortDesc className="w-4 h-4" />}
            <span className="text-xs opacity-70 hidden sm:block">{sort.by === "nome" ? "Nome" : "Data"}</span>
          </button>

          <button
            onClick={() => setSort((s) => ({ ...s, by: s.by === "nome" ? "created_at" : "nome" }))}
            className="px-3 py-2 rounded-xl bg-black/5 ring-1 ring-black/10 hover:bg-black/10
                       dark:bg-white/5 dark:ring-white/10 dark:hover:bg-white/10 hidden md:flex items-center gap-2"
            title="Trocar critério"
          >
            <Settings2 className="w-4 h-4" />
          </button>
        </div>

        <div className="flex items-center justify-between md:justify-end gap-2">
          <button
            onClick={() => setView(view === "grid" ? "list" : "grid")}
            className="px-3 py-2 rounded-xl bg-black/5 ring-1 ring-black/10 hover:bg-black/10
                       dark:bg-white/5 dark:ring-white/10 dark:hover:bg-white/10"
            title="Alternar visualização"
          >
            {view === "grid" ? <List className="w-4 h-4" /> : <Grid3X3 className="w-4 h-4" />}
          </button>

          <button
            onClick={() => (selectedFolder ? openFilePicker(selectedFolder) : setShowCreateModal(true))}
            disabled={uploading}
            className="px-3 py-2 rounded-xl bg-primary text-primary-foreground flex items-center gap-2 disabled:opacity-60"
          >
            {selectedFolder ? <Upload className="w-4 h-4" /> : <FolderPlus className="w-4 h-4" />}
            <span className="text-xs">
              {selectedFolder ? (uploading ? `Enviando ${uploadPct}%...` : "Escolher arquivos") : "Nova pasta"}
            </span>
          </button>

          <input
            ref={fileInputRef}
            type="file"
            multiple
            accept="image/*,video/*"
            className="hidden"
            onChange={onFilesChosen}
          />
        </div>
      </div>

      {errorMsg && <p className="text-xs text-red-600 bg-red-500/10 rounded-lg px-3 py-2 dark:text-red-400">{errorMsg}</p>}

      {!ownerReady && <p className="text-xs opacity-70 px-1">Identificando profissional...</p>}

      {loadingFolders && !selectedFolder && <p className="text-xs opacity-70 px-1">Carregando pastas...</p>}
      {loadingMedia && selectedFolder && <p className="text-xs opacity-70 px-1">Carregando arquivos...</p>}

      {/* Breadcrumb */}
      <div className="flex items-center gap-2 text-sm opacity-80">
        <button
          onClick={() => setSelectedFolder(null)}
          className={`inline-flex items-center gap-1 hover:opacity-100 ${!selectedFolder ? "font-semibold" : ""}`}
        >
          {!selectedFolder && <ChevronLeft className="w-4 h-4 opacity-0" />}
          {selectedFolder && <ChevronLeft className="w-4 h-4" />}
          Pastas
        </button>
        {selectedFolder && (
          <>
            <ChevronRight className="w-4 h-4 opacity-50" />
            <span className="truncate">{selectedFolder.nome}</span>
          </>
        )}
      </div>

      {/* Conteúdo */}
      {!selectedFolder ? (
        <FolderGrid
          items={filteredFolders}
          view={view}
          onOpen={(f) => setSelectedFolder(f)}
          onQuickUpload={(f) => openFilePicker(f)}
          onDropUpload={(files, f) => uploadFiles(files, f)}
          onRename={(f) => setRenameTarget({ id: f.id, nome: f.nome })}
          onToggleVisibility={toggleVisibility}
          onAskDelete={openDeleteModal}
        />
      ) : (
        <MediaGrid
          items={filteredMedia}
          view={view}
          onDropUpload={(files) => selectedFolder && uploadFiles(files, selectedFolder)}
          onPickFiles={() => openFilePicker(selectedFolder)}
          uploading={uploading}
          uploadPct={uploadPct}
          onSetCover={handleSetCover}
          coverUrl={selectedFolder.capa_url || null}
          onDelete={handleDeleteMedia}
        />
      )}

      {/* Modal Nova Pasta */}
      <AnimatePresence>
        {showCreateModal && (
          <ModalShell onClose={() => !savingFolder && setShowCreateModal(false)}>
            <div className="flex items-center justify-between gap-2">
              <div>
                <h3 className="font-semibold text-base">Nova pasta de portfólio</h3>
                <p className="text-xs opacity-70">Crie uma pasta por obra para organizar fotos e vídeos.</p>
              </div>
              <button
                disabled={savingFolder}
                onClick={() => setShowCreateModal(false)}
                className="p-2 rounded-full hover:bg-black/5 dark:hover:bg-white/10"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-3">
              <div className="space-y-1">
                <label className="text-xs opacity-80">Nome da pasta</label>
                <input
                  value={newFolderName}
                  onChange={(e) => setNewFolderName(e.target.value)}
                  placeholder="Ex.: Apartamento T2 — pintura e gesso"
                  className="w-full rounded-xl px-3 py-2 text-sm outline-none
                             bg-white ring-1 ring-black/10 focus:ring-2 focus:ring-primary/40
                             dark:bg-white/[0.06] dark:text-white dark:ring-white/15 dark:placeholder:text-white/55"
                />
              </div>

              <div className="space-y-2">
                <label className="text-xs opacity-80">Visibilidade</label>
                <div className="grid grid-cols-2 gap-2">
                  <SegmentedButton
                    active={newFolderVisibility === "publico"}
                    onClick={() => setNewFolderVisibility("publico")}
                    icon={<Eye className="w-4 h-4" />}
                    label="Público"
                  />
                  <SegmentedButton
                    active={newFolderVisibility === "privado"}
                    onClick={() => setNewFolderVisibility("privado")}
                    icon={<Shield className="w-4 h-4" />}
                    label="Privado"
                  />
                </div>
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <button
                disabled={savingFolder}
                onClick={() => setShowCreateModal(false)}
                className="px-3 py-2 text-xs rounded-xl bg-black/5 ring-1 ring-black/10 hover:bg-black/10
                           dark:bg-white/5 dark:ring-white/10 dark:hover:bg-white/10"
              >
                Cancelar
              </button>
              <button
                disabled={savingFolder || !newFolderName.trim()}
                onClick={handleConfirmCreateFolder}
                className="px-4 py-2 text-xs rounded-xl bg-primary text-primary-foreground disabled:opacity-60"
              >
                {savingFolder ? "Salvando..." : "Criar pasta"}
              </button>
            </div>
          </ModalShell>
        )}
      </AnimatePresence>

      {/* Modal Renomear */}
      <RenameModal
        open={!!renameTarget}
        currentName={renameTarget?.nome || ""}
        onClose={() => !renaming && setRenameTarget(null)}
        onConfirm={(newName) => renameTarget && renameFolder(renameTarget.id, newName)}
        loading={renaming}
      />

      {/* Modal Excluir Pasta */}
      <DeleteModal
        open={!!deleteTarget}
        folderName={deleteTarget?.folder.nome || ""}
        filesCount={deleteTarget?.count}
        onClose={() => !deleting && setDeleteTarget(null)}
        onConfirm={deleteFolderConfirmed}
        loading={deleting}
      />
    </div>
  );
}

/* =========================
   UI helpers
========================= */
function SegmentedButton({
  active,
  onClick,
  icon,
  label,
}: {
  active: boolean;
  onClick: () => void;
  icon: ReactNode;
  label: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={`relative px-3 py-2 rounded-xl text-xs flex items-center justify-center gap-2 ring-1 transition
        ${
          active
            ? "ring-primary/60 bg-primary/15 text-primary"
            : "ring-black/10 bg-black/5 hover:bg-black/10 text-slate-700 dark:ring-white/10 dark:bg-white/5 dark:hover:bg-white/10 dark:text-white/90"
        }`}
    >
      {icon}
      {label}
      {active && (
        <Check className="w-3 h-3 absolute -top-1 -right-1 rounded-full bg-primary text-primary-foreground p-[2px]" />
      )}
    </button>
  );
}

/* Modal Shell reutilizável */
function ModalShell({ children, onClose }: { children: ReactNode; onClose: () => void }) {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4"
      onMouseDown={onClose}
    >
      <motion.div
        initial={{ scale: 0.96, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.96, opacity: 0 }}
        onMouseDown={(e) => e.stopPropagation()}
        className="w-full max-w-md rounded-2xl
                   bg-white text-slate-900 border border-black/10 p-5 space-y-4 shadow-2xl
                   dark:bg-[rgb(18,22,28)] dark:text-white dark:border-white/10"
      >
        {children}
      </motion.div>
    </motion.div>
  );
}

/* =========================
   Folder Grid
========================= */
function FolderGrid({
  items,
  view,
  onOpen,
  onQuickUpload,
  onDropUpload,
  onRename,
  onToggleVisibility,
  onAskDelete,
}: {
  items: Folder[];
  view: "grid" | "list";
  onOpen: (f: Folder) => void;
  onQuickUpload: (f: Folder) => void;
  onDropUpload: (files: FileList, folder: Folder) => void;
  onRename: (f: Folder) => void;
  onToggleVisibility: (f: Folder) => void;
  onAskDelete: (f: Folder) => void;
}) {
  if (!items.length) {
    return (
      <EmptyState
        icon={<FolderPlus className="w-6 h-6" />}
        title="Sem pastas de portfólio."
        subtitle="Crie pastas por obra e arraste fotos/vídeos para cá."
      />
    );
  }

  const formatDate = (iso: string) => new Date(iso).toLocaleDateString("pt-PT");

  if (view === "list") {
    return (
      <div className="w-full rounded-xl overflow-hidden bg-white ring-1 ring-black/10 dark:bg-white/[0.03] dark:ring-white/10">
        <div className="grid grid-cols-12 px-3 py-2 text-xs uppercase opacity-60">
          <div className="col-span-6">Pasta</div>
          <div className="col-span-3">Informações</div>
          <div className="col-span-3 text-right pr-1">Ações</div>
        </div>
        <div className="divide-y divide-black/10 dark:divide-white/10">
          {items.map((f) => (
            <div
              key={f.id}
              className="grid grid-cols-12 items-center px-3 py-3 hover:bg-black/[0.04] dark:hover:bg-white/[0.06]"
              onDragOver={(e) => {
                e.preventDefault();
                e.dataTransfer.dropEffect = "copy";
              }}
              onDrop={(e) => {
                e.preventDefault();
                const files = e.dataTransfer.files;
                if (files && files.length) onDropUpload(files, f);
              }}
            >
              <div className="col-span-6 flex items-center gap-3">
                <button
                  onClick={() => onOpen(f)}
                  className="w-14 h-14 rounded-lg overflow-hidden ring-1 ring-black/10 dark:ring-white/10 flex items-center justify-center shrink-0 bg-black/5 dark:bg-white/5"
                  title="Abrir pasta"
                >
                  {f.capa_url ? (
                    <img src={f.capa_url} className="w-full h-full object-cover" />
                  ) : (
                    <FolderPlus className="w-5 h-5 opacity-70" />
                  )}
                </button>
                <div className="min-w-0">
                  <button onClick={() => onOpen(f)} className="font-medium text-sm truncate text-left">
                    {f.nome}
                  </button>
                  <div className="text-xs opacity-60 line-clamp-1">{f.descricao || "Sem descrição"}</div>
                </div>
              </div>

              <div className="col-span-3 text-xs opacity-70 space-y-1">
                <div>{formatDate(f.created_at)}</div>
                <div className="flex items-center gap-1">
                  {f.visibilidade === "publico" ? (
                    <>
                      <Eye className="w-3 h-3" />
                      <span className="text-green-600 dark:text-green-400">Público</span>
                    </>
                  ) : (
                    <>
                      <EyeOff className="w-3 h-3" />
                      <span className="text-yellow-700 dark:text-yellow-300">Privado</span>
                    </>
                  )}
                </div>
              </div>

              <div className="col-span-3 flex items-center justify-end gap-2">
                <button
                  className="p-2 rounded-lg hover:bg-black/5 dark:hover:bg-white/10"
                  title="Upload rápido"
                  onClick={() => onQuickUpload(f)}
                >
                  <Upload className="w-4 h-4" />
                </button>
                <button
                  className="p-2 rounded-lg hover:bg-black/5 dark:hover:bg-white/10"
                  title="Renomear"
                  onClick={() => onRename(f)}
                >
                  <Pencil className="w-4 h-4" />
                </button>
                <button
                  className="p-2 rounded-lg hover:bg-black/5 dark:hover:bg-white/10"
                  title="Alternar visibilidade"
                  onClick={() => onToggleVisibility(f)}
                >
                  {f.visibilidade === "publico" ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
                </button>
                <button
                  className="p-2 rounded-lg hover:bg-red-500/10 text-red-600 dark:text-red-400"
                  title="Apagar"
                  onClick={() => onAskDelete(f)}
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  // Grid com drop por pasta
  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3">
      {items.map((f) => (
        <motion.div
          key={f.id}
          layout
          className="group relative rounded-xl overflow-hidden ring-1 ring-black/10 bg-white hover:shadow-md dark:ring-white/10 dark:bg-white/[0.03]"
          onDragOver={(e) => {
            e.preventDefault();
            e.dataTransfer.dropEffect = "copy";
          }}
          onDrop={(e) => {
            e.preventDefault();
            const files = e.dataTransfer.files;
            if (files && files.length) onDropUpload(files, f);
          }}
        >
          <div className="relative">
            <button onClick={() => onOpen(f)} className="w-full h-40 block bg-black/5 dark:bg-white/5" title="Abrir pasta">
              {f.capa_url ? (
                <img src={f.capa_url} className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full flex items-center justify-center">
                  <FolderPlus className="w-6 h-6 opacity-60" />
                </div>
              )}
            </button>

            <button
              onClick={() => onQuickUpload(f)}
              className="absolute bottom-2 left-2 px-2 py-1 rounded-md bg-white/85 text-slate-900 backdrop-blur text-xs ring-1 ring-black/10 hover:bg-white
                         dark:bg-black/70 dark:text-white dark:ring-white/20 dark:hover:bg-black/80"
              title="Enviar arquivos"
            >
              <Plus className="inline w-3 h-3 mr-1" />
              Enviar
            </button>
          </div>

          <div className="p-3 space-y-2">
            <div className="flex items-start justify-between gap-2">
              <button onClick={() => onOpen(f)} className="font-medium text-sm truncate text-left">
                {f.nome}
              </button>
              <span
                className={`text-[11px] whitespace-nowrap flex items-center gap-1 ${
                  f.visibilidade === "publico" ? "text-green-700 dark:text-green-400" : "text-yellow-700 dark:text-yellow-300"
                }`}
              >
                {f.visibilidade === "publico" ? <Eye className="w-3 h-3" /> : <EyeOff className="w-3 h-3" />}
                {f.visibilidade === "publico" ? "Público" : "Privado"}
              </span>
            </div>

            {f.descricao && <div className="text-xs opacity-70 line-clamp-2">{f.descricao}</div>}

            <div className="flex items-center justify-end gap-1 pt-1 border-t border-black/10 dark:border-white/10 mt-1">
              <button className="p-2 rounded-lg hover:bg-black/5 dark:hover:bg-white/10" title="Renomear" onClick={() => onRename(f)}>
                <Pencil className="w-4 h-4" />
              </button>
              <button
                className="p-2 rounded-lg hover:bg-black/5 dark:hover:bg-white/10"
                title="Alternar visibilidade"
                onClick={() => onToggleVisibility(f)}
              >
                {f.visibilidade === "publico" ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
              </button>
              <button className="p-2 rounded-lg hover:bg-red-500/10 text-red-600 dark:text-red-400" title="Apagar" onClick={() => onAskDelete(f)}>
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          </div>
        </motion.div>
      ))}
    </div>
  );
}

/* =========================
   Media Grid / Dropzone / Lightbox / Modais / EmptyState
========================= */

function MediaGrid({
  items,
  view,
  onDropUpload,
  onPickFiles,
  uploading,
  uploadPct,
  onSetCover,
  coverUrl,
  onDelete,
}: {
  items: Media[];
  view: "grid" | "list";
  onDropUpload: (files: FileList) => void;
  onPickFiles: () => void;
  uploading: boolean;
  uploadPct: number;
  onSetCover: (url: string) => void;
  coverUrl: string | null;
  onDelete: (m: Media) => void;
}) {
  const [viewer, setViewer] = useState<{ index: number } | null>(null);

  if (!items.length) {
    return <DropzoneEmpty onDropUpload={onDropUpload} onPickFiles={onPickFiles} uploading={uploading} uploadPct={uploadPct} />;
  }

  if (view === "list") {
    return (
      <>
        <div
          className="w-full rounded-xl overflow-hidden bg-white ring-1 ring-black/10 dark:bg-white/[0.03] dark:ring-white/10"
          onDragOver={(e) => {
            e.preventDefault();
            e.dataTransfer.dropEffect = "copy";
          }}
          onDrop={(e) => {
            e.preventDefault();
            const files = e.dataTransfer.files;
            if (files && files.length) onDropUpload(files);
          }}
        >
          <div className="grid grid-cols-12 px-3 py-2 text-xs uppercase opacity-60">
            <div className="col-span-6">Arquivo</div>
            <div className="col-span-2">Tipo</div>
            <div className="col-span-2">Criado</div>
            <div className="col-span-2 text-right pr-1">Ações</div>
          </div>
          <div className="divide-y divide-black/10 dark:divide-white/10">
            {items.map((m, idx) => (
              <div key={m.id} className="grid grid-cols-12 items-center px-3 py-3 hover:bg-black/[0.04] dark:hover:bg-white/[0.06]">
                <button onClick={() => setViewer({ index: idx })} className="col-span-6 flex items-center gap-3 text-left">
                  <div
                    className={`w-14 h-10 rounded-lg overflow-hidden flex items-center justify-center bg-black/5 dark:bg-white/5 ${
                      m.url === coverUrl ? "ring-2 ring-primary" : "ring-1 ring-black/10 dark:ring-white/10"
                    }`}
                  >
                    {m.tipo === "image" ? <img src={m.url} className="w-full h-full object-cover" /> : <Video className="w-4 h-4 opacity-70" />}
                  </div>
                  <div className="min-w-0">
                    <div className="font-medium truncate flex items-center gap-2">
                      {m.titulo || m.id}
                      {m.url === coverUrl && (
                        <span className="text-[10px] px-2 py-[2px] rounded bg-primary/15 text-primary ring-1 ring-primary/40">Capa</span>
                      )}
                    </div>
                    <div className="text-xs opacity-60 line-clamp-1">{m.descricao || " "}</div>
                  </div>
                </button>
                <div className="col-span-2 text-sm capitalize">{m.tipo === "image" ? "Foto" : "Vídeo"}</div>
                <div className="col-span-2 text-sm">{new Date(m.created_at).toLocaleDateString("pt-PT")}</div>
                <div className="col-span-2 flex items-center justify-end gap-2">
                  {m.tipo === "image" && (
                    <button className="p-2 rounded-lg hover:bg-black/5 dark:hover:bg-white/10" title="Definir como capa" onClick={() => onSetCover(m.url)}>
                      <Star className="w-4 h-4" />
                    </button>
                  )}
                  <button className="p-2 rounded-lg hover:bg-red-500/10 text-red-600 dark:text-red-400" title="Apagar" onClick={() => onDelete(m)}>
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>

        <AnimatePresence>{viewer && <Lightbox items={items} startIndex={viewer.index} onClose={() => setViewer(null)} />}</AnimatePresence>
      </>
    );
  }

  return (
    <>
      <div
        className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3"
        onDragOver={(e) => {
          e.preventDefault();
          e.dataTransfer.dropEffect = "copy";
        }}
        onDrop={(e) => {
          e.preventDefault();
          const files = e.dataTransfer.files;
          if (files && files.length) onDropUpload(files);
        }}
      >
        {items.map((m, idx) => {
          const isCover = m.url === coverUrl;
          return (
            <motion.div
              key={m.id}
              layout
              className={[
                "group relative rounded-xl overflow-hidden bg-white dark:bg-white/[0.03]",
                isCover ? "ring-2 ring-primary shadow-[0_0_0_3px_rgba(59,130,246,0.25)]" : "ring-1 ring-black/10 dark:ring-white/10",
              ].join(" ")}
            >
              <button onClick={() => setViewer({ index: idx })} className="block w-full h-44 bg-black/5 dark:bg-white/5" title="Abrir">
                {m.tipo === "image" ? <img src={m.url} className="w-full h-full object-cover" /> : <video src={m.url} className="w-full h-full object-cover" />}
              </button>

              <div className="absolute top-2 left-2 z-10 flex items-center gap-2 pointer-events-none">
                <span className="px-2 py-1 rounded-md text-[10px] bg-white/90 text-slate-900 ring-1 ring-black/10 backdrop-blur dark:bg-black/70 dark:text-white dark:ring-white/20">
                  {m.tipo === "image" ? (
                    <>
                      <ImageIcon className="w-3 h-3 inline mr-1" /> Foto
                    </>
                  ) : (
                    <>
                      <Video className="w-3 h-3 inline mr-1" /> Vídeo
                    </>
                  )}
                </span>
                {isCover && (
                  <span className="px-2.5 py-1 rounded-md text-[10px] font-semibold bg-primary text-primary-foreground shadow-md ring-1 ring-black/10 flex items-center gap-1">
                    <Star className="w-3 h-3" />
                    Capa
                  </span>
                )}
              </div>

              {isCover && (
                <>
                  <div className="pointer-events-none absolute -left-10 -top-3 rotate-[-16deg] z-10">
                    <div className="px-5 py-1 text-[11px] font-semibold bg-primary text-primary-foreground shadow-lg">CAPA</div>
                  </div>
                  <div className="pointer-events-none absolute inset-x-0 bottom-0 h-14 bg-gradient-to-t from-primary/25 to-transparent" />
                </>
              )}

              <div className="absolute bottom-2 right-2 flex items-center gap-1 opacity-0 group-hover:opacity-100 transition z-10">
                {m.tipo === "image" && (
                  <button
                    className="px-2 py-1 rounded-md bg-white/90 text-slate-900 text-xs ring-1 ring-black/10 hover:bg-white dark:bg-black/70 dark:text-white dark:ring-white/20 dark:hover:bg-black/80"
                    title="Definir como capa"
                    onClick={() => onSetCover(m.url)}
                  >
                    <Star className="w-3 h-3 inline mr-1" />
                    {isCover ? "Capa" : "Definir capa"}
                  </button>
                )}
                <button
                  className="px-2 py-1 rounded-md bg-red-500/10 text-red-600 text-xs hover:bg-red-500/20 dark:text-red-400"
                  title="Apagar"
                  onClick={() => onDelete(m)}
                >
                  <Trash2 className="w-3 h-3" />
                </button>
              </div>
            </motion.div>
          );
        })}
      </div>

      <AnimatePresence>{viewer && <Lightbox items={items} startIndex={viewer.index} onClose={() => setViewer(null)} />}</AnimatePresence>
    </>
  );
}

function DropzoneEmpty({
  onDropUpload,
  onPickFiles,
  uploading,
  uploadPct,
}: {
  onDropUpload: (files: FileList) => void;
  onPickFiles: () => void;
  uploading: boolean;
  uploadPct: number;
}) {
  return (
    <div
      className="w-full rounded-2xl border-2 border-dashed border-black/15 bg-black/[0.02] py-14 flex flex-col items-center justify-center text-center
                 dark:border-white/15 dark:bg-white/[0.02]"
      onDragOver={(e) => {
        e.preventDefault();
        e.dataTransfer.dropEffect = "copy";
      }}
      onDrop={(e) => {
        e.preventDefault();
        const files = e.dataTransfer.files;
        if (files && files.length) onDropUpload(files);
      }}
    >
      <div className="p-3 rounded-xl bg-black/5 dark:bg-white/10">
        {uploading ? <Loader2 className="w-6 h-6 animate-spin" /> : <Upload className="w-6 h-6" />}
      </div>
      <h3 className="mt-3 font-semibold">Solte aqui fotos ou vídeos</h3>
      <p className="opacity-70 text-sm max-w-md mt-1">Você também pode selecionar do dispositivo.</p>

      <button onClick={onPickFiles} disabled={uploading} className="mt-4 px-4 py-2 rounded-xl bg-primary text-primary-foreground disabled:opacity-60">
        {uploading ? `Enviando ${uploadPct}%...` : "Escolher arquivos"}
      </button>
    </div>
  );
}

function Lightbox({ items, startIndex, onClose }: { items: Media[]; startIndex: number; onClose: () => void }) {
  const [index, setIndex] = useState(startIndex);
  const current = items[index];

  function prev() {
    setIndex((i) => (i === 0 ? items.length - 1 : i - 1));
  }
  function next() {
    setIndex((i) => (i === items.length - 1 ? 0 : i + 1));
  }

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
      if (e.key === "ArrowRight") next();
      if (e.key === "ArrowLeft") prev();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (!current) return null;

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4"
      onMouseDown={onClose}
    >
      <motion.div
        initial={{ scale: 0.98, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.98, opacity: 0 }}
        onMouseDown={(e) => e.stopPropagation()}
        className="w-full max-w-5xl"
      >
        <div className="relative rounded-2xl overflow-hidden bg-black">
          {current.tipo === "image" ? (
            <img src={current.url} className="w-full max-h-[75vh] object-contain" />
          ) : (
            <video src={current.url} controls className="w-full max-h-[75vh] object-contain" />
          )}

          <button onClick={onClose} className="absolute top-3 right-3 p-2 rounded-full bg-white/10 hover:bg-white/20 text-white" title="Fechar">
            <X className="w-5 h-5" />
          </button>

          <button onClick={prev} className="absolute left-3 top-1/2 -translate-y-1/2 p-2 rounded-full bg-white/10 hover:bg-white/20 text-white" title="Anterior">
            <ChevronLeft className="w-6 h-6" />
          </button>
          <button onClick={next} className="absolute right-3 top-1/2 -translate-y-1/2 p-2 rounded-full bg-white/10 hover:bg-white/20 text-white" title="Próximo">
            <ChevronRight className="w-6 h-6" />
          </button>
        </div>
      </motion.div>
    </motion.div>
  );
}

function RenameModal({
  open,
  currentName,
  onClose,
  onConfirm,
  loading,
}: {
  open: boolean;
  currentName: string;
  onClose: () => void;
  onConfirm: (newName: string) => void;
  loading: boolean;
}) {
  const [value, setValue] = useState(currentName);
  useEffect(() => setValue(currentName), [currentName]);

  if (!open) return null;
  return (
    <ModalShell onClose={onClose}>
      <div className="flex items-center gap-2">
        <Pencil className="w-4 h-4" />
        <h3 className="font-semibold text-base">Renomear pasta</h3>
      </div>
      <input
        value={value}
        onChange={(e) => setValue(e.target.value)}
        className="w-full rounded-xl px-3 py-2 text-sm outline-none bg-white ring-1 ring-black/10 focus:ring-2 focus:ring-primary/40 dark:bg-white/[0.06] dark:text-white dark:ring-white/15"
      />
      <div className="flex justify-end gap-2">
        <button
          disabled={loading}
          onClick={onClose}
          className="px-3 py-2 text-xs rounded-xl bg-black/5 ring-1 ring-black/10 hover:bg-black/10 dark:bg-white/5 dark:ring-white/10 dark:hover:bg-white/10"
        >
          Cancelar
        </button>
        <button
          disabled={loading || !value.trim()}
          onClick={() => onConfirm(value)}
          className="px-4 py-2 text-xs rounded-xl bg-primary text-primary-foreground disabled:opacity-60 inline-flex items-center gap-2"
        >
          {loading && <Loader2 className="w-3 h-3 animate-spin" />}
          Salvar
        </button>
      </div>
    </ModalShell>
  );
}

function DeleteModal({
  open,
  folderName,
  filesCount,
  onClose,
  onConfirm,
  loading,
}: {
  open: boolean;
  folderName: string;
  filesCount?: number;
  onClose: () => void;
  onConfirm: () => void;
  loading: boolean;
}) {
  if (!open) return null;
  return (
    <ModalShell onClose={onClose}>
      <div className="flex items-center gap-2 text-red-600 dark:text-red-400">
        <AlertTriangle className="w-5 h-5" />
        <h3 className="font-semibold text-base">Excluir pasta</h3>
      </div>
      <p className="text-sm opacity-80">
        Tem certeza que deseja excluir <b>{folderName}</b>
        {typeof filesCount === "number" ? ` ( ${filesCount} arquivo${filesCount === 1 ? "" : "s"} )` : ""}?
        Esta ação não pode ser desfeita.
      </p>
      <div className="flex justify-end gap-2">
        <button
          disabled={loading}
          onClick={onClose}
          className="px-3 py-2 text-xs rounded-xl bg-black/5 ring-1 ring-black/10 hover:bg-black/10 dark:bg-white/5 dark:ring-white/10 dark:hover:bg-white/10"
        >
          Cancelar
        </button>
        <button
          disabled={loading}
          onClick={onConfirm}
          className="px-4 py-2 text-xs rounded-xl bg-red-600 text-white disabled:opacity-60 inline-flex items-center gap-2"
        >
          {loading && <Loader2 className="w-3 h-3 animate-spin" />}
          Apagar
        </button>
      </div>
    </ModalShell>
  );
}

function EmptyState({ icon, title, subtitle }: { icon: ReactNode; title: string; subtitle?: string }) {
  return (
    <div className="w-full rounded-2xl border border-dashed border-black/15 bg-white py-14 flex flex-col items-center justify-center text-center dark:border-white/15 dark:bg-white/[0.02]">
      <div className="p-3 rounded-xl bg-black/5 dark:bg-white/10">{icon}</div>
      <h3 className="mt-3 font-semibold">{title}</h3>
      {subtitle && <p className="opacity-70 text-sm max-w-md mt-1">{subtitle}</p>}
    </div>
  );
}
