// src/components/company/MapaObras.tsx
"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  MapContainer,
  TileLayer,
  Marker,
  Popup,
  ZoomControl,
  useMap,
} from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import {
  Building2,
  CheckCircle2,
  AlertTriangle,
  Layers,
  Eye,
  Loader2,
  ChevronDown,
  Map as MapIcon,
  ArrowRight,
} from "lucide-react";
import { supabase } from "@/lib/supabase";
import { useNavigate, Link } from "react-router-dom";

/* =========================
   Tipos e helpers
========================= */
type Obra = {
  id: string;
  nome: string;
  status?: "Em andamento" | "Concluída" | "Atrasada" | string | null;
  latitude?: number | null;
  longitude?: number | null;
  local?: string | null;
  custo_real?: number | null;
  progresso?: number | null;
};

const iconBase = (color: string) =>
  new L.Icon({
    iconUrl: `https://cdn.mapmarker.io/api/v1/pin?icon=fa-circle&size=40&hoffset=0&color=${color}`,
    iconSize: [28, 40],
    iconAnchor: [14, 40],
    popupAnchor: [0, -35],
  });

const getIcon = (status?: string | null) => {
  if (status === "Concluída") return iconBase("00C853");
  if (status === "Atrasada") return iconBase("FFC107");
  if (status === "Em andamento") return iconBase("1976D2");
  return iconBase("9E9E9E");
};

function useIsMobile(breakpoint = 768) {
  const [isMobile, setIsMobile] = useState<boolean>(() => {
    if (typeof window === "undefined") return false;
    return window.innerWidth < breakpoint;
  });
  useEffect(() => {
    const onResize = () => setIsMobile(window.innerWidth < breakpoint);
    window.addEventListener("resize", onResize, { passive: true });
    return () => window.removeEventListener("resize", onResize);
  }, [breakpoint]);
  return isMobile;
}

function AjustarMapa({ obras }: { obras: Obra[] }) {
  const map = useMap();

  useEffect(() => {
    const pts = obras.filter((o) => o.latitude && o.longitude);

    if (pts.length > 0) {
      // quando tem obras: bounds baseado nos pontos
      const bounds = L.latLngBounds(
        pts.map((o) => [o.latitude as number, o.longitude as number])
      );
      map.fitBounds(bounds, { padding: [60, 60] });
    } else {
      // sem nenhuma obra: bounds fixo de Portugal
      const portugalBounds = L.latLngBounds(
        [36.96, -9.5], // sudoeste
        [42.15, -6.0]  // nordeste
      );
      map.fitBounds(portugalBounds, { padding: [60, 60] });
    }
  }, [obras, map]);

  return null;
}

/** Recalcula o tamanho após animações/montagem */
function FixResize() {
  const map = useMap();
  useEffect(() => {
    const t = setTimeout(() => {
      map.invalidateSize(true);
    }, 250);
    return () => clearTimeout(t);
  }, [map]);
  return null;
}

/* =========================
   Base maps
========================= */
type BaseKey =
  | "osm"
  | "osmHot"
  | "cartoLight"
  | "cartoDark"
  | "stamenTerrain"
  | "esriSat";

const BASEMAPS: Record<
  BaseKey,
  { label: string; url: string; attribution: string; maxZoom?: number }
> = {
  osm: {
    label: "OSM Padrão",
    url: "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png",
    attribution:
      '&copy; <a href="https://www.openstreetmap.org/">OpenStreetMap</a>',
  },
  osmHot: {
    label: "OSM HOT",
    url: "https://{s}.tile.openstreetmap.fr/hot/{z}/{x}/{y}.png",
    attribution:
      '&copy; OpenStreetMap, tiles &copy; <a href="https://www.hotosm.org/">HOT</a>',
  },
  cartoLight: {
    label: "Carto Light",
    url: "https://cartodb-basemaps-a.global.ssl.fastly.net/light_all/{z}/{x}/{y}.png",
    attribution:
      '&copy; <a href="https://carto.com/">CARTO</a>, &copy; OpenStreetMap',
  },
  cartoDark: {
    label: "Carto Dark",
    url: "https://cartodb-basemaps-a.global.ssl.fastly.net/dark_all/{z}/{x}/{y}.png",
    attribution:
      '&copy; <a href="https://carto.com/">CARTO</a>, &copy; OpenStreetMap',
  },
  stamenTerrain: {
    label: "Stamen Terrain",
    url: "https://stamen-tiles.a.ssl.fastly.net/terrain/{z}/{x}/{y}.jpg",
    attribution:
      '&copy; <a href="http://stamen.com">Stamen</a>, &copy; OpenStreetMap',
    maxZoom: 18,
  },
  esriSat: {
    label: "Esri Satélite",
    url:
      "https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}",
    attribution:
      "Tiles &copy; Esri — Source: Esri, i-cubed, USDA, USGS, AEX, GeoEye, Getmapping, etc.",
  },
};

/* =========================
   Núcleo do mapa (memoizado)
========================= */
const MapaCore = React.memo(function MapaCore({
  obrasFiltradas,
  bm,
  isMobile,
  mapRef,
  toObra,
}: {
  obrasFiltradas: Obra[];
  bm: (typeof BASEMAPS)[BaseKey];
  isMobile: boolean;
  mapRef: React.MutableRefObject<L.Map | null>;
  toObra: (id: string) => void;
}) {
  return (
    <MapContainer
      whenCreated={(map) => (mapRef.current = map)}
      whenReady={() => mapRef.current?.invalidateSize(true)}
      center={[39.5, -8]}
      zoom={6}
      minZoom={4}
      maxZoom={18}
      zoomControl={!isMobile}
      scrollWheelZoom
      touchZoom
      dragging
      style={{
        height: "100%",
        width: "100%",
        borderRadius: "1rem",
        zIndex: 0,
        touchAction: "pan-x pan-y",
      }}
    >
      <FixResize />
      <AjustarMapa obras={obrasFiltradas} />
      {!isMobile && <ZoomControl position="bottomright" />}

      <TileLayer attribution={bm.attribution} url={bm.url} />

      {obrasFiltradas.map((obra) =>
        obra.latitude && obra.longitude ? (
          <Marker
            key={obra.id}
            position={[obra.latitude, obra.longitude]}
            icon={getIcon(obra.status)}
          >
            <Popup>
              <div className="text-sm">
                <Link
                  to={`/empresa/obras/${obra.id}/detalhes`}
                  className="font-semibold text-blue-600 hover:underline"
                >
                  {obra.nome}
                </Link>

                {obra.local && (
                  <p className="mt-2">
                    <strong>Cidade:</strong> {obra.local}
                  </p>
                )}
                {obra.status && (
                  <p>
                    <strong>Status:</strong> {obra.status}
                  </p>
                )}

                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    toObra(obra.id);
                  }}
                  className="mt-3 inline-flex items-center gap-1 rounded-md bg-blue-600 text-white text-xs px-3 py-1.5 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-400"
                >
                  Ver obra <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </div>
            </Popup>
          </Marker>
        ) : null
      )}
    </MapContainer>
  );
});

/* =========================
   Componente principal
========================= */
export default function MapaObras() {
  const [obras, setObras] = useState<Obra[]>([]);
  const [loading, setLoading] = useState(true);

  const [filtro, setFiltro] = useState<"Todas" | "Ativas" | "Concluída" | "Atrasada">(
    "Todas"
  );

  const [sheetAberta, setSheetAberta] = useState(false); // mobile
  const [deskOpen, setDeskOpen] = useState(true); // desktop: recolher/abrir

  const [base, setBase] = useState<BaseKey>("osm"); // mapa-base
  const isMobile = useIsMobile(768);
  const mapRef = useRef<L.Map | null>(null);
  const navigate = useNavigate();

  const toObra = (id: string) => navigate(`/empresa/obras/${id}/detalhes`);

  // Montagem “suave”
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  // Reflow quando muda layout
  useEffect(() => {
    if (!mapRef.current) return;
    const id = requestAnimationFrame(() => mapRef.current!.invalidateSize(true));
    return () => cancelAnimationFrame(id);
  }, [sheetAberta, isMobile, deskOpen]);

  // Load obras
  useEffect(() => {
    (async () => {
      setLoading(true);
      const { data, error } = await supabase.from("obras").select("*");
      if (!error && data) setObras(data as Obra[]);
      setLoading(false);
    })();
  }, []);

  const obrasFiltradas = useMemo(() => {
    if (filtro === "Todas") return obras;
    if (filtro === "Ativas")
      return obras.filter((o) => o.status === "Em andamento");
    return obras.filter((o) => o.status === filtro);
  }, [obras, filtro]);

  const totais = useMemo(() => {
    const list = Array.isArray(obras) ? obras : [];
    return {
      ativas: list.filter((o) => o.status === "Em andamento").length,
      concluidas: list.filter((o) => o.status === "Concluída").length,
      atrasadas: list.filter((o) => o.status === "Atrasada").length,
    };
  }, [obras]);

  const bm = BASEMAPS[base];

  return (
    <div
      className="
        relative w-full rounded-2xl overflow-hidden shadow-sm
        border border-gray-200 dark:border-[#1f2a37]
        bg-white dark:bg-[#161d27] mt-2 sm:mt-4
        h-[520px] sm:h-[560px]
      "
      style={{ minHeight: 520 }}
    >
      {loading || !mounted ? (
        <div className="flex items-center justify-center h-full">
          <Loader2 className="animate-spin w-8 h-8 text-blue-600" />
        </div>
      ) : (
        <>
          {/* Mapa sempre visível */}
          <MapaCore
            obrasFiltradas={obrasFiltradas}
            bm={bm}
            isMobile={isMobile}
            mapRef={mapRef}
            toObra={toObra}
          />

          {/* ===== MOBILE: botão para abrir resumo ===== */}
          {isMobile && !sheetAberta && (
            <button
              onClick={() => setSheetAberta(true)}
              className="absolute bottom-[calc(env(safe-area-inset-bottom,0)+10px)] left-1/2 -translate-x-1/2
                         z-[31] inline-flex items-center gap-2 rounded-full px-3 py-2
                         bg-white/95 dark:bg-[#1b2535]/95 border border-gray-200 dark:border-[#2a3647]
                         shadow-md"
              aria-label="Abrir resumo de obras"
            >
              <ChevronDown className="w-4 h-4 rotate-180 text-gray-700 dark:text-gray-200" />
              <span className="text-xs font-medium text-gray-700 dark:text-gray-200">
                Resumo de obras
              </span>
              <span className="text-[10px] ml-1 text-gray-500 dark:text-gray-400">
                ({totais.ativas} / {totais.concluidas} / {totais.atrasadas})
              </span>
            </button>
          )}

          {/* ===== MOBILE: Bottom Sheet ===== */}
          {isMobile && sheetAberta && (
            <div className="absolute bottom-0 left-0 right-0 bg-white/95 dark:bg-[#1b2535]/95 rounded-t-2xl shadow-2xl border-t border-gray-200 dark:border-[#2a3647] z-[30] p-3 pb-[calc(env(safe-area-inset-bottom,0)+12px)]">
              <button
                onClick={() => setSheetAberta(false)}
                className="w-full flex justify-center items-center text-gray-500 hover:text-gray-800 dark:text-gray-400"
                aria-label="Recolher painel"
              >
                <div className="h-1.5 w-10 rounded-full bg-gray-300 dark:bg-gray-600 mb-1.5" />
                <ChevronDown className="w-6 h-6 ml-2" />
              </button>

              <div className="space-y-2 mt-2">
                <div className="grid grid-cols-3 gap-2 text-center">
                  <button
                    onClick={() => setFiltro("Ativas")}
                    className={`rounded-lg py-2 text-xs font-medium ${
                      filtro === "Ativas"
                        ? "bg-blue-600 text-white"
                        : "bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-300"
                    }`}
                  >
                    <Building2 className="w-4 h-4 mx-auto mb-1" />
                    {totais.ativas}
                    <p className="text-[10px] mt-0.5">Ativas</p>
                  </button>

                  <button
                    onClick={() => setFiltro("Concluída")}
                    className={`rounded-lg py-2 text-xs font-medium ${
                      filtro === "Concluída"
                        ? "bg-green-600 text-white"
                        : "bg-green-50 dark:bg-green-900/20 text-green-600 dark:text-green-300"
                    }`}
                  >
                    <CheckCircle2 className="w-4 h-4 mx-auto mb-1" />
                    {totais.concluidas}
                    <p className="text-[10px] mt-0.5">Concluídas</p>
                  </button>

                  <button
                    onClick={() => setFiltro("Atrasada")}
                    className={`rounded-lg py-2 text-xs font-medium ${
                      filtro === "Atrasada"
                        ? "bg-yellow-500 text-white"
                        : "bg-yellow-50 dark:bg-yellow-900/20 text-yellow-600 dark:text-yellow-300"
                    }`}
                  >
                    <AlertTriangle className="w-4 h-4 mx-auto mb-1" />
                    {totais.atrasadas}
                    <p className="text-[10px] mt-0.5">Atrasadas</p>
                  </button>
                </div>

                {/* seletor de mapa base */}
                <div className="grid grid-cols-1 gap-2 mt-2">
                  <div className="flex items-center gap-2 text-[11px] text-gray-500 dark:text-gray-400">
                    <MapIcon className="w-3.5 h-3.5" />
                    <span>Mapa base</span>
                  </div>
                  <select
                    value={base}
                    onChange={(e) => setBase(e.target.value as BaseKey)}
                    className="w-full text-xs rounded-lg border border-gray-200 dark:border-[#2a3647] bg-white dark:bg-[#1b2535] text-gray-800 dark:text-gray-100 px-2 py-1.5"
                  >
                    {Object.entries(BASEMAPS).map(([k, v]) => (
                      <option key={k} value={k}>
                        {v.label}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            </div>
          )}

          {/* ===== DESKTOP: painel compacto ===== */}
          {!isMobile && deskOpen && (
            <div
              className="
                absolute left-6 top-[58%] -translate-y-1/2
                z-[30] w-[240px] rounded-2xl bg-white/95 dark:bg-[#1b2535]/95
                border border-gray-200 dark:border-[#2a3647] shadow p-3
              "
            >
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2 text-sm font-semibold text-gray-800 dark:text-gray-100">
                  <Layers className="w-4.5 h-4.5 text-blue-600" /> Obras
                </div>
                <button
                  onClick={() => setDeskOpen(false)}
                  className="rounded-md px-2 py-1 text-[11px] border border-gray-200 dark:border-[#2a3647] hover:bg-gray-100 dark:hover:bg-[#223049]"
                  aria-label="Recolher painel"
                  title="Recolher"
                >
                  Recolher
                </button>
              </div>

              <div className="flex flex-col gap-1.5">
                <button
                  onClick={() => setFiltro("Ativas")}
                  className={`w-full flex items-center justify-between px-3 py-2 rounded-lg text-[13px] ${
                    filtro === "Ativas"
                      ? "bg-blue-600 text-white"
                      : "bg-blue-50 text-gray-700 hover:bg-blue-100"
                  }`}
                >
                  <span className="flex items-center gap-2">
                    <Building2 className="w-4 h-4" /> Ativas
                  </span>
                  <span>{totais.ativas}</span>
                </button>

                <button
                  onClick={() => setFiltro("Concluída")}
                  className={`w-full flex items-center justify-between px-3 py-2 rounded-lg text-[13px] ${
                    filtro === "Concluída"
                      ? "bg-green-600 text-white"
                      : "bg-green-50 text-gray-700 hover:bg-green-100"
                  }`}
                >
                  <span className="flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4" /> Concluídas
                  </span>
                  <span>{totais.concluidas}</span>
                </button>

                <button
                  onClick={() => setFiltro("Atrasada")}
                  className={`w-full flex items-center justify-between px-3 py-2 rounded-lg text-[13px] ${
                    filtro === "Atrasada"
                      ? "bg-yellow-500 text-white"
                      : "bg-yellow-50 text-gray-700 hover:bg-yellow-100"
                  }`}
                >
                  <span className="flex items-center gap-2">
                    <AlertTriangle className="w-4 h-4" /> Atrasadas
                  </span>
                  <span>{totais.atrasadas}</span>
                </button>

                <button
                  onClick={() => setFiltro("Todas")}
                  className={`w-full mt-1 flex items-center justify-center gap-2 px-3 py-2 rounded-lg text-[13px] ${
                    filtro === "Todas"
                      ? "bg-gray-800 text-white"
                      : "bg-gray-100 dark:bg-zinc-800 text-gray-700 hover:bg-gray-200"
                  }`}
                >
                  <Eye className="w-4 h-4" /> Mostrar todas
                </button>
              </div>

              {/* seletor de mapa base */}
              <div className="mt-2">
                <div className="flex items-center gap-2 text-[11px] text-gray-500 dark:text-gray-400 mb-1">
                  <MapIcon className="w-3.5 h-3.5" />
                  <span>Mapa base</span>
                </div>
                <select
                  value={base}
                  onChange={(e) => setBase(e.target.value as BaseKey)}
                  className="w-full text-xs rounded-lg border border-gray-200 dark:border-[#2a3647] bg-white dark:bg-[#1b2535] text-gray-800 dark:text-gray-100 px-2 py-1.5"
                >
                  {Object.entries(BASEMAPS).map(([k, v]) => (
                    <option key={k} value={k}>
                      {v.label}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          )}

          {/* Botão para reabrir quando recolhido */}
          {!isMobile && !deskOpen && (
            <button
              onClick={() => setDeskOpen(true)}
              className="
                absolute left-6 top-[58%] -translate-y-1/2 z-[31]
                inline-flex items-center gap-2 rounded-full px-3 py-2
                bg-white/95 dark:bg-[#1b2535]/95 border border-gray-200 dark:border-[#2a3647]
                shadow-md text-sm font-medium
              "
              aria-label="Abrir painel"
            >
              <Layers className="w-4 h-4 text-blue-600" />
              Abrir painel
            </button>
          )}
        </>
      )}
    </div>
  );
}

