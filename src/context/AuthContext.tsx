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
        throw new Error(loginError?.message || "E-mail ou senha incorretos.");

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

      const tipoNormalizado = normalizarTipo(tipo);

      // 1) Criar utilizador no Supabase Auth
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

      if (authErr || !authData.user) {
        console.error("Erro Supabase Auth:", authErr);
        throw new Error(
          authErr?.message || "Erro ao criar conta no Supabase Auth."
        );
      }

      const authUser = authData.user;

      console.log("✅ Conta criada no Supabase Auth:", authUser);
      console.log("📡 Metadados enviados:", authUser.user_metadata);

      // 2) Criar registro correspondente na tabela `usuarios`
      const { data: usuarioData, error: usuarioErr } = await supabase
        .from("usuarios")
        .insert({
          nome: nome.trim(),
          email: email.trim().toLowerCase(),
          tipo_usuario: tipoNormalizado,
          auth_id: authUser.id,
          // campo `senha` fica null de propósito
        })
        .select("id, nome, tipo_usuario, email, auth_id")
        .single();

      if (usuarioErr) {
        console.error("⚠️ Erro ao criar registro em `usuarios`:", usuarioErr);
        throw new Error("Conta criada, mas falha ao salvar o usuário interno.");
      }

      console.log("✅ Registro criado em `usuarios`:", usuarioData);

      // 3) Se for PROFISSIONAL, cria também em `profissionais`
      if (tipoNormalizado === "profissional") {
        const { error: profErr } = await supabase.from("profissionais").insert({
          auth_id: authUser.id,
          nome: nome.trim(),
          email: email.trim().toLowerCase(),
          status: "ativo", // mesmo que a função antiga usava
        });

        if (profErr) {
          console.error("⚠️ Erro ao criar registro em `profissionais`:", profErr);
          // aqui eu não dou throw pra não quebrar o cadastro todo;
          // depois podemos tratar isso melhor se quiser
        }
      }

      // 4) Opcional: termina sessão após cadastro (mantém comportamento antigo)
      await supabase.auth.signOut();

      return usuarioData;
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
