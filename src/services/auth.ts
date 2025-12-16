// src/services/auth.ts
import { ncFetch } from "@/lib/nocodb";
import bcrypt from "bcryptjs";

const PROJECT = import.meta.env.VITE_NOCODB_PROJECT_ID;
const TABLE_SETORES = import.meta.env.VITE_NOCODB_TABLE_SETORES;

export async function login(email: string, password: string) {
  // ⚠️ aqui "EMAIL" só funciona se o alias REAL da coluna for EMAIL
  const where = `(EMAIL,eq,${email})`;

  const data = await ncFetch<any>(
    `/api/v3/data/${PROJECT}/${TABLE_SETORES}/records?where=${encodeURIComponent(where)}`
  );

  const user = data?.records?.[0];
  if (!user) throw new Error("Usuário não encontrado");

  const hash = user.fields.PASSWORD_HASH;
  const ok = await bcrypt.compare(password, hash);
  if (!ok) throw new Error("Senha inválida");

  const session = {
    id: user.id,
    email: user.fields.EMAIL,
    setor: user.fields.SETORES,
  };

  localStorage.setItem("session", JSON.stringify(session));
  return session;
}
