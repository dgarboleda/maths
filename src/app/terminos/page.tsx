import type { Metadata } from "next";
import Link from "next/link";
import { LegalPage, Pendiente } from "@/components/legal/LegalPage";

export const metadata: Metadata = {
  title: "Términos de uso",
  description: "Condiciones para usar Math Quest en familia.",
};

export default function TerminosPage() {
  return (
    <LegalPage title="Términos de uso">
      <section>
        <h2>1. El servicio</h2>
        <p>
          Math Quest es una aplicación de clases y práctica de matemáticas para estudiantes, administrada por una persona adulta
          desde un panel familiar. La presta <Pendiente>razón social, RUC y domicilio</Pendiente>.
        </p>
      </section>
      <section>
        <h2>2. La cuenta</h2>
        <ul>
          <li>Solo una persona mayor de edad puede crear la cuenta, y declara ser madre, padre o tutor legal de los menores que registre.</li>
          <li>Eres responsable de guardar tu contraseña y los PIN de los perfiles, y de los enlaces de acceso que compartas.</li>
          <li>Los datos se tratan según la <Link href="/privacidad" className="font-bold text-cyan-300 underline">política de privacidad</Link>.</li>
        </ul>
      </section>
      <section>
        <h2>3. Uso aceptable</h2>
        <p>
          No está permitido usar el servicio para fines ilícitos, intentar acceder a datos de otras familias, alterar su
          funcionamiento ni subir contenido que no tengas derecho a usar o que sea inapropiado para menores.
        </p>
      </section>
      <section>
        <h2>4. Contenido educativo</h2>
        <p>
          El contenido se ofrece como apoyo al aprendizaje y no sustituye la enseñanza escolar ni la evaluación de un docente. Las
          estrellas y recompensas son un acuerdo dentro de la familia y no tienen valor económico.
        </p>
      </section>
      <section>
        <h2>5. Propiedad intelectual</h2>
        <p>
          Las clases, ilustraciones, juegos y software pertenecen a <Pendiente>titular</Pendiente> o a sus licenciantes. El contenido que
          crea la familia sigue siendo suyo; nos autorizas a guardarlo y mostrarlo solo para prestarte el servicio.
        </p>
      </section>
      <section>
        <h2>6. Precio</h2>
        <p><Pendiente>gratuito, prueba, suscripción, medios de pago, renovación, cancelación y reembolsos</Pendiente></p>
      </section>
      <section>
        <h2>7. Baja</h2>
        <p>
          Puedes borrar tu cuenta cuando quieras desde Panel → Ajustes; se eliminan todos los perfiles y su actividad. Podemos
          suspender cuentas que incumplan estos términos, avisándote cuando sea posible.
        </p>
      </section>
      <section>
        <h2>8. Responsabilidad</h2>
        <p><Pendiente>límites de responsabilidad y disponibilidad conforme al Código de Protección y Defensa del Consumidor</Pendiente></p>
      </section>
      <section>
        <h2>9. Ley aplicable y contacto</h2>
        <p>
          Se rigen por las leyes de la República del Perú. Consultas y reclamos: <Pendiente>correo de soporte y enlace al Libro de
          Reclamaciones</Pendiente>.
        </p>
      </section>
    </LegalPage>
  );
}
