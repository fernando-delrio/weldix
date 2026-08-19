import AppShell from './AppShell'

const Section = ({ title, children }) => (
  <section className="space-y-3">
    <h2 className="text-sm font-bold uppercase tracking-[0.14em] text-amber-400">{title}</h2>
    <div className="space-y-2 text-sm leading-relaxed text-slate-300">{children}</div>
  </section>
)

const PrivacidadPage = () => (
  <AppShell>
    <div className="mx-auto w-full max-w-[720px] space-y-8 pb-8">
      <div className="space-y-1">
        <p className="text-xs font-bold uppercase tracking-[0.16em] text-amber-300">Legal</p>
        <h1 className="text-3xl font-extrabold tracking-tight text-slate-100">
          Política de Privacidad
        </h1>
        <p className="text-xs text-slate-500">
          Última actualización: abril 2026 · Responsable: Weldix SaaS
        </p>
      </div>

      <Section title="1. Responsable del tratamiento">
        <p>
          El responsable del tratamiento de los datos personales recogidos a través de Weldix es la
          empresa o autónomo que contrata el servicio (en adelante, el Taller). Weldix actúa como
          encargado del tratamiento conforme al art. 28 del RGPD.
        </p>
      </Section>

      <Section title="2. Datos que recogemos">
        <p>Recogemos únicamente los datos necesarios para prestar el servicio:</p>
        <ul className="list-inside list-disc space-y-1 pl-2">
          <li>Nombre completo y correo electrónico de los usuarios</li>
          <li>Registros de fichaje (hora de entrada y salida)</li>
          <li>Información sobre órdenes de trabajo y materiales del taller</li>
          <li>Fotografías adjuntas a las órdenes de trabajo</li>
          <li>Solicitudes de ausencia y datos laborales básicos</li>
        </ul>
        <p>No recogemos datos de categorías especiales (salud, biometría, ideología, etc.).</p>
      </Section>

      <Section title="3. Base legal del tratamiento">
        <p>
          El tratamiento se basa en la ejecución del contrato de servicio (art. 6.1.b RGPD) y en el
          cumplimiento de obligaciones legales laborales (art. 6.1.c RGPD) cuando el Taller así lo
          requiera.
        </p>
      </Section>

      <Section title="4. Plazo de conservación">
        <p>
          Los datos se conservan durante la vigencia del contrato y, una vez rescindido, durante los
          plazos exigidos por la legislación aplicable (mínimo 4 años para datos laborales, conforme
          al art. 21 LISOS).
        </p>
      </Section>

      <Section title="5. Tus derechos (RGPD)">
        <p>
          Como interesado, puedes ejercer los siguientes derechos contactando al administrador de tu
          taller:
        </p>
        <ul className="list-inside list-disc space-y-1 pl-2">
          <li>
            <strong className="text-slate-200">Acceso:</strong> obtener confirmación y copia de tus
            datos
          </li>
          <li>
            <strong className="text-slate-200">Rectificación:</strong> corregir datos inexactos
          </li>
          <li>
            <strong className="text-slate-200">Supresión:</strong> solicitar el borrado cuando no
            sean necesarios
          </li>
          <li>
            <strong className="text-slate-200">Portabilidad:</strong> recibir tus datos en formato
            estructurado
          </li>
          <li>
            <strong className="text-slate-200">Oposición/limitación:</strong> restringir ciertos
            tratamientos
          </li>
        </ul>
        <p>También puedes presentar reclamación ante la AEPD (aepd.es).</p>
      </Section>

      <Section title="6. Seguridad">
        <p>
          Aplicamos medidas técnicas y organizativas adecuadas: cifrado de contraseñas
          (pbkdf2_sha256), transporte por HTTPS, autenticación JWT con caducidad, y aislamiento de
          datos por taller (multi-tenancy).
        </p>
      </Section>

      <Section title="7. Transferencias internacionales">
        <p>
          Los datos se alojan en servidores dentro del Espacio Económico Europeo. Si en el futuro se
          usaran proveedores fuera del EEE, se garantizarán las salvaguardas adecuadas (cláusulas
          contractuales tipo de la Comisión Europea).
        </p>
      </Section>

      <Section title="8. Contacto">
        <p>
          Para cualquier consulta sobre privacidad, contacta a través del correo indicado en el
          panel de administración de tu taller o escribe a{' '}
          <a href="mailto:privacidad@weldix.es" className="text-amber-400 underline">
            privacidad@weldix.es
          </a>
          .
        </p>
      </Section>
    </div>
  </AppShell>
)

export default PrivacidadPage
