// --- 1. SELECCIÓN DE ELEMENTOS DEL DOM ---
const pantallaInicio = document.getElementById('pantalla-inicio');
const pantallaReproductor = document.getElementById('pantalla-reproductor');
const gridSeries = document.getElementById('grid-series');
const btnVolverInicio = document.getElementById('btn-volver-inicio');

const reproductor = document.getElementById('reproductor');
const btnSkipIntro = document.getElementById('btn-skip-intro');
const btnSkipEnding = document.getElementById('btn-skip-ending');
const btnAbrirLista = document.getElementById('btn-abrir-lista');
const btnCerrarModal = document.getElementById('btn-cerrar-modal');
const modalEpisodios = document.getElementById('modal-episodios');
const listaVideos = document.getElementById('lista-videos');
const tituloModal = document.querySelector('.modal-contenido h2');

const pantallaTransicion = document.getElementById('pantalla-transicion');
const btnPrevVideo = document.getElementById('btn-prev-video');
const btnRetroceder10 = document.getElementById('btn-retroceder-10');
const btnAdelantar10 = document.getElementById('btn-adelantar-10');
const btnNextVideo = document.getElementById('btn-next-video');

const infoPausa = document.getElementById('info-pausa');
const pausaSerie = document.getElementById('pausa-serie');
const pausaCapitulo = document.getElementById('pausa-capitulo');

const btnPlayPause = document.getElementById('btn-play-pause');
const barraProgreso = document.getElementById('barra-progreso');
const barraProgresoContenedor = document.getElementById('barra-progreso-contenedor');
const tiempoTexto = document.getElementById('tiempo-texto');
const btnFullscreen = document.getElementById('btn-fullscreen');
const controlesVideo = document.getElementById('controles-video'); // Seleccionamos la barra completa

const loader = document.getElementById('loader');
const indicadorRetroceder = document.getElementById('indicador-retroceder');
const indicadorAdelantar = document.getElementById('indicador-adelantar');

const selectTemporada = document.getElementById('select-temporada');

let catalogo = [];
let serieActivaIndex = 0;
let episodioActivoIndex = 0;
let mostrandoSeries = false;

// --- 2. INICIALIZACIÓN ---
async function inicializar() {
  try {
    const respuesta = await fetch('./js/data.json');
    catalogo = await respuesta.json();
    renderizarInicio(); // Mostrar portadas al abrir la app
  } catch (error) {
    console.error("Error cargando el JSON.", error);
  }
}

// --- 3. LÓGICA DE LA PANTALLA DE INICIO ---
function renderizarInicio() {
  gridSeries.innerHTML = ''; // Limpiar grilla

  catalogo.forEach((serie, index) => {
    const tarjeta = document.createElement('div');
    tarjeta.classList.add('tarjeta-serie');

    // Asignar imagen
    tarjeta.innerHTML = `
            <img src="${serie.portada}" alt="${serie.nombreSerie}" onerror="this.src='https://via.placeholder.com/220x320?text=Sin+Portada'">
            <h3>${serie.nombreSerie}</h3>
        `;

    // Al hacer clic en la portada, abrimos esa serie
    tarjeta.addEventListener('click', () => {
      abrirSerie(index);
    });

    gridSeries.appendChild(tarjeta);
  });
}

function abrirSerie(sIndex) {
  pantallaInicio.classList.add('oculto');
  pantallaReproductor.classList.remove('oculto');

  // Buscar si ya habíamos empezado a ver esta serie antes
  const epGuardado = localStorage.getItem(`ep_activo_serie_${sIndex}`);
  let eIndex = epGuardado !== null ? parseInt(epGuardado) : 0;

  // --- NUEVA LÍNEA DE SEGURIDAD ---
  // Si el número guardado es mayor a los episodios que realmente existen, lo reiniciamos a 0
  if (eIndex >= catalogo[sIndex].episodios.length) {
    eIndex = 0;
  }

  cargarVideo(sIndex, eIndex);
  reproductor.play();
}

// Botón para salir del video y volver a las portadas
btnVolverInicio.addEventListener('click', () => {
  // NUEVO: Verificamos si estamos en pantalla completa y nos salimos
  if (document.fullscreenElement) {
    document.exitFullscreen().catch(err => console.log("Error al salir de pantalla completa:", err));
  }

  reproductor.pause(); // Detenemos el video actual
  pantallaReproductor.classList.add('oculto'); // Ocultamos el reproductor
  pantallaInicio.classList.remove('oculto'); // Mostramos la grilla de series
});

// --- 4. LÓGICA DEL REPRODUCTOR ---
function cargarVideo(sIndex, eIndex, iniciarDesdeCero = false) {
  serieActivaIndex = sIndex;
  episodioActivoIndex = eIndex;
  const episodioActual = catalogo[sIndex].episodios[eIndex];

  pausaSerie.textContent = catalogo[sIndex].nombreSerie;
  pausaCapitulo.textContent = episodioActual.titulo;

  // Actualizamos la memoria de qué capítulo general vamos
  localStorage.setItem(`ep_activo_serie_${sIndex}`, eIndex);

  // Le pasamos el enlace al reproductor
  reproductor.src = episodioActual.url;

  // Esperamos a que el video reconozca su propia duración y metadata
  reproductor.onloadedmetadata = () => {
    if (iniciarDesdeCero) {
      // Si el interruptor está encendido (venimos del menú), forzamos a 0
      reproductor.currentTime = 0;
      localStorage.setItem(`tiempo_${episodioActual.idVideo}`, 0);
    } else {
      // Si está apagado (venimos del Home), rescatamos el progreso
      const tiempoGuardado = localStorage.getItem(`tiempo_${episodioActual.idVideo}`);
      if (tiempoGuardado && parseFloat(tiempoGuardado) > 0) {
        reproductor.currentTime = parseFloat(tiempoGuardado);
      }
    }

    // Apagar botón 'Anterior' si es el primer capítulo
    if (eIndex === 0) {
      btnPrevVideo.style.opacity = '0.3';
      btnPrevVideo.style.pointerEvents = 'none'; // Desactiva los clics
    } else {
      btnPrevVideo.style.opacity = '1';
      btnPrevVideo.style.pointerEvents = 'auto'; // Vuelve a activar los clics
    }
  };

  if (!mostrandoSeries && !modalEpisodios.classList.contains('oculto')) {
    renderizarEpisodios(sIndex);
  }
}

// --- ACTUALIZACIÓN DE TIEMPO NORMAL, AUTOGUARDADO Y BOTONES ---
reproductor.addEventListener('timeupdate', () => {
  // 1. Si no hay catálogo o estamos arrastrando la barra a mano, pausamos esta función
  if (catalogo.length === 0 || arrastrandoBarra || isNaN(reproductor.duration)) return;

  const episodioActual = catalogo[serieActivaIndex].episodios[episodioActivoIndex];
  const tiempoActual = reproductor.currentTime;

  // 2. ¡EL AUTOGUARDADO REGRESA! Salvamos el minuto exacto en la memoria local
  localStorage.setItem(`tiempo_${episodioActual.idVideo}`, tiempoActual);

  // 3. Movemos la barra roja visualmente
  const porcentaje = (tiempoActual / reproductor.duration) * 100;
  barraProgreso.style.width = `${porcentaje}%`;
  tiempoTexto.textContent = `${formatearTiempo(tiempoActual)} / ${formatearTiempo(reproductor.duration)}`;

  // 4. Lógica para mostrar "Omitir Intro"
  if (tiempoActual >= episodioActual.introInicio && tiempoActual <= episodioActual.introFin) {
    btnSkipIntro.classList.remove('oculto');
  } else {
    btnSkipIntro.classList.add('oculto');
  }

  // 5. Lógica para mostrar "Siguiente Episodio" (Ending)
  if (tiempoActual >= episodioActual.endingInicio && tiempoActual <= episodioActual.endingFin) {
    btnSkipEnding.classList.remove('oculto');
  } else {
    btnSkipEnding.classList.add('oculto');
  }
});

btnSkipIntro.addEventListener('click', () => {
  reproductor.currentTime = catalogo[serieActivaIndex].episodios[episodioActivoIndex].introFin;
});

btnSkipEnding.addEventListener('click', reproducirSiguiente);
reproductor.addEventListener('ended', reproducirSiguiente);

function reproducirSiguiente() {
  const serieActual = catalogo[serieActivaIndex];
  const episodioActual = serieActual.episodios[episodioActivoIndex];

  // Reiniciar el contador del episodio
  localStorage.setItem(`tiempo_${episodioActual.idVideo}`, 0);

  if (episodioActivoIndex < serieActual.episodios.length - 1) {
    // AQUÍ TAMBIÉN: Le pasamos 'true' para el siguiente episodio
    cargarVideo(serieActivaIndex, episodioActivoIndex + 1, true);
    reproductor.play();
  } else {
    reproductor.pause();
    btnSkipEnding.classList.add('oculto');
    btnSkipIntro.classList.add('oculto');
    localStorage.setItem(`ep_activo_serie_${serieActivaIndex}`, 0);

    pantallaReproductor.classList.add('oculto');
    pantallaTransicion.classList.remove('oculto');

    setTimeout(() => {
      pantallaTransicion.classList.add('oculto');
      pantallaInicio.classList.remove('oculto');
    }, 3000);
  }
}

// --- 5. LÓGICA DEL MODAL DE EPISODIOS ---

// ¡Estos eran los dos botones que se nos habían borrado!
btnAbrirLista.addEventListener('click', () => {
  modalEpisodios.classList.remove('oculto');
  renderizarEpisodios(serieActivaIndex);
});

btnCerrarModal.addEventListener('click', () => {
  modalEpisodios.classList.add('oculto');
});

function renderizarEpisodios(sIndex, temporadaAFiltrar = null) {
  mostrandoSeries = false;
  listaVideos.innerHTML = '';
  const serie = catalogo[sIndex];

  tituloModal.textContent = `Episodios de ${serie.nombreSerie}`;

  // 1. Extraemos qué temporadas existen (ej: [1, 2, 3])
  const temporadasUnicas = [...new Set(serie.episodios.map(ep => ep.temporada).filter(t => t != null))];

  // 2. ¿Qué temporada mostramos por defecto?
  let temporadaSeleccionada = temporadaAFiltrar;
  if (!temporadaSeleccionada) {
    // Si estamos viendo esta serie, mostramos la temporada del capítulo actual
    if (sIndex === serieActivaIndex && serie.episodios[episodioActivoIndex].temporada) {
      temporadaSeleccionada = serie.episodios[episodioActivoIndex].temporada;
    } else if (temporadasUnicas.length > 0) {
      // Si es una serie nueva, mostramos la temporada 1
      temporadaSeleccionada = temporadasUnicas[0];
    }
  }

  // 3. Dibujar el Menú Desplegable (<select>)
  if (temporadasUnicas.length > 0) {
    selectTemporada.classList.remove('oculto');
    selectTemporada.innerHTML = ''; // Limpiar opciones viejas

    temporadasUnicas.forEach(temp => {
      const option = document.createElement('option');
      option.value = temp;
      option.textContent = `Temporada ${temp}`;
      if (temp === temporadaSeleccionada) option.selected = true;
      selectTemporada.appendChild(option);
    });

    // Si el usuario elige otra temporada en el menú, redibujamos la lista
    selectTemporada.onchange = (e) => {
      renderizarEpisodios(sIndex, parseInt(e.target.value));
    };
  } else {
    // Si la serie no tiene temporadas en el JSON, ocultamos el menú
    selectTemporada.classList.add('oculto');
  }

  // 4. Dibujar SOLO los episodios de la temporada elegida
  serie.episodios.forEach((ep, eIndex) => {
    // Filtro mágico: Si el episodio no es de la temporada elegida, lo saltamos
    if (temporadasUnicas.length > 0 && ep.temporada !== temporadaSeleccionada) return;

    const li = document.createElement('li');
    li.textContent = ep.titulo;

    if (sIndex === serieActivaIndex && eIndex === episodioActivoIndex) {
      li.classList.add('activo');
    }

    li.addEventListener('click', () => {
      cargarVideo(sIndex, eIndex, true);
      reproductor.play();
      modalEpisodios.classList.add('oculto');
    });

    listaVideos.appendChild(li);
  });
}

// --- EVENTOS DE CARGA (LOADER) ---
reproductor.addEventListener('waiting', () => loader.classList.remove('oculto')); // Si se traba, muestra la rueda
reproductor.addEventListener('playing', () => loader.classList.add('oculto')); // Si ya reproduce, la quita
reproductor.addEventListener('canplay', () => loader.classList.add('oculto'));

// --- EVENTOS DE INTERFAZ (HOVER Y PAUSA) ---
let timeoutInactividad;
let timeoutPausa10s;

// 1. Lógica para cuando movemos el mouse (Hover)
pantallaReproductor.addEventListener('mousemove', () => {
  clearTimeout(timeoutInactividad);
  clearTimeout(timeoutPausa10s);

  // Al mover el mouse, SIEMPRE mostramos todo
  controlesVideo.classList.remove('oculto');
  btnVolverInicio.classList.remove('oculto');
  btnAbrirLista.classList.remove('oculto');
  infoPausa.classList.remove('oculto');
  pantallaReproductor.style.cursor = 'default';

  if (reproductor.paused) {
    // === LA CORRECCIÓN DE ORO AQUÍ ===
    // Si estamos en pausa, los titulares ya NO desaparecen a los 3 segundos.
    // Se quedan fijos y visibles. Solo ocultamos la flechita del mouse para que no estorbe.
    timeoutInactividad = setTimeout(() => {
      pantallaReproductor.style.cursor = 'none';
    }, 3000);

  } else {
    // ESTANDO EN PLAY: A los 3s desaparece todo absolutamente
    timeoutInactividad = setTimeout(() => {
      controlesVideo.classList.add('oculto');
      btnVolverInicio.classList.add('oculto');
      btnAbrirLista.classList.add('oculto');
      infoPausa.classList.add('oculto');
      pantallaReproductor.style.cursor = 'none';
    }, 3000);
  }
});

// 2. Lógica exclusiva para cuando le damos PAUSA ("De primerazo")
reproductor.addEventListener('pause', () => {
  clearTimeout(timeoutInactividad);
  clearTimeout(timeoutPausa10s);

  controlesVideo.classList.remove('oculto');
  btnVolverInicio.classList.remove('oculto');
  btnAbrirLista.classList.remove('oculto');

  // De primerazo ocultamos titulares
  infoPausa.classList.add('oculto');
  pantallaReproductor.style.cursor = 'default';

  // Programamos el salvapantallas para que salga en 10s (Corregido de 0 a 10000)
  timeoutPausa10s = setTimeout(() => {
    infoPausa.classList.remove('oculto');
    pantallaReproductor.style.cursor = 'none';
  }, 0);
});

// 3. Lógica para cuando le damos PLAY
reproductor.addEventListener('play', () => {
  pantallaReproductor.dispatchEvent(new Event('mousemove'));
});

// --- LÓGICA DE CONTROLES PERSONALIZADOS Y SCRUBBING ---

function formatearTiempo(segundos) {
  if (isNaN(segundos)) return "00:00";
  const min = Math.floor(segundos / 60);
  const sec = Math.floor(segundos % 60);
  return `${min < 10 ? '0' : ''}${min}:${sec < 10 ? '0' : ''}${sec}`;
}

btnPlayPause.addEventListener('click', () => {
  if (reproductor.paused) reproductor.play();
  else reproductor.pause();
});

reproductor.addEventListener('play', () => btnPlayPause.textContent = '⏸');
reproductor.addEventListener('pause', () => btnPlayPause.textContent = '▶');

// --- NUEVO: LÓGICA DE CLIC Y DOBLE CLIC EN EL VIDEO ---
let temporizadorClic = null;

reproductor.addEventListener('click', () => {
  // Si ya hay un clic en espera, ¡significa que acabas de hacer doble clic!
  if (temporizadorClic) {
    clearTimeout(temporizadorClic); // Cancelamos la orden de Pausa/Play al instante
    temporizadorClic = null;

    // Ejecutamos la Pantalla Completa
    if (!document.fullscreenElement) {
      pantallaReproductor.requestFullscreen().catch(err => console.log(err));
    } else {
      document.exitFullscreen();
    }
  } else {
    // Es el primer clic. Esperamos 300 milisegundos a ver si haces el segundo...
    temporizadorClic = setTimeout(() => {
      // Si pasaron los 300ms y no hiciste otro clic, entonces sí Pausamos/Reproducimos
      if (reproductor.paused) reproductor.play();
      else reproductor.pause();

      temporizadorClic = null; // Reiniciamos el cerebro para el próximo clic
    }, 300);
  }
});

// --- LÓGICA DE SCRUBBING (ARRASTRE GLOBAL SÚPER FLUIDO) ---
let arrastrandoBarra = false;
let estabaReproduciendo = false;
let nuevoTiempoAlSoltar = 0; // Memoria para saber a qué minuto saltar al soltar el clic

function actualizarTiempoVisual(e) {
  const rect = barraProgresoContenedor.getBoundingClientRect();
  let clicX = e.clientX - rect.left;

  if (clicX < 0) clicX = 0;
  if (clicX > rect.width) clicX = rect.width;

  const porcentaje = clicX / rect.width;
  nuevoTiempoAlSoltar = porcentaje * reproductor.duration;

  // MAGIA 2: Actualizamos la barra roja y el texto AL INSTANTE (cero lag), 
  // pero NO tocamos el reproductor.currentTime todavía.
  barraProgreso.style.width = `${porcentaje * 100}%`;
  tiempoTexto.textContent = `${formatearTiempo(nuevoTiempoAlSoltar)} / ${formatearTiempo(reproductor.duration)}`;
}

// 1. Cuando presionas el clic
barraProgresoContenedor.addEventListener('mousedown', (e) => {
  arrastrandoBarra = true;
  estabaReproduciendo = !reproductor.paused;
  reproductor.pause();

  actualizarTiempoVisual(e);
  // Al hacer el primer clic, sí le decimos al video que salte ahí
  reproductor.currentTime = nuevoTiempoAlSoltar;
});

// 2. Cuando arrastras (Se mueve ultra suave porque es puro CSS, sin descargar video)
window.addEventListener('mousemove', (e) => {
  if (arrastrandoBarra) {
    e.preventDefault();
    actualizarTiempoVisual(e);
  }
});

// 3. Cuando sueltas el clic
window.addEventListener('mouseup', () => {
  if (arrastrandoBarra) {
    arrastrandoBarra = false;

    // MAGIA 3: ¡Ahora sí! Le decimos al video que cargue el minuto final donde soltaste
    reproductor.currentTime = nuevoTiempoAlSoltar;

    if (estabaReproduciendo) {
      // Un pequeño retraso para asegurar que cargó antes de darle play
      setTimeout(() => reproductor.play(), 100);
    }
  }
});

// --- ATAJOS DE TECLADO Y SALTO VISUAL ---
let timeoutSaltoAdelante;
let timeoutSaltoAtras;

// Función para mostrar el cartel y ocultarlo a los 800 milisegundos
function mostrarIndicadorSalto(elemento, timeoutVar) {
  clearTimeout(timeoutVar); // Borra el contador anterior si presionas muy rápido
  elemento.classList.add('activo');

  return setTimeout(() => {
    elemento.classList.remove('activo');
  }, 800); // 0.8 segundos de visibilidad
}

document.addEventListener('keydown', (e) => {
  if (pantallaReproductor.classList.contains('oculto')) return;

  switch (e.code) {
    case 'Space':
      e.preventDefault();
      if (reproductor.paused) reproductor.play();
      else reproductor.pause();
      break;

    case 'ArrowRight':
      reproductor.currentTime += 10;
      // Mostramos el +10s a la derecha
      timeoutSaltoAdelante = mostrarIndicadorSalto(indicadorAdelantar, timeoutSaltoAdelante);
      break;

    case 'ArrowLeft':
      reproductor.currentTime -= 10;
      // Mostramos el -10s a la izquierda
      timeoutSaltoAtras = mostrarIndicadorSalto(indicadorRetroceder, timeoutSaltoAtras);
      break;

    case 'KeyF':
      if (!document.fullscreenElement) {
        pantallaReproductor.requestFullscreen().catch(err => console.log(err));
      } else {
        document.exitFullscreen();
      }
      break;
  }
});

// --- LÓGICA DE LOS NUEVOS BOTONES DE LA BARRA ---

// 1. Botones de Adelantar/Atrasar 10s
btnRetroceder10.addEventListener('click', () => {
  reproductor.currentTime -= 10;
  // Reutilizamos tu animación visual en pantalla
  timeoutSaltoAtras = mostrarIndicadorSalto(indicadorRetroceder, timeoutSaltoAtras);
});

btnAdelantar10.addEventListener('click', () => {
  reproductor.currentTime += 10;
  // Reutilizamos tu animación visual en pantalla
  timeoutSaltoAdelante = mostrarIndicadorSalto(indicadorAdelantar, timeoutSaltoAdelante);
});

// 2. Botón de Siguiente Episodio
btnNextVideo.addEventListener('click', reproducirSiguiente);

// 3. Botón y Función de Episodio Anterior
function reproducirAnterior() {
  const serieActual = catalogo[serieActivaIndex];
  const episodioActual = serieActual.episodios[episodioActivoIndex];

  // Limpiamos el tiempo del episodio que dejamos
  localStorage.setItem(`tiempo_${episodioActual.idVideo}`, 0);

  // Verificamos que NO estemos en el episodio 1 (el índice 0)
  if (episodioActivoIndex > 0) {
    cargarVideo(serieActivaIndex, episodioActivoIndex - 1, true);
    reproductor.play();
  }
}

btnPrevVideo.addEventListener('click', reproducirAnterior);

// 4. Botón de Pantalla Completa
btnFullscreen.addEventListener('click', () => {
  if (!document.fullscreenElement) {
    pantallaReproductor.requestFullscreen().catch(err => console.log(err));
  } else {
    document.exitFullscreen();
  }
});

// Arrancar la aplicación
inicializar();