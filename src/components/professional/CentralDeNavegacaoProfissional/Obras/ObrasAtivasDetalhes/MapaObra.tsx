import { useEffect, useRef, useState, useMemo } from "react";
import {
  MapPin,
  Navigation,
  Loader2,
  AlertTriangle,
  ShieldCheck,
  Crosshair,
  Building2,
  LocateFixed,
} from "lucide-react";
import { motion } from "framer-motion";
import {
  MapContainer,
  TileLayer,
  Marker,
  Circle,
  Popup,
  Polyline,
} from "react-leaflet";
import "leaflet/dist/leaflet.css";
import L from "leaflet";
import { Toaster, toast } from "sonner";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/context/AuthContext";

const RAIO_PADRAO_METROS = 300;

// 📍 Tipos
type Obra = {
  id: string;
  nome?: string | null;
  endereco?: string | null;
  latitude?: number | null;
  longitude?: number | null;
};

type Presenca = {
  id: string;
  data: string;
  hora_entrada: string | null;
  hora_saida: string | null;
  device_latitude?: number | null;
  device_longitude?: number | null;
};

// 📏 Distância em metros
const distanciaMetros = (a: { lat: number; lng: number }, b: { lat: number; lng: number }) => {
  const R = 6371000;
  const toRad = (x: number) => (x * Math.PI) / 180;
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const s =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(a.lat)) * Math.cos(toRad(b.lat)) * Math.sin(dLng / 2) ** 2;
  const c = 2 * Math.atan2(Math.sqrt(s), Math.sqrt(1 - s));
  return R * c;
};

// 🎯 Ícones
const iconProfissional = new L.Icon({
  iconUrl: "https://cdn-icons-png.flaticon.com/512/684/684908.png",
  iconSize: [35, 35],
  iconAnchor: [17, 35],
});

const iconObra = new L.Icon({
  iconUrl: "https://cdn-icons-png.flaticon.com/512/484/484167.png",
  iconSize: [38, 38],
  iconAnchor: [19, 38],
});

const iconEntrada = new L.Icon({
  iconUrl: "https://cdn-icons-png.flaticon.com/512/4315/4315445.png",
  iconSize: [30, 30],
  iconAnchor: [15, 30],
});

const iconSaida = new L.Icon({
  iconUrl: "https://cdn-icons-png.flaticon.com/512/4315/4315464.png",
  iconSize: [30, 30],
  iconAnchor: [15, 30],
});

export default function MapaObra({ obraId }: { obraId: string }) {
  const { user } = useAuth();
  const [obra, setObra] = useState<Obra | null>(null);
  const [presencas, setPresencas] = useState<Presenca[]>([]);
  const [pos, setPos] = useState<{ lat: number; lng: number } | null>(null);
  const [distancia, setDistancia] = useState<number | null>(null);
  const [gpsDisponivel, setGpsDisponivel] = useState(true);
  const [loading, setLoading] = useState(true);
  const [aguardandoSinal, setAguardandoSinal] = useState(false);

  const mapRef = useRef<any>(null);

  // 🔹 Carrega dados da obra
  useEffect(() => {
    (async () => {
      const { data, error } = await supabase
        .from("obras")
        .select("id, nome, endereco, latitude, longitude")
        .eq("id", obraId)
        .maybeSingle();
      if (!error && data) setObra(data);
    })();
  }, [obraId]);

  // 🔹 Presenças recentes
  useEffect(() => {
    if (!user) return;
    (async () => {
      const { data } = await supabase
        .from("presencas_profissionais")
        .select("id, data, hora_entrada, hora_saida, device_latitude, device_longitude")
        .eq("profissional_id", user.id || user.auth_id)
        .eq("obra_id", obraId)
        .order("data", { ascending: false })
        .limit(10);
      if (data) setPresencas(data);
    })();
  }, [obraId, user]);

  // 🧭 Rastreamento GPS
  useEffect(() => {
    if (!("geolocation" in navigator)) {
      setGpsDisponivel(false);
      setLoading(false);
      toast.error("GPS não suportado neste dispositivo.");
      return;
    }

    setLoading(true);
    const watchId = navigator.geolocation.watchPosition(
      (p) => {
        setPos({ lat: p.coords.latitude, lng: p.coords.longitude });
        setGpsDisponivel(true);
        setLoading(false);
        setAguardandoSinal(false);
      },
      () => {
        setGpsDisponivel(false);
        setLoading(false);
      },
      { enableHighAccuracy: true, maximumAge: 5000, timeout: 10000 }
    );
    return () => navigator.geolocation.clearWatch(watchId);
  }, []);

  // 📏 Cálculo da distância
  useEffect(() => {
    if (pos && obra?.latitude && obra?.longitude) {
      setDistancia(
        Math.round(distanciaMetros(pos, { lat: obra.latitude, lng: obra.longitude }))
      );
    }
  }, [pos, obra]);

  const dentroDoRaio = useMemo(() => {
    if (distancia == null) return null;
    return distancia <= RAIO_PADRAO_METROS;
  }, [distancia]);

  // 🔘 Centralização
  const centralizarEmMim = () => {
    if (pos && mapRef.current) {
      mapRef.current.flyTo([pos.lat, pos.lng], 17, { animate: true });
    }
  };
  const centralizarNaObra = () => {
    if (obra?.latitude && obra?.longitude && mapRef.current) {
      mapRef.current.flyTo([obra.latitude, obra.longitude], 17, { animate: true });
    }
  };

  // 🚀 Ativar GPS manualmente
  const solicitarPermissaoGPS = () => {
    if (!navigator.geolocation) {
      toast.error("Seu navegador não suporta geolocalização.");
      return;
    }
    setLoading(true);
    setAguardandoSinal(true);
    navigator.geolocation.getCurrentPosition(
      (p) => {
        setPos({ lat: p.coords.latitude, lng: p.coords.longitude });
        setGpsDisponivel(true);
        setLoading(false);
        setAguardandoSinal(false);
        toast.success("✅ GPS ativado com sucesso!");
      },
      () => {
        setGpsDisponivel(false);
        setLoading(false);
        setAguardandoSinal(false);
        toast.error("❌ Permissão negada. Ative o GPS nas configurações do navegador.");
      },
      { enableHighAccuracy: true, timeout: 8000 }
    );
  };

  if (!obra)
    return (
      <div className="p-6 text-center text-gray-600 dark:text-gray-300">
        Carregando obra...
      </div>
    );

  return (
    <div className="p-4 sm:p-8 relative overflow-hidden">
      <Toaster position="bottom-center" richColors />
      <motion.h1
        className="text-2xl font-bold flex items-center gap-2 mb-2 text-gray-900 dark:text-gray-100"
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
      >
        <MapPin className="text-blue-500" /> Mapa da Obra
      </motion.h1>
      {obra.endereco && (
        <p className="text-gray-500 dark:text-gray-400 text-sm mb-4">{obra.endereco}</p>
      )}

      <div className="rounded-2xl overflow-hidden border border-blue-800/20 shadow-md bg-white/60 dark:bg-[#0B1736]/60 backdrop-blur-sm relative">
        {loading ? (
          <div className="flex flex-col items-center justify-center py-20">
            <Loader2 className="animate-spin text-blue-500" size={32} />
            <p className="text-sm mt-2 text-gray-400">
              {aguardandoSinal ? "Aguardando sinal de GPS..." : "Obtendo localização..."}
            </p>
          </div>
        ) : !gpsDisponivel ? (
          <div className="text-center py-16 px-4">
            <AlertTriangle className="mx-auto text-amber-500" size={40} />
            <p className="mt-3 text-gray-600 dark:text-gray-300">
              GPS desativado ou permissão negada.
              <br />
              Ative o acesso à localização para ver o mapa.
            </p>
            <button
              onClick={solicitarPermissaoGPS}
              className="mt-5 inline-flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-5 py-2.5 rounded-xl font-semibold shadow-md"
            >
              <LocateFixed size={18} /> Ativar GPS
            </button>
          </div>
        ) : (
          <>
            {obra.latitude && obra.longitude ? (
              <MapContainer
                center={[obra.latitude, obra.longitude]}
                zoom={16}
                style={{ height: "450px", width: "100%" }}
                ref={mapRef}
              >
                <TileLayer
                  url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                  attribution="&copy; OpenStreetMap"
                />

                {/* Obra */}
                <Marker position={[obra.latitude, obra.longitude]} icon={iconObra}>
                  <Popup>
                    <b>{obra.nome}</b>
                    <br />
                    {obra.endereco}
                  </Popup>
                </Marker>

                <Circle
                  center={[obra.latitude, obra.longitude]}
                  radius={RAIO_PADRAO_METROS}
                  pathOptions={{
                    color: "blue",
                    fillColor: "blue",
                    fillOpacity: 0.08,
                    opacity: 0.5,
                  }}
                />

                {/* Profissional */}
                {pos && (
                  <>
                    <Marker position={[pos.lat, pos.lng]} icon={iconProfissional}>
                      <Popup>
                        <b>Você está aqui</b>
                        <br />
                        {distancia != null && <span>Distância: {distancia} m</span>}
                      </Popup>
                    </Marker>
                    <Circle
                      center={[pos.lat, pos.lng]}
                      radius={10}
                      pathOptions={{ color: "blue", fillColor: "blue", opacity: 0.4 }}
                    />
                  </>
                )}

                {/* Presenças */}
                {presencas.map((p) => {
                  if (!p.device_latitude || !p.device_longitude) return null;
                  const isSaida = !!p.hora_saida;
                  return (
                    <Marker
                      key={p.id}
                      position={[p.device_latitude, p.device_longitude]}
                      icon={isSaida ? iconSaida : iconEntrada}
                    >
                      <Popup>
                        {isSaida ? "Saída" : "Entrada"}  
                        <br />
                        {p.data}
                      </Popup>
                    </Marker>
                  );
                })}

                {/* Linha de rota */}
                {presencas.length >= 2 && (
                  <Polyline
                    positions={presencas
                      .filter((p) => p.device_latitude && p.device_longitude)
                      .map((p) => [p.device_latitude!, p.device_longitude!])}
                    pathOptions={{ color: "lime", weight: 3, opacity: 0.6 }}
                  />
                )}
              </MapContainer>
            ) : (
              <div className="p-10 text-center text-gray-600 dark:text-gray-300">
                Esta obra não possui coordenadas registadas.
              </div>
            )}
          </>
        )}
      </div>

      {/* 🔘 Ações */}
      {pos && (
        <div className="flex justify-center gap-3 mt-5 flex-wrap">
          <button
            onClick={centralizarEmMim}
            className="inline-flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-xl font-semibold shadow-md"
          >
            <Crosshair size={18} /> Centralizar em mim
          </button>
          <button
            onClick={centralizarNaObra}
            className="inline-flex items-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2 rounded-xl font-semibold shadow-md"
          >
            <Building2 size={18} /> Centralizar na obra
          </button>
        </div>
      )}

      {/* ℹ️ Status */}
      {distancia != null && (
        <div className="mt-4 text-center">
          <p
            className={`text-lg font-medium ${
              dentroDoRaio ? "text-green-500" : "text-amber-500"
            }`}
          >
            {dentroDoRaio ? (
              <>
                <ShieldCheck className="inline mr-1" size={18} />
                Dentro da área permitida
              </>
            ) : (
              <>
                <AlertTriangle className="inline mr-1" size={18} />
                Fora do ponto — aproxime-se da obra
              </>
            )}
          </p>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
            Distância atual: {distancia} m
          </p>
          {obra.latitude && obra.longitude && (
            <a
              href={`https://www.google.com/maps/dir/?api=1&destination=${obra.latitude},${obra.longitude}`}
              target="_blank"
              rel="noopener noreferrer"
              className="mt-4 inline-flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-5 py-2 rounded-xl font-semibold shadow-md"
            >
              <Navigation size={16} /> Abrir no Google Maps
            </a>
          )}
        </div>
      )}
    </div>
  );
}

