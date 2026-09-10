import { createContext, useContext } from "react";
import type { Session } from "./api";

export const SessionContext = createContext<Session | null>(null);

/** Panel sayfalarında giriş yapmış kullanıcı. Kabuk dışında çağrılırsa hata verir. */
export function useSession(): Session {
  const session = useContext(SessionContext);
  if (!session) throw new Error("useSession panel kabuğu dışında kullanıldı");
  return session;
}
