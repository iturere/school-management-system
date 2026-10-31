
import {
  createContext,
  useContext,
  useEffect,
  useState,
} from "react";
import api from "../services/api";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const restoreSession = async () => {
      const token = localStorage.getItem("token");

      if (!token) {
        setLoading(false);
        return;
      }

      try {
        const response = await api.get("/auth/me");

        setUser(response.data.user || response.data);
      } catch (error) {
        localStorage.removeItem("token");
        setUser(null);
      } finally {
        setLoading(false);
      }
    };

    restoreSession();
  }, []);

  const isAuthenticated = Boolean(
    localStorage.getItem("token") && user
  );

  const login = async (email, password) => {
    setLoading(true);

    try {
      const response = await api.post("/auth/login", {
        email,
        password,
      });

      const data = response.data;
      const token = data.token || data.accessToken;

      if (!token) {
        throw new Error("No authentication token returned by the server.");
      }

      localStorage.setItem("token", token);

      // Retrieve the authenticated user's complete profile.
      const profileResponse = await api.get("/auth/me");

      setUser(profileResponse.data.user || profileResponse.data);

      return { success: true };
    } catch (error) {
      localStorage.removeItem("token");
      setUser(null);

      return {
        success: false,
        message:
          error.response?.data?.message ||
          error.message ||
          "Login failed.",
      };
    } finally {
      setLoading(false);
    }
  };

  const logout = () => {
    localStorage.removeItem("token");
    setUser(null);
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        setUser,
        login,
        logout,
        loading,
        isAuthenticated,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
