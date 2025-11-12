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

      const { data: usuario, error: usuarioErr } = await supabase
        .from("usuarios")
        .select("id, nome, tipo_usuario, email, auth_id")
        .eq("auth_id", authUser.id)
        .maybeSingle();

      if (usuarioErr) throw usuarioErr;
      if (!usuario)
        throw new Error(
          "Conta autenticada, mas sem registro associado. Contate o suporte."
        );

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

      console.log("✅ Login bem-sucedido:", fullUser);
      return fullUser;
    } catch (err: any) {
      console.error("⚠️ Erro no login:", err.message);
      throw new Error(err.message);
    }
  };

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

      const { data: authData, error: authErr } = await supabase.auth.signUp({
        email: email.trim().toLowerCase(),
        password: senha.trim(),
        options: {
          data: {
            nome: nome.trim(),
            tipo: tipo.trim().toLowerCase(),
          },
        },
      });

      if (authErr || !authData.user)
        throw new Error("Erro ao criar conta no Supabase Auth.");

      console.log("✅ Conta criada no Supabase Auth:", authData.user);
      console.log("📡 Metadados enviados:", authData.user.user_metadata);

      return authData.user;
    } catch (err: any) {
      console.error("⚠️ Erro no registro:", err.message);
      throw new Error(err.message);
    }
  };

  const logout = async () => {
    try {
      await supabase.auth.signOut();
      setUser(null);
      setIsAuthenticated(false);
      localStorage.removeItem("acrobatas_user");
      console.log("🚪 Logout realizado com sucesso.");
    } catch (err) {
      console.error("⚠️ Erro ao fazer logout:", err);
      throw err;
    }
  };

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
        console.warn("⚠️ Sessão resetada:", err);
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