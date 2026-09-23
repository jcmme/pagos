import { LoginForm } from "./LoginForm";

export default function LoginPage() {
  return (
    <div className="flex min-h-screen items-center justify-center px-4">
      <div className="w-full max-w-sm">
        <div className="mb-8 text-center">
          <div className="mb-2 text-[28px]">💰</div>
          <h1 className="text-[22px] font-semibold">Pagos</h1>
          <p className="mt-1 text-[13px] text-(--foreground-muted)">
            Inicia sesión para continuar
          </p>
        </div>
        <div className="glass rounded-(--radius-lg) p-6">
          <LoginForm />
        </div>
      </div>
    </div>
  );
}
