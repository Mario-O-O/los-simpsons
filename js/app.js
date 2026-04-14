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
const controlesVideo = document.getElementById('controles-video');

const loader = document.getElementById('loader');
const indicadorRetroceder = document.getElementById('indicador-retroceder');
const indicadorAdelantar = document.getElementById('indicador-adelantar');

const selectTemporada = document.getElementById('select-temporada');
const contenedorContinuar = document.getElementById('contenedor-continuar');

let catalogo = [];
let temporadaActivaIndex = 0;
let episodioActivoIndex = 0;

// --- 2. INICIALIZACIÓN ---
async function inicializar() {
  try {
    const respuesta = await fetch('./js/data.json');
    catalogo = await respuesta.json();
    renderizarInicio();
  } catch (error) {
    console.error("Error cargando el JSON.", error);
  }
}

// --- 3. LÓGICA DE LA PANTALLA DE INICIO ---
function renderizarInicio() {
  gridSeries.innerHTML = '';

  catalogo.forEach((temporada, index) => {
    const tarjeta = document.createElement('div');
    tarjeta.classList.add('tarjeta-serie');

    tarjeta.innerHTML = `
            <img src="${temporada.portada}" alt="${temporada.nombreTemporada}" onerror="this.src='https://via.placeholder.com/220x320?text=Sin+Portada'">
            <h3>${temporada.nombreTemporada}</h3>
        `;

    // AHORA: Al hacer clic en la portada, abrimos el modal de episodios (listado)
    tarjeta.addEventListener('click', () => {
      modalEpisodios.classList.remove('oculto');
      renderizarEpisodios(index);
    });

    gridSeries.appendChild(tarjeta);
  });

  revisarContinuarViendo();
}

btnVolverInicio.addEventListener('click', () => {
  if (document.fullscreenElement) {
    document.exitFullscreen().catch(err => console.log("Error al salir de pantalla completa:", err));
  }
  reproductor.pause();
  pantallaReproductor.classList.add('oculto');
  pantallaInicio.classList.remove('oculto');
  revisarContinuarViendo();
});

// --- 4. LÓGICA DEL REPRODUCTOR ---
function cargarVideo(tIndex, eIndex, iniciarDesdeCero = false) {
  temporadaActivaIndex = tIndex;
  episodioActivoIndex = eIndex;
  const episodioActual = catalogo[tIndex].episodios[eIndex];

  pausaSerie.textContent = catalogo[tIndex].nombreTemporada;
  pausaCapitulo.textContent = episodioActual.titulo;

  localStorage.setItem('ultima_temporada_global', tIndex);
  localStorage.setItem('ultimo_episodio_global', eIndex);

  localStorage.setItem(`ep_activo_temp_${tIndex}`, eIndex);
  reproductor.src = episodioActual.url;

  reproductor.onloadedmetadata = () => {
    if (iniciarDesdeCero) {
      reproductor.currentTime = 0;
      localStorage.setItem(`tiempo_${episodioActual.idVideo}`, 0);
    } else {
      const tiempoGuardado = localStorage.getItem(`tiempo_${episodioActual.idVideo}`);
      if (tiempoGuardado && parseFloat(tiempoGuardado) > 0) {
        reproductor.currentTime = parseFloat(tiempoGuardado);
      }
    }

    if (eIndex === 0) {
      btnPrevVideo.style.opacity = '0.3';
      btnPrevVideo.style.pointerEvents = 'none';
    } else {
      btnPrevVideo.style.opacity = '1';
      btnPrevVideo.style.pointerEvents = 'auto';
    }
  };
}

// --- ACTUALIZACIÓN DE TIEMPO Y BOTONES ---
reproductor.addEventListener('timeupdate', () => {
  if (catalogo.length === 0 || arrastrandoBarra || isNaN(reproductor.duration)) return;

  const episodioActual = catalogo[temporadaActivaIndex].episodios[episodioActivoIndex];
  const tiempoActual = reproductor.currentTime;

  localStorage.setItem(`tiempo_${episodioActual.idVideo}`, tiempoActual);

  const porcentaje = (tiempoActual / reproductor.duration) * 100;
  barraProgreso.style.width = `${porcentaje}%`;
  tiempoTexto.textContent = `${formatearTiempo(tiempoActual)} / ${formatearTiempo(reproductor.duration)}`;

  if (tiempoActual >= episodioActual.introInicio && tiempoActual <= episodioActual.introFin) {
    btnSkipIntro.classList.remove('oculto');
  } else {
    btnSkipIntro.classList.add('oculto');
  }

  if (tiempoActual >= episodioActual.endingInicio && tiempoActual <= episodioActual.endingFin) {
    btnSkipEnding.classList.remove('oculto');
  } else {
    btnSkipEnding.classList.add('oculto');
  }
});

btnSkipIntro.addEventListener('click', () => {
  reproductor.currentTime = catalogo[temporadaActivaIndex].episodios[episodioActivoIndex].introFin;
});

btnSkipEnding.addEventListener('click', reproducirSiguiente);
reproductor.addEventListener('ended', reproducirSiguiente);

function reproducirSiguiente() {
  const temporadaActual = catalogo[temporadaActivaIndex];
  const episodioActual = temporadaActual.episodios[episodioActivoIndex];

  localStorage.setItem(`tiempo_${episodioActual.idVideo}`, 0);

  if (episodioActivoIndex < temporadaActual.episodios.length - 1) {
    // Siguiente episodio de la misma temporada
    cargarVideo(temporadaActivaIndex, episodioActivoIndex + 1, true);
    reproductor.play();
  } else if (temporadaActivaIndex < catalogo.length - 1) {
    // ¡Magia! Si se acaba la temporada, pasa automáticamente al ep 1 de la siguiente temporada
    cargarVideo(temporadaActivaIndex + 1, 0, true);
    reproductor.play();
  } else {
    // Si ya no hay más temporadas ni episodios
    reproductor.pause();
    btnSkipEnding.classList.add('oculto');
    btnSkipIntro.classList.add('oculto');

    pantallaReproductor.classList.add('oculto');
    pantallaTransicion.classList.remove('oculto');

    setTimeout(() => {
      pantallaTransicion.classList.add('oculto');
      pantallaInicio.classList.remove('oculto');
    }, 3000);
  }
}

// --- 5. LÓGICA DEL MODAL DE EPISODIOS (LISTADO RICO) ---

btnAbrirLista.addEventListener('click', () => {
  modalEpisodios.classList.remove('oculto');
  renderizarEpisodios(temporadaActivaIndex);
});

btnCerrarModal.addEventListener('click', () => {
  modalEpisodios.classList.add('oculto');
});

// Ahora esta función dibuja tanto desde el Home como desde el Reproductor
function renderizarEpisodios(tIndex) {
  listaVideos.innerHTML = '';
  const temporadaSeleccionada = catalogo[tIndex];

  tituloModal.textContent = `Episodios`;

  // 1. Dibujar el Select con TODAS las temporadas del JSON
  if (catalogo.length > 0) {
    selectTemporada.classList.remove('oculto');
    selectTemporada.innerHTML = '';

    catalogo.forEach((temp, index) => {
      const option = document.createElement('option');
      option.value = index;
      option.textContent = temp.nombreTemporada;
      if (index === tIndex) option.selected = true;
      selectTemporada.appendChild(option);
    });

    selectTemporada.onchange = (e) => {
      renderizarEpisodios(parseInt(e.target.value));
    };
  } else {
    selectTemporada.classList.add('oculto');
  }

  // 2. Dibujar la lista de episodios con IMAGEN y DESCRIPCIÓN
  temporadaSeleccionada.episodios.forEach((ep, eIndex) => {
    const li = document.createElement('li');

    // Nueva estructura rica en HTML
    li.innerHTML = `
      <img src="${ep.imagen}" alt="${ep.titulo}" class="ep-thumb" onerror="this.src='https://via.placeholder.com/150x85?text=Sin+Imagen'">
      <div class="ep-info">
        <div class="ep-titulo">${ep.titulo}</div>
        <div class="ep-desc">${ep.descripcion || 'Sin descripción.'}</div>
      </div>
    `;

    // Solo marcamos rojo si el reproductor está abierto y es el episodio actual
    if (!pantallaReproductor.classList.contains('oculto') && tIndex === temporadaActivaIndex && eIndex === episodioActivoIndex) {
      li.classList.add('activo');
    }

    // Al hacer clic en un episodio de la lista
    li.addEventListener('click', () => {
      modalEpisodios.classList.add('oculto'); // Cerramos modal
      pantallaInicio.classList.add('oculto'); // Ocultamos inicio por si estábamos ahí
      pantallaReproductor.classList.remove('oculto'); // Mostramos reproductor

      cargarVideo(tIndex, eIndex, true);
      reproductor.play();
    });

    listaVideos.appendChild(li);
  });
}

// --- EVENTOS DE CARGA (LOADER) ---
reproductor.addEventListener('waiting', () => loader.classList.remove('oculto'));
reproductor.addEventListener('playing', () => loader.classList.add('oculto'));
reproductor.addEventListener('canplay', () => loader.classList.add('oculto'));

// --- EVENTOS DE INTERFAZ (HOVER Y PAUSA) ---
let timeoutInactividad;
let timeoutPausa10s;

pantallaReproductor.addEventListener('mousemove', () => {
  clearTimeout(timeoutInactividad);
  clearTimeout(timeoutPausa10s);

  controlesVideo.classList.remove('oculto');
  btnVolverInicio.classList.remove('oculto');
  btnAbrirLista.classList.remove('oculto');
  infoPausa.classList.remove('oculto');
  pantallaReproductor.style.cursor = 'default';

  if (reproductor.paused) {
    timeoutInactividad = setTimeout(() => {
      pantallaReproductor.style.cursor = 'none';
    }, 3000);
  } else {
    timeoutInactividad = setTimeout(() => {
      controlesVideo.classList.add('oculto');
      btnVolverInicio.classList.add('oculto');
      btnAbrirLista.classList.add('oculto');
      infoPausa.classList.add('oculto');
      pantallaReproductor.style.cursor = 'none';
    }, 3000);
  }
});

reproductor.addEventListener('pause', () => {
  clearTimeout(timeoutInactividad);
  clearTimeout(timeoutPausa10s);

  controlesVideo.classList.remove('oculto');
  btnVolverInicio.classList.remove('oculto');
  btnAbrirLista.classList.remove('oculto');

  infoPausa.classList.add('oculto');
  pantallaReproductor.style.cursor = 'default';

  timeoutPausa10s = setTimeout(() => {
    infoPausa.classList.remove('oculto');
    pantallaReproductor.style.cursor = 'none';
  }, 0);
});

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

let temporizadorClic = null;

reproductor.addEventListener('click', () => {
  if (temporizadorClic) {
    clearTimeout(temporizadorClic);
    temporizadorClic = null;

    if (!document.fullscreenElement) {
      pantallaReproductor.requestFullscreen().catch(err => console.log(err));
    } else {
      document.exitFullscreen();
    }
  } else {
    temporizadorClic = setTimeout(() => {
      if (reproductor.paused) reproductor.play();
      else reproductor.pause();
      temporizadorClic = null;
    }, 300);
  }
});

// --- LÓGICA DE SCRUBBING ---
let arrastrandoBarra = false;
let estabaReproduciendo = false;
let nuevoTiempoAlSoltar = 0;

function actualizarTiempoVisual(e) {
  const rect = barraProgresoContenedor.getBoundingClientRect();
  let clicX = e.clientX - rect.left;

  if (clicX < 0) clicX = 0;
  if (clicX > rect.width) clicX = rect.width;

  const porcentaje = clicX / rect.width;
  nuevoTiempoAlSoltar = porcentaje * reproductor.duration;

  barraProgreso.style.width = `${porcentaje * 100}%`;
  tiempoTexto.textContent = `${formatearTiempo(nuevoTiempoAlSoltar)} / ${formatearTiempo(reproductor.duration)}`;
}

barraProgresoContenedor.addEventListener('mousedown', (e) => {
  arrastrandoBarra = true;
  estabaReproduciendo = !reproductor.paused;
  reproductor.pause();

  actualizarTiempoVisual(e);
  reproductor.currentTime = nuevoTiempoAlSoltar;
});

window.addEventListener('mousemove', (e) => {
  if (arrastrandoBarra) {
    e.preventDefault();
    actualizarTiempoVisual(e);
  }
});

window.addEventListener('mouseup', () => {
  if (arrastrandoBarra) {
    arrastrandoBarra = false;
    reproductor.currentTime = nuevoTiempoAlSoltar;

    if (estabaReproduciendo) {
      setTimeout(() => reproductor.play(), 100);
    }
  }
});

// --- ATAJOS DE TECLADO ---
let timeoutSaltoAdelante;
let timeoutSaltoAtras;

function mostrarIndicadorSalto(elemento, timeoutVar) {
  clearTimeout(timeoutVar);
  elemento.classList.add('activo');

  return setTimeout(() => {
    elemento.classList.remove('activo');
  }, 800);
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
      timeoutSaltoAdelante = mostrarIndicadorSalto(indicadorAdelantar, timeoutSaltoAdelante);
      break;

    case 'ArrowLeft':
      reproductor.currentTime -= 10;
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

btnRetroceder10.addEventListener('click', () => {
  reproductor.currentTime -= 10;
  timeoutSaltoAtras = mostrarIndicadorSalto(indicadorRetroceder, timeoutSaltoAtras);
});

btnAdelantar10.addEventListener('click', () => {
  reproductor.currentTime += 10;
  timeoutSaltoAdelante = mostrarIndicadorSalto(indicadorAdelantar, timeoutSaltoAdelante);
});

btnNextVideo.addEventListener('click', reproducirSiguiente);

function reproducirAnterior() {
  const temporadaActual = catalogo[temporadaActivaIndex];
  const episodioActual = temporadaActual.episodios[episodioActivoIndex];

  localStorage.setItem(`tiempo_${episodioActual.idVideo}`, 0);

  if (episodioActivoIndex > 0) {
    cargarVideo(temporadaActivaIndex, episodioActivoIndex - 1, true);
    reproductor.play();
  }
}

btnPrevVideo.addEventListener('click', reproducirAnterior);

btnFullscreen.addEventListener('click', () => {
  if (!document.fullscreenElement) {
    pantallaReproductor.requestFullscreen().catch(err => console.log(err));
  } else {
    document.exitFullscreen();
  }
});

// --- NUEVA LÓGICA MEJORADA: CONTINUAR VIENDO ---
function revisarContinuarViendo() {
  const ultimaTemp = localStorage.getItem('ultima_temporada_global');
  const ultimoEp = localStorage.getItem('ultimo_episodio_global');

  if (ultimaTemp !== null && ultimoEp !== null) {
    const tIndex = parseInt(ultimaTemp);
    const eIndex = parseInt(ultimoEp);

    if (catalogo[tIndex] && catalogo[tIndex].episodios[eIndex]) {
      const temporada = catalogo[tIndex];
      const episodio = temporada.episodios[eIndex];

      // Inyectamos la miniatura y el botón de cerrar (X)
      contenedorContinuar.innerHTML = `
        <div class="btn-continuar" id="btn-accion-continuar">
          <img src="${episodio.imagen}" alt="Miniatura" class="btn-continuar-img" onerror="this.src='https://via.placeholder.com/90x50?text=Img'">
          
          <div class="btn-continuar-texto">
            <span style="font-size: 0.9rem;">Continuar viendo</span>
            <span class="btn-continuar-sub">${temporada.nombreTemporada} - ${episodio.titulo}</span>
          </div>

          <div id="btn-quitar-continuar" class="btn-cerrar-continuar" title="Quitar de la lista">✕</div>
        </div>
      `;
      contenedorContinuar.classList.remove('oculto');

      // 1. Evento para abrir el video al hacer clic en cualquier parte de la tarjeta
      document.getElementById('btn-accion-continuar').addEventListener('click', () => {
        pantallaInicio.classList.add('oculto');
        pantallaReproductor.classList.remove('oculto');
        cargarVideo(tIndex, eIndex);
        reproductor.play();
      });

      // 2. Evento EXCLUSIVO para la "X"
      document.getElementById('btn-quitar-continuar').addEventListener('click', (e) => {
        e.stopPropagation(); // LA MAGIA: Evita que el clic se pase al botón principal y abra el video

        // Ocultamos la tarjeta visualmente
        contenedorContinuar.classList.add('oculto');

        // Borramos la memoria en el navegador para que no vuelva a aparecer al recargar
        localStorage.removeItem('ultima_temporada_global');
        localStorage.removeItem('ultimo_episodio_global');
      });

      return;
    }
  }
  contenedorContinuar.classList.add('oculto');
}

// Arrancar la aplicación
inicializar();