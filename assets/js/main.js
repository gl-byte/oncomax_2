/* ============================================================
   OncoMax - Interacciones del sitio.
   Todo es progresivo: si este archivo no carga, el contenido se
   ve completo y quieto (las reglas "html:not(.js)" del CSS).
   Respeta la preferencia de "reducir movimiento" del sistema.
   ============================================================ */

(function () {
  const menosMovimiento = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  // Agrupa muchos eventos de scroll en uno solo por cuadro de animacion.
  function alDesplazar(funcion) {
    let pendiente = false;
    const ejecutar = () => { pendiente = false; funcion(); };
    window.addEventListener('scroll', () => {
      if (!pendiente) { pendiente = true; requestAnimationFrame(ejecutar); }
    }, { passive: true });
    window.addEventListener('resize', ejecutar);
    ejecutar();
  }

  /* ---------- 1. Cabecera: solida al bajar, se oculta y vuelve ---------- */
  const barra = document.querySelector('.barra');
  if (barra) {
    let ultimoY = window.scrollY;
    alDesplazar(() => {
      const y = window.scrollY;
      barra.classList.toggle('barra--solida', y > 30);
      if (!document.body.classList.contains('menu-abierto')) {
        barra.classList.toggle('barra--oculta', y > ultimoY && y > 500);
      }
      ultimoY = y;
    });
    barra.addEventListener('focusin', () => barra.classList.remove('barra--oculta'));
  }

  /* ---------- 2. Menu lateral en pantallas medianas y chicas ---------- */
  const botonMenu = document.querySelector('.barra__menu');
  const menu = document.getElementById('menu');
  const velo = document.querySelector('.velo');
  if (botonMenu && menu) {
    menu.querySelectorAll('a').forEach((enlace, i) => enlace.style.setProperty('--i', i));

    const abrirMenu = (abrir) => {
      document.body.classList.toggle('menu-abierto', abrir);
      botonMenu.setAttribute('aria-expanded', String(abrir));
      botonMenu.querySelector('.sr-solo').textContent = abrir ? 'Cerrar menú' : 'Abrir menú';
      if (abrir) setTimeout(() => menu.querySelector('a').focus({ preventScroll: true }), 300);
    };
    botonMenu.addEventListener('click', () => abrirMenu(!document.body.classList.contains('menu-abierto')));
    velo && velo.addEventListener('click', () => abrirMenu(false));
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && document.body.classList.contains('menu-abierto')) {
        abrirMenu(false);
        botonMenu.focus();
      }
    });
    window.matchMedia('(min-width: 1081px)').addEventListener('change', (e) => { if (e.matches) abrirMenu(false); });
  }

  /* ---------- 3. Titulares palabra por palabra ----------
     Envuelve cada palabra en dos span: el de afuera recorta y el de
     adentro sube. Conserva las etiquetas internas (como <em>). */
  document.querySelectorAll('[data-dividir]').forEach((titulo) => {
    let n = 0;
    (function recorrer(nodo) {
      [...nodo.childNodes].forEach((hijo) => {
        if (hijo.nodeType === Node.TEXT_NODE) {
          const fragmento = document.createDocumentFragment();
          hijo.textContent.split(/(\s+)/).forEach((trozo) => {
            if (!trozo) return;
            if (/^\s+$/.test(trozo)) { fragmento.append(' '); return; }
            const caja = document.createElement('span');
            const palabra = document.createElement('span');
            caja.className = 'palabra';
            palabra.textContent = trozo;
            palabra.style.setProperty('--p', n++);
            caja.append(palabra);
            fragmento.append(caja);
          });
          hijo.replaceWith(fragmento);
        } else if (hijo.nodeType === Node.ELEMENT_NODE) {
          recorrer(hijo);
        }
      });
    })(titulo);
  });

  /* ---------- 4. Apariciones al llegar a la pantalla ---------- */
  // Los hijos de [data-escalonar] aparecen uno tras otro.
  document.querySelectorAll('[data-escalonar]').forEach((grupo) => {
    [...grupo.children].forEach((hijo, i) => {
      if (!hijo.hasAttribute('data-aparecer')) hijo.setAttribute('data-aparecer', '');
      hijo.style.setProperty('--i', i);
    });
  });
  document.querySelectorAll('.pasos').forEach((pasos) => {
    [...pasos.children].forEach((paso, i) => paso.style.setProperty('--i', i));
  });

  // Lo que esta en la portada aparece al cargar, sin esperar al scroll
  // (en pantallas bajas el boton principal podria quedar fuera del margen).
  const portada = document.querySelector('.inicio, .portada');
  const enPortada = portada ? [...portada.querySelectorAll('[data-aparecer], [data-dividir]')] : [];
  requestAnimationFrame(() => requestAnimationFrame(() => enPortada.forEach((el) => el.classList.add('visible'))));

  const aparecen = [...document.querySelectorAll('[data-aparecer], [data-dividir], .pasos')].filter((el) => !enPortada.includes(el));
  if ('IntersectionObserver' in window && !menosMovimiento) {
    // Las imagenes empiezan recortadas al 100% (clip-path) y el navegador no
    // las considera visibles; por eso se observa su contenedor.
    const destinos = new Map();
    const observador = new IntersectionObserver((entradas) => {
      entradas.forEach((entrada) => {
        if (entrada.isIntersecting) {
          destinos.get(entrada.target).forEach((el) => el.classList.add('visible'));
          observador.unobserve(entrada.target);
        }
      });
    }, { rootMargin: '0px 0px -8% 0px', threshold: 0.12 });
    aparecen.forEach((el) => {
      const vigilado = el.matches('[data-aparecer="imagen"]') ? el.parentElement : el;
      if (!destinos.has(vigilado)) destinos.set(vigilado, []);
      destinos.get(vigilado).push(el);
      observador.observe(vigilado);
    });
  } else {
    aparecen.forEach((el) => el.classList.add('visible'));
  }

  /* ---------- 5. Contadores ---------- */
  document.querySelectorAll('[data-contar]').forEach((cifra) => {
    if (menosMovimiento || !('IntersectionObserver' in window)) return;   // El HTML ya trae el valor final.
    const fin = Number(cifra.dataset.contar);
    const desde = Number(cifra.dataset.desde || 0);
    const antes = cifra.dataset.antes || '';
    const despues = cifra.dataset.despues || '';
    const escribir = (valor) => { cifra.textContent = antes + valor + despues; };
    escribir(desde);

    const observador = new IntersectionObserver(([entrada]) => {
      if (!entrada.isIntersecting) return;
      observador.disconnect();
      const inicio = performance.now();
      const duracion = 1800;
      (function cuadro(ahora) {
        const avance = Math.min(1, (ahora - inicio) / duracion);
        const suave = 1 - Math.pow(1 - avance, 4);
        escribir(Math.round(desde + (fin - desde) * suave));
        if (avance < 1) requestAnimationFrame(cuadro);
      })(inicio);
    }, { threshold: 0.6 });
    observador.observe(cifra);
  });

  /* ---------- 6. Paralaje suave ---------- */
  const paralaje = [...document.querySelectorAll('[data-paralaje]')];
  if (paralaje.length && !menosMovimiento) {
    alDesplazar(() => {
      const alto = window.innerHeight;
      paralaje.forEach((el) => {
        const r = el.getBoundingClientRect();
        if (r.bottom < 0 || r.top > alto) return;
        const desvio = (r.top + r.height / 2 - alto / 2) / alto;
        el.style.transform = `translate3d(0, ${(desvio * -Number(el.dataset.paralaje || 40)).toFixed(1)}px, 0)`;
      });
    });
  }

  /* ---------- 7. Indice con foto que sigue al cursor ---------- */
  const indice = document.querySelector('.indice');
  const vista = document.querySelector('.vista-previa');
  if (indice && vista && window.matchMedia('(hover: hover) and (pointer: fine)').matches) {
    const foto = vista.querySelector('img');
    let x = 0, y = 0, vx = 0, vy = 0, sobre = false, animando = false;

    const mover = () => {
      vx += (x - vx) * 0.14;
      vy += (y - vy) * 0.14;
      const giro = Math.max(-8, Math.min(8, (x - vx) * 0.05));
      vista.style.transform = `translate3d(${vx + 30}px, ${vy - 150}px, 0) rotate(${giro}deg)`;
      if (sobre || Math.abs(x - vx) > 0.5 || Math.abs(y - vy) > 0.5) requestAnimationFrame(mover);
      else animando = false;
    };

    indice.querySelectorAll('[data-imagen]').forEach((fila) => {
      new Image().src = fila.dataset.imagen;          // Precarga.
      fila.addEventListener('mouseenter', (e) => {
        foto.src = fila.dataset.imagen;
        foto.setAttribute('style', fila.dataset.encuadre || '');
        vista.classList.add('activa');
        sobre = true;
        if (!animando) { animando = true; vx = x = e.clientX; vy = y = e.clientY; requestAnimationFrame(mover); }
      });
      fila.addEventListener('mouseleave', () => { vista.classList.remove('activa'); sobre = false; });
    });
    indice.addEventListener('mousemove', (e) => { x = e.clientX; y = e.clientY; });
  }

  /* ---------- 8. Dialogos ---------- */
  const abrirDialogo = (dialogo) => { if (dialogo && typeof dialogo.showModal === 'function') dialogo.showModal(); };
  document.querySelectorAll('dialog').forEach((dialogo) => {
    dialogo.addEventListener('click', (e) => { if (e.target === dialogo) dialogo.close(); });   // Clic fuera.
    dialogo.querySelectorAll('[data-cerrar]').forEach((b) => b.addEventListener('click', () => dialogo.close()));
  });

  // Video de la portada.
  const dialogoVideo = document.getElementById('dialogo-video');
  if (dialogoVideo) {
    const video = dialogoVideo.querySelector('video');
    document.querySelectorAll('[data-abrir-video]').forEach((boton) => boton.addEventListener('click', (e) => {
      e.preventDefault();
      abrirDialogo(dialogoVideo);
      video.play().catch(() => {});
    }));
    dialogoVideo.addEventListener('close', () => video.pause());
  }

  // Biografias del equipo: el contenido sale de la propia tarjeta.
  const dialogoBio = document.getElementById('dialogo-bio');
  if (dialogoBio) {
    document.querySelectorAll('[data-bio]').forEach((boton) => boton.addEventListener('click', () => {
      const miembro = boton.closest('.miembro');
      const foto = miembro.querySelector('img').cloneNode();
      foto.removeAttribute('loading');
      dialogoBio.querySelector('.foto').replaceChildren(foto);
      dialogoBio.querySelector('[data-bio-rol]').textContent = miembro.querySelector('.miembro__rol').textContent;
      dialogoBio.querySelector('[data-bio-nombre]').textContent = miembro.querySelector('.miembro__nombre').textContent;
      dialogoBio.querySelector('[data-bio-texto]').replaceChildren(...miembro.querySelector('.miembro__bio').cloneNode(true).childNodes);
      abrirDialogo(dialogoBio);
    }));
  }

  // Visor de la galeria, con flechas y teclado.
  const visor = document.getElementById('dialogo-visor');
  if (visor) {
    const items = [...document.querySelectorAll('.galeria__item')];
    const grande = visor.querySelector('img');
    let actual = 0;
    const mostrar = (i) => {
      actual = (i + items.length) % items.length;
      const original = items[actual].querySelector('img');
      grande.src = original.src;
      grande.alt = original.alt;
      visor.querySelector('figcaption').textContent = items[actual].querySelector('figcaption').textContent;
    };
    items.forEach((item, i) => item.querySelector('.galeria__boton').addEventListener('click', (e) => {
      e.preventDefault();
      mostrar(i);
      abrirDialogo(visor);
    }));
    visor.querySelector('[data-anterior]').addEventListener('click', () => mostrar(actual - 1));
    visor.querySelector('[data-siguiente]').addEventListener('click', () => mostrar(actual + 1));
    visor.addEventListener('keydown', (e) => {
      if (e.key === 'ArrowLeft') mostrar(actual - 1);
      if (e.key === 'ArrowRight') mostrar(actual + 1);
    });
  }

  /* ---------- 9. Servicios que se apilan ---------- */
  const servicios = [...document.querySelectorAll('.servicio')];
  if (servicios.length > 1 && !menosMovimiento) {
    const escritorio = window.matchMedia('(min-width: 1081px)');
    alDesplazar(() => {
      servicios.forEach((tarjeta, i) => {
        const siguiente = servicios[i + 1];
        if (!escritorio.matches || !siguiente) {
          tarjeta.style.removeProperty('--escala');
          tarjeta.style.removeProperty('--brillo');
          return;
        }
        const r = tarjeta.getBoundingClientRect();
        const distancia = siguiente.getBoundingClientRect().top - r.top;
        const cubierto = Math.min(1, Math.max(0, 1 - distancia / r.height));
        tarjeta.style.setProperty('--escala', (1 - cubierto * 0.06).toFixed(4));
        tarjeta.style.setProperty('--brillo', (1 - cubierto * 0.1).toFixed(3));
      });
    });
  }

  /* ---------- 10. Pestañas (especialistas y mensajes de apoyo) ---------- */
  document.querySelectorAll('[data-pestanas]').forEach((grupo) => {
    const pestanas = [...grupo.querySelectorAll('[role="tab"]')];
    const paneles = pestanas.map((p) => document.getElementById(p.getAttribute('aria-controls')));
    const elegir = (indice, enfocar) => {
      pestanas.forEach((p, i) => {
        const elegida = i === indice;
        p.setAttribute('aria-selected', String(elegida));
        p.tabIndex = elegida ? 0 : -1;
        paneles[i].hidden = !elegida;
      });
      if (enfocar) pestanas[indice].focus();
    };
    pestanas.forEach((p, i) => {
      p.addEventListener('click', () => elegir(i));
      p.addEventListener('keydown', (e) => {
        const total = pestanas.length;
        const destino = { ArrowRight: i + 1, ArrowDown: i + 1, ArrowLeft: i - 1, ArrowUp: i - 1, Home: 0, End: total - 1 }[e.key];
        if (destino === undefined) return;
        e.preventDefault();
        elegir((destino + total) % total, true);
      });
    });
    elegir(Math.max(0, pestanas.findIndex((p) => p.getAttribute('aria-selected') === 'true')));
  });

  /* ---------- 11. Filtro del equipo ---------- */
  const filtros = [...document.querySelectorAll('[data-filtro]')];
  filtros.forEach((boton) => boton.addEventListener('click', () => {
    filtros.forEach((b) => b.setAttribute('aria-pressed', String(b === boton)));
    const grupo = boton.dataset.filtro;
    document.querySelectorAll('.miembro').forEach((miembro) => {
      const mostrar = grupo === 'todos' || miembro.dataset.grupo === grupo;
      if (mostrar) {
        miembro.hidden = false;
        requestAnimationFrame(() => requestAnimationFrame(() => miembro.classList.remove('miembro--fuera')));
      } else {
        miembro.classList.add('miembro--fuera');
        setTimeout(() => { if (miembro.classList.contains('miembro--fuera')) miembro.hidden = true; }, menosMovimiento ? 0 : 450);
      }
    });
  }));

  /* ---------- 12. Mitos y realidades ---------- */
  document.querySelectorAll('.mito').forEach((mito) => {
    const botones = mito.querySelectorAll('.mito__interruptor button');
    const caras = { mito: mito.querySelector('.mito__cara--mito'), realidad: mito.querySelector('.mito__cara--realidad') };
    const mostrar = (lado) => {
      mito.dataset.lado = lado;
      caras.mito.hidden = lado !== 'mito';
      caras.realidad.hidden = lado !== 'realidad';
      botones.forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.lado === lado)));
    };
    botones.forEach((boton) => boton.addEventListener('click', () => mostrar(boton.dataset.lado)));
    mostrar(mito.dataset.lado || 'mito');
  });

  /* ---------- 13. Cuestionario paso a paso ---------- */
  const quiz = document.querySelector('[data-quiz]');
  if (quiz) {
    const preguntas = [...quiz.querySelectorAll('.pregunta')];
    const siguiente = quiz.querySelector('[data-siguiente]');
    const numero = quiz.querySelector('[data-numero]');
    const barraQuiz = quiz.querySelector('.quiz__barra');
    const cabeza = quiz.querySelector('.quiz__cabeza');
    const pie = quiz.querySelector('.quiz__pie');
    const resultado = quiz.querySelector('.quiz__resultado');
    let actual = 0;

    const avance = (n) => barraQuiz.style.setProperty('--avance', `${(n / preguntas.length) * 100}%`);
    const mostrar = (n) => {
      actual = n;
      preguntas.forEach((p, i) => p.classList.toggle('actual', i === n));
      numero.textContent = n + 1;
      avance(n);
      siguiente.disabled = !preguntas[n].querySelector('.op:checked');
      siguiente.querySelector('.btn__texto').textContent = n === preguntas.length - 1 ? 'Ver resultado' : 'Siguiente';
    };

    // Al responder se bloquea la pregunta y se muestra la explicacion (CSS).
    preguntas.forEach((pregunta) => pregunta.addEventListener('change', () => {
      pregunta.querySelectorAll('.op').forEach((op) => { op.disabled = true; });
      siguiente.disabled = false;
      avance(actual + 1);
      siguiente.focus({ preventScroll: true });
    }));

    siguiente.addEventListener('click', () => {
      if (actual < preguntas.length - 1) {
        mostrar(actual + 1);
        preguntas[actual].querySelector('.op').focus({ preventScroll: true });
        return;
      }
      const aciertos = quiz.querySelectorAll('.op--bien:checked').length;
      preguntas.forEach((p) => p.classList.remove('actual'));
      cabeza.hidden = true;
      pie.hidden = true;
      resultado.hidden = false;
      resultado.querySelector('[data-puntaje]').textContent = aciertos;
      resultado.querySelector('[data-mensaje]').textContent =
        aciertos === preguntas.length ? '¡Perfecto, respondiste todo bien!'
          : aciertos >= 3 ? 'Muy bien. Repasa los mitos y las señales de esta página para completar lo aprendido.'
            : 'Te recomendamos repasar los mitos y las señales de esta página.';
      resultado.focus({ preventScroll: true });
    });

    quiz.querySelector('[data-reiniciar]').addEventListener('click', () => {
      quiz.querySelectorAll('.op').forEach((op) => { op.checked = false; op.disabled = false; });
      resultado.hidden = true;
      cabeza.hidden = false;
      pie.hidden = false;
      mostrar(0);
    });

    mostrar(0);
  }

  /* ---------- 14. Historia: la linea avanza con el scroll ---------- */
  const historia = document.querySelector('.historia');
  if (historia) {
    const hitos = [...historia.querySelectorAll('.hito')];
    alDesplazar(() => {
      const r = historia.getBoundingClientRect();
      const alto = window.innerHeight;
      const avance = Math.min(1, Math.max(0, (alto * 0.85 - r.top) / (r.height + alto * 0.25)));
      historia.style.setProperty('--progreso', avance.toFixed(3));
      hitos.forEach((hito, i) => hito.classList.toggle('activo', avance >= i / hitos.length + 0.02));
    });
  }
})();
