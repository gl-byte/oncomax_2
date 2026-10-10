/* ============================================================
   OncoMax - Formulario de reserva en tres pasos.
   1. Servicio  2. Fecha y turno  3. Datos de contacto.
   Al enviar arma un mensaje con la solicitud y abre WhatsApp con
   la clinica, listo para mandar. La fecha no puede ser pasada ni
   caer en fin de semana (la clinica atiende de lunes a viernes).
   Sin JavaScript se ven los tres pasos juntos y el formulario
   lleva a #enviado, que muestra el numero de WhatsApp.
   ============================================================ */

(function () {
  const WHATSAPP_CLINICA = '59164556725';

  const form = document.getElementById('form-reserva');
  if (!form) return;

  // La validacion la hace este archivo, paso por paso.
  form.noValidate = true;

  const etapas = [...form.querySelectorAll('.etapa')];
  const marcas = [...form.querySelectorAll('.progreso-pasos li')];
  const botonAnterior = form.querySelector('[data-anterior]');
  const botonSiguiente = form.querySelector('[data-siguiente]');
  const campoFecha = form.elements.fecha;
  const aviso = document.getElementById('enviado');
  let actual = 0;

  /* ---------- Fecha: desde hoy y solo de lunes a viernes ---------- */
  // Fecha local en formato AAAA-MM-DD (toISOString usaria la hora UTC).
  function hoyISO() {
    const d = new Date();
    const mes = String(d.getMonth() + 1).padStart(2, '0');
    const dia = String(d.getDate()).padStart(2, '0');
    return `${d.getFullYear()}-${mes}-${dia}`;
  }

  // "2026-10-12" -> Date local (new Date("2026-10-12") la tomaria en UTC).
  function leerFecha(valor) {
    const [a, m, d] = valor.split('-').map(Number);
    return new Date(a, m - 1, d);
  }

  campoFecha.min = hoyISO();

  function validarFecha() {
    campoFecha.setCustomValidity('');
    if (!campoFecha.value) return;
    if (campoFecha.value < campoFecha.min) {
      campoFecha.setCustomValidity('Elige una fecha a partir de hoy.');
      return;
    }
    const diaSemana = leerFecha(campoFecha.value).getDay();
    if (diaSemana === 0 || diaSemana === 6) {
      campoFecha.setCustomValidity('Atendemos de lunes a viernes. Elige otro día.');
    }
  }
  campoFecha.addEventListener('input', validarFecha);
  campoFecha.addEventListener('change', validarFecha);

  /* ---------- Pasos ---------- */
  function irA(numero, enfocar) {
    actual = numero;
    etapas.forEach((etapa, i) => etapa.classList.toggle('actual', i === numero));
    marcas.forEach((marca, i) => {
      marca.classList.toggle('hecho', i < numero);
      marca.classList.toggle('actual', i === numero);
      if (i === numero) marca.setAttribute('aria-current', 'step');
      else marca.removeAttribute('aria-current');
    });
    form.classList.toggle('primero', numero === 0);
    form.classList.toggle('ultimo', numero === etapas.length - 1);

    if (enfocar) {
      const arriba = form.getBoundingClientRect().top;
      if (arriba < 0) form.scrollIntoView({ behavior: 'smooth', block: 'start' });
      const primerCampo = etapas[numero].querySelector('input, textarea');
      if (primerCampo) primerCampo.focus({ preventScroll: true });
    }
  }

  // Devuelve el primer campo invalido de un paso (o null si esta completo).
  function primerInvalido(etapa) {
    validarFecha();
    return [...etapa.elements].find((campo) => campo.willValidate && !campo.checkValidity()) || null;
  }

  botonSiguiente.addEventListener('click', () => {
    const invalido = primerInvalido(etapas[actual]);
    if (invalido) { invalido.reportValidity(); return; }
    irA(actual + 1, true);
  });
  botonAnterior.addEventListener('click', () => irA(actual - 1, true));

  /* ---------- Mensaje para WhatsApp ---------- */
  function fechaLegible(valor) {
    const texto = leerFecha(valor).toLocaleDateString('es-BO', {
      weekday: 'long', day: 'numeric', month: 'long', year: 'numeric'
    });
    return texto.charAt(0).toUpperCase() + texto.slice(1);
  }

  function armarMensaje() {
    const datos = new FormData(form);
    const lineas = [
      'Hola OncoMax, quiero solicitar una cita.',
      '',
      `*Nombre:* ${datos.get('nombre').trim()}`,
      `*Teléfono:* ${datos.get('telefono').trim()}`,
      `*Servicio:* ${datos.get('servicio')}`,
      `*La cita es:* ${datos.get('paciente')}`,
      `*Fecha preferida:* ${fechaLegible(datos.get('fecha'))}`,
      `*Turno:* ${datos.get('turno')}`,
      `*Confirmar por:* ${datos.get('contacto')}`
    ];
    const mensaje = datos.get('mensaje').trim();
    if (mensaje) lineas.push(`*Motivo:* ${mensaje}`);
    return lineas.join('\n');
  }

  /* ---------- Envio ---------- */
  form.addEventListener('submit', (evento) => {
    evento.preventDefault();

    // Enter en un paso intermedio avanza en lugar de enviar.
    if (actual < etapas.length - 1) { botonSiguiente.click(); return; }

    // Si algun paso quedo incompleto, se vuelve a ese paso.
    for (let i = 0; i < etapas.length; i++) {
      const invalido = primerInvalido(etapas[i]);
      if (invalido) {
        irA(i, false);
        invalido.reportValidity();
        return;
      }
    }

    const enlace = `https://wa.me/${WHATSAPP_CLINICA}?text=${encodeURIComponent(armarMensaje())}`;

    // Se abre en otra pestaña; si el navegador lo bloquea, se abre en esta.
    // (Con 'noopener' window.open siempre devuelve null, por eso se corta a mano.)
    const ventana = window.open(enlace, '_blank');
    if (ventana) ventana.opener = null;
    else window.location.href = enlace;

    aviso.innerHTML =
      '<span>¡Listo! Tu solicitud se abrió en WhatsApp. Presiona <b>Enviar</b> en el chat ' +
      'para que la clínica la reciba. <a target="_blank" rel="noopener">Abrir WhatsApp de nuevo</a></span>';
    aviso.querySelector('a').href = enlace;
    aviso.classList.add('envio--visible');
    aviso.focus({ preventScroll: true });
    aviso.scrollIntoView({ behavior: 'smooth', block: 'center' });
  });

  irA(0, false);
})();
