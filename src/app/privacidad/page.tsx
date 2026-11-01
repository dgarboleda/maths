import type { Metadata } from "next";
import { LegalPage, Pendiente } from "@/components/legal/LegalPage";

export const metadata: Metadata = {
  title: "Política de privacidad",
  description: "Qué datos guarda Math Quest, para qué, dónde y cómo ejercer tus derechos.",
};

export default function PrivacidadPage() {
  return (
    <LegalPage title="Política de privacidad">
      <section>
        <h2>1. Responsable del tratamiento</h2>
        <p>
          <Pendiente>razón social, RUC, domicilio y correo de contacto para privacidad</Pendiente>. Banco de datos inscrito ante la
          Autoridad Nacional de Protección de Datos Personales con el código <Pendiente>número de inscripción</Pendiente>.
        </p>
      </section>
      <section>
        <h2>2. Quién usa el servicio</h2>
        <p>
          La cuenta la crea una persona adulta (madre, padre o tutor legal), que registra los perfiles de los menores a su cargo y
          autoriza el tratamiento de sus datos al aceptar esta política. Los menores no crean cuentas ni dan su correo.
        </p>
      </section>
      <section>
        <h2>3. Datos que guardamos</h2>
        <ul>
          <li><strong>De la persona adulta:</strong> correo electrónico y contraseña (gestionada por el proveedor de autenticación; no la vemos).</li>
          <li><strong>De cada menor:</strong> nombre o apodo, fecha de nacimiento, avatar elegido y un PIN de 4 dígitos que se guarda cifrado (HMAC) y nunca en claro.</li>
          <li><strong>Actividad de aprendizaje:</strong> respuestas, intentos, pistas usadas, clases terminadas, racha de días, estrellas, insignias y canjes de recompensas.</li>
          <li><strong>Contenido creado por la familia:</strong> clases, niveles, mundos e imágenes que se suban.</li>
          <li><strong>Datos técnicos:</strong> informes de error sin datos personales (sin mensajes, URL, identificadores ni nombres) y la versión de la aplicación.</li>
          <li><strong>En el dispositivo:</strong> preferencias y récords de los minijuegos, guardados solo en el navegador.</li>
        </ul>
        <p>No pedimos ubicación, fotos de los menores, contactos ni datos de pago. <Pendiente>actualizar si se añade cobro o analítica</Pendiente></p>
      </section>
      <section>
        <h2>4. Para qué los usamos</h2>
        <ul>
          <li>Prestar el servicio: identificar a la familia, mostrar el avance de cada menor y adaptar la práctica.</li>
          <li>Mejorar el contenido educativo con estadísticas agregadas que no identifican a nadie.</li>
          <li>Mantener la seguridad y corregir fallos.</li>
        </ul>
        <p>No vendemos datos, no mostramos publicidad y no elaboramos perfiles comerciales de menores.</p>
      </section>
      <section>
        <h2>5. Dónde se guardan y con quién se comparten</h2>
        <p>
          Usamos proveedores que actúan como encargados del tratamiento: Google Firebase (autenticación, base de datos, funciones y
          almacenamiento) y Cloudflare (alojamiento web). Esto implica una transferencia internacional de datos a
          <Pendiente>regiones de los servidores y garantías aplicables</Pendiente>.
        </p>
      </section>
      <section>
        <h2>6. Cuánto tiempo</h2>
        <p>
          Mientras la cuenta exista. Al borrar un perfil o la cuenta, los datos se eliminan de forma inmediata y definitiva de la base de
          datos; las copias de seguridad se eliminan en <Pendiente>plazo de rotación de respaldos; 14 días con la configuración de docs/operacion.md</Pendiente>.
        </p>
      </section>
      <section>
        <h2>7. Tus derechos</h2>
        <p>
          Puedes acceder, rectificar, cancelar u oponerte al tratamiento de tus datos y los de los menores a tu cargo. Desde
          <strong> Panel → Ajustes</strong> puedes corregir perfiles, borrar un perfil o borrar toda la cuenta. Para cualquier otra
          solicitud escribe a <Pendiente>correo de privacidad</Pendiente>; respondemos en los plazos de la Ley 29733. Si no estás conforme,
          puedes reclamar ante la Autoridad Nacional de Protección de Datos Personales.
        </p>
      </section>
      <section>
        <h2>8. Seguridad</h2>
        <p>
          Las conexiones van cifradas, cada familia solo accede a sus datos, las respuestas se corrigen en el servidor y los PIN se
          guardan con un secreto que no sale del servidor.
        </p>
      </section>
      <section>
        <h2>9. Cambios</h2>
        <p>Si esta política cambia en algo importante, te pediremos aceptarla de nuevo antes de seguir usando la cuenta.</p>
      </section>
    </LegalPage>
  );
}
