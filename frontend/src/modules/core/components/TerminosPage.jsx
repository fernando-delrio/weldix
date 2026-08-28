import LegalPageLayout from './LegalPageLayout'

const Section = ({ title, children }) => (
  <section className="space-y-3">
    <h2 className="text-sm font-bold uppercase tracking-[0.14em] text-amber-400">{title}</h2>
    <div className="space-y-2 text-sm leading-relaxed text-slate-300">{children}</div>
  </section>
)

const TerminosPage = () => (
  <LegalPageLayout>
    <div className="mx-auto w-full max-w-[720px] space-y-8 pb-8">
      <div className="space-y-1">
        <p className="text-xs font-bold uppercase tracking-[0.16em] text-amber-300">Legal</p>
        <h1 className="text-3xl font-extrabold tracking-tight text-slate-100">
          Términos y Condiciones
        </h1>
        <p className="text-xs text-slate-500">Última actualización: abril 2026 · Weldix SaaS</p>
      </div>

      <Section title="1. Objeto y aceptación">
        <p>
          Los presentes Términos y Condiciones (en adelante, "los Términos") regulan el acceso y uso
          de la plataforma Weldix (en adelante, "el Servicio"), desarrollada y operada por Weldix
          SaaS.
        </p>
        <p>
          Al registrar un taller y crear una cuenta, el usuario (en adelante, "el Taller") acepta
          expresamente los presentes Términos en su totalidad. Si no está de acuerdo, debe
          abstenerse de usar el Servicio.
        </p>
      </Section>

      <Section title="2. Descripción del servicio">
        <p>
          Weldix es una aplicación web de gestión para talleres de soldadura y calderería industrial
          que permite, entre otras funcionalidades:
        </p>
        <ul className="list-inside list-disc space-y-1 pl-2">
          <li>Gestión de órdenes de trabajo (OT) y seguimiento de estado</li>
          <li>Control de stock de materiales</li>
          <li>Registro de fichajes y jornadas laborales</li>
          <li>Gestión de equipos y mantenimiento preventivo</li>
          <li>Panel de administración para gestión de operarios</li>
          <li>Asistente IA integrado para consultas sobre el taller</li>
        </ul>
      </Section>

      <Section title="3. Registro y cuenta">
        <p>
          Para acceder al Servicio, el Taller debe registrarse proporcionando un nombre de taller,
          correo electrónico y contraseña. El Taller es responsable de:
        </p>
        <ul className="list-inside list-disc space-y-1 pl-2">
          <li>Mantener la confidencialidad de sus credenciales de acceso</li>
          <li>Notificar inmediatamente cualquier uso no autorizado de su cuenta</li>
          <li>Garantizar que los datos introducidos son verídicos y están actualizados</li>
          <li>
            El uso que realicen de la plataforma los usuarios (operarios) creados bajo su cuenta
          </li>
        </ul>
        <p>
          Weldix se reserva el derecho de suspender o cancelar cuentas que incumplan estos Términos.
        </p>
      </Section>

      <Section title="4. Plan de servicio y pagos">
        <p>
          Weldix ofrece un plan de acceso inicial gratuito con funcionalidades básicas. Las
          características avanzadas pueden requerir la contratación de un plan de pago. Los detalles
          de precios y condiciones de facturación se especificarán en el momento de la suscripción.
        </p>
        <p>
          En caso de impago, Weldix podrá limitar el acceso al Servicio previa notificación con un
          mínimo de 7 días de antelación.
        </p>
      </Section>

      <Section title="5. Uso aceptable">
        <p>El Taller se compromete a usar el Servicio de forma lícita y a no:</p>
        <ul className="list-inside list-disc space-y-1 pl-2">
          <li>Intentar acceder sin autorización a sistemas o datos de otros talleres</li>
          <li>Introducir código malicioso, virus o cualquier software dañino</li>
          <li>Usar el Servicio para actividades ilegales o fraudulentas</li>
          <li>Revender, sublicenciar o transferir el acceso al Servicio a terceros</li>
          <li>Realizar ingeniería inversa o descompilar el software de Weldix</li>
        </ul>
      </Section>

      <Section title="6. Propiedad intelectual">
        <p>
          Todo el software, diseño, código fuente, logotipos y contenidos del Servicio son propiedad
          exclusiva de Weldix SaaS y están protegidos por las leyes de propiedad intelectual
          aplicables.
        </p>
        <p>
          Los datos introducidos por el Taller (trabajos, materiales, operarios, etc.) son propiedad
          del Taller. Weldix únicamente los procesa para prestar el Servicio.
        </p>
      </Section>

      <Section title="7. Disponibilidad y mantenimiento">
        <p>
          Weldix se esfuerza por ofrecer una disponibilidad del servicio del 99 %. Sin embargo, no
          garantiza la disponibilidad ininterrumpida y puede realizar paradas de mantenimiento,
          preferiblemente en horario de baja actividad, con notificación previa cuando sea posible.
        </p>
      </Section>

      <Section title="8. Limitación de responsabilidad">
        <p>
          Weldix no será responsable de daños indirectos, pérdida de beneficios o pérdida de datos
          derivados del uso o imposibilidad de uso del Servicio, salvo en casos de dolo o
          negligencia grave imputable a Weldix.
        </p>
        <p>
          El Taller es el único responsable del cumplimiento de sus obligaciones laborales (registro
          de jornada, convenio colectivo, etc.) y del uso que haga de los datos exportados o
          generados por la plataforma.
        </p>
      </Section>

      <Section title="9. Cancelación del servicio">
        <p>
          El Taller puede cancelar su cuenta en cualquier momento desde el panel de administración o
          contactando con soporte. Tras la cancelación, los datos se conservarán durante 30 días
          antes de ser eliminados de forma definitiva, salvo que la ley exija un plazo mayor.
        </p>
        <p>
          Weldix puede cancelar el Servicio con un preaviso mínimo de 30 días, salvo en casos de
          incumplimiento grave de estos Términos.
        </p>
      </Section>

      <Section title="10. Protección de datos">
        <p>
          El tratamiento de datos personales se rige por la{' '}
          <a href="/privacidad" className="text-amber-400 underline hover:text-amber-300">
            Política de Privacidad
          </a>{' '}
          de Weldix, que forma parte integrante de estos Términos.
        </p>
      </Section>

      <Section title="11. Modificación de los términos">
        <p>
          Weldix se reserva el derecho de modificar estos Términos en cualquier momento. Las
          modificaciones se notificarán con al menos 15 días de antelación mediante correo
          electrónico o aviso en la plataforma. El uso continuado del Servicio tras la entrada en
          vigor de las modificaciones implica su aceptación.
        </p>
      </Section>

      <Section title="12. Ley aplicable y jurisdicción">
        <p>
          Los presentes Términos se rigen por la legislación española. Para la resolución de
          controversias, las partes se someten a los juzgados y tribunales del domicilio del Taller,
          salvo que la ley establezca otro fuero imperativo.
        </p>
      </Section>

      <Section title="13. Contacto">
        <p>
          Para cualquier consulta sobre estos Términos, escribe a{' '}
          <a href="mailto:legal@weldix.es" className="text-amber-400 underline">
            legal@weldix.es
          </a>
          .
        </p>
      </Section>
    </div>
  </LegalPageLayout>
)

export default TerminosPage
