import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { login } from "@/services/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { Loader2, Lock } from "lucide-react";

export default function Login() {
  const navigate = useNavigate();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);

    const emailTrim = email.trim().toLowerCase();

    try {
      // ✅ guarda o email da sessão (o AddBillDialog usa isso pra achar o setor quando faltar nc_setor_id)
      localStorage.setItem("nc_email", emailTrim);

      // ✅ opcional: evita setor antigo de outra sessão
      localStorage.removeItem("nc_setor_id");

      // se teu login() retornar alguma coisa, a gente aproveita
      const res: any = await login(emailTrim, password);

      // ✅ se o service login devolver setorId, já salva e pronto
      if (res?.setorId) {
        localStorage.setItem("nc_setor_id", String(res.setorId));
      }

      toast.success("Login realizado.");
      navigate("/");
    } catch (err: any) {
      // limpa email salvo se falhar login (pra não ficar “sessão zumbi”)
      localStorage.removeItem("nc_email");
      localStorage.removeItem("nc_setor_id");

      toast.error(err?.message || "Falha no login");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-zinc-950 via-zinc-900 to-zinc-950 px-4">
      <Card className="w-full max-w-md border-border/50 shadow-xl">
        <CardHeader className="space-y-2 text-center">
          <div className="flex justify-center">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10">
              <Lock className="h-6 w-6 text-primary" />
            </div>
          </div>

          <CardTitle className="text-xl font-semibold">
            Central de Custos
          </CardTitle>

          <p className="text-sm text-muted-foreground">
            Entre com seus dados para continuar
          </p>
        </CardHeader>

        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-1">
              <Label htmlFor="email">E-mail</Label>
              <Input
                id="email"
                type="email"
                placeholder="seu@email.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                autoComplete="email"
              />
            </div>

            <div className="space-y-1">
              <Label htmlFor="password">Senha</Label>
              <Input
                id="password"
                type="password"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                autoComplete="current-password"
              />
            </div>

            <Button type="submit" className="w-full gap-2" disabled={loading}>
              {loading && <Loader2 className="h-4 w-4 animate-spin" />}
              Entrar
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
