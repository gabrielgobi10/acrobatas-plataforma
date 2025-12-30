// src/context/AuthContext.tsx
import {
  createContext,
  useContext,
  useState,
  useEffect,
  ReactNode,
} from "react";
import { supabase } from "../lib/supabase";

interface AuthContextType {
  user: any;
  isAuthenticated: boolean;
  login: (email: string, senha: string, tipo: string) => Promise<any>;
  logout: () => Promise<void>;
  register: (
    nome: string,
    email: string,
    senha: string,
    tipo: string,
    codigo?: string
  ) => Promise<any>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<any>(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  // Normalizar nomes entre front e banco
  const normalizarTipo = (t: string) => {
    const map: Record<string, string> = {
      professional: "profissional",
      trabalhador: "profissional",
      empresa: "empresa",
      admin: "admin",
      mestre: "mestre",
      user: "profissional",
    };
    return map[t?.toLowerCase()] || t?.toLowerCase() || "";
  };

  /* ============================================================
     LOGIN
  ============================================================ */
  const login = async (email: string, senha: string, tipo: string) => {
    try {
      if (!email || !senha) throw new Error("Preencha todos os campos.");

      const { data: loginData, error: loginError } =
        await supabase.auth.signInWithPassword({
          email: email.trim().toLowerCase(),
          password: senha.trim(),
        });

      if (loginError || !loginData.user)
        throw new Error("E-mail ou senha incorretos.");

      const authUser = loginData.user;

      // Buscar na tabela `usuarios` usando AUTH_ID
      const { data: usuario, error: usuarioErr } = await supabase
        .from("usuarios")
        .select("*")
        .eq("auth_id", authUser.id)
        .maybeSingle();

      if (usuarioErr) throw usuarioErr;

      if (!usuario) {
        throw new Error(
          "Conta autenticada, mas sem registro interno. Contate o suporte."
        );
      }

      const tipoBanco = normalizarTipo(usuario.tipo_usuario);
      const tipoFront = normalizarTipo(tipo);

      if (tipoBanco !== tipoFront) {
        throw new Error(
          `Esta conta é do tipo “${usuario.tipo_usuario}”. Selecione o tipo correto.`
        );
      }

      const fullUser = {
        ...usuario,
        email: authUser.email,
        auth_id: authUser.id,
      };

      setUser(fullUser);
      setIsAuthenticated(true);
      localStorage.setItem("acrobatas_user", JSON.stringify(fullUser));

      return fullUser;
    } catch (err: any) {
      console.error("⚠️ Erro no login:", err.message);
      throw new Error(err.message);
    }
  };

  /* ============================================================
     REGISTER ( SEM INSERT MANUAL — triggers fazem tudo )
  ============================================================ */
  const register = async (
    nome: string,
    email: string,
    senha: string,
    tipo: string,
    codigo?: string
  ) => {
    try {
      if (!nome || !email || !senha)
        throw new Error("Preencha todos os campos obrigatórios.");

      const tipoNormalizado = normalizarTipo(tipo);

      // Criar conta no Auth
      const { data: authData, error: authErr } = await supabase.auth.signUp({
        email: email.trim().toLowerCase(),
        password: senha.trim(),
        options: {
          data: {
            nome: nome.trim(),
            tipo: tipoNormalizado,
          },
        },
      });

      if (authErr || !authData.user)
        throw new Error(authErr?.message || "Erro ao criar conta.");

      const authUser = authData.user;
      console.log("Auth criado:", authUser.id);

      // IMPORTANTE:
      // NÃO INSERIR EM `usuarios`
      // Trigger:
      // - cria registro em `usuarios`
      // - cria profissional OU empresa
      // - cria perfil profissional (se aplicável)

      // Logout automático após registro
      await supabase.auth.signOut();

      return { success: true };
    } catch (err: any) {
      console.error("Erro no register:", err.message);
      throw new Error(err.message);
    }
  };

  /* ============================================================
     LOGOUT
  ============================================================ */
  const logout = async () => {
    try {
      await supabase.auth.signOut();
      setUser(null);
      setIsAuthenticated(false);
      localStorage.removeItem("acrobatas_user");
    } catch (err) {
      console.error("Erro no logout:", err);
    }
  };

  /* ============================================================
     LOAD SESSION
  ============================================================ */
  useEffect(() => {
    const loadSession = async () => {
      try {
        const { data } = await supabase.auth.getUser();

        if (data?.user) {
          const authUser = data.user;

          const { data: usuario } = await supabase
            .from("usuarios")
            .select("*")
            .eq("auth_id", authUser.id)
            .maybeSingle();

          if (usuario) {
            const fullUser = {
              ...usuario,
              email: authUser.email,
              auth_id: authUser.id,
            };

            setUser(fullUser);
            setIsAuthenticated(true);
            localStorage.setItem("acrobatas_user", JSON.stringify(fullUser));
          }
        } else {
          setUser(null);
          setIsAuthenticated(false);
        }
      } catch (err) {
        console.warn("Sessão não carregada:", err);
      }
    };

    loadSession();
  }, []);

  return (
    <AuthContext.Provider
      value={{ user, isAuthenticated, login, logout, register }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context)
    throw new Error("useAuth deve ser usado dentro de um AuthProvider");
  return context;
};
