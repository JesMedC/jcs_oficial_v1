/*
 * p0b.1b — Register page.
 *
 * Real page (replaces the p1e stub in `_stub.tsx`). The trial copy
 * was changed from "14 dias" to "7 dias" to match the backend
 * STARTER trial (see mem #77 — p0b.1a created a 7-day trial
 * subscription on register).
 *
 * Includes a "7 dias gratis" badge + the RegisterForm + a side panel
 * with what the user gets in the trial.
 */
import { SeoHead } from '../components/SeoHead';
import { AuthValuePanel } from '../components/home/AuthValuePanel';
import { RegisterForm } from '../features/auth/RegisterForm';

export function RegisterPage() {
  return (
    <>
      <SeoHead
        title="Crear cuenta"
        description="Crea tu cuenta en JadeCapitalSuite y prueba la plataforma 7 dias gratis sin tarjeta."
        canonicalPath="/register"
        noindex
      />
      <div className="max-w-6xl mx-auto px-4 md:px-8 py-4 grid grid-cols-1 md:grid-cols-2 gap-10 items-center">
        <AuthValuePanel
          eyebrow="7 días gratis"
          title="Crea tu cuenta"
          description="Empezá a registrar tus operaciones y tomar el control de tu trading en minutos."
          panelTitle="Qué incluye el trial"
          benefits={[
            'Registro ilimitado de operaciones de forex, binarias y cripto.',
            'Métricas básicas: P&L, win rate y drawdown.',
            'Soporte por email durante el trial.',
            'Sin tarjeta. Cancelá cuando quieras, sin permanencia.',
          ]}
          footerText="¿Ya tenés cuenta?"
          footerLinkLabel="Iniciar sesión"
          footerTo="/login"
        />

        <div>
          <RegisterForm />
        </div>
      </div>
    </>
  );
}
