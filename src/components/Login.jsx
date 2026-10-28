import { useState } from "react";
import { iniciarSesionConGoogle } from "../auth";
import { estaInstalada } from "../instalacion";
import { playError, playSuccess } from "../sounds";
import InstalarAppDialog from "./InstalarAppDialog";
import ListaEsperaDialog from "./ListaEsperaDialog";

// Pantalla de entrada: es una landing que cuenta qué es Taros Money y deja
// entrar con Google desde el encabezado, el principio y el final.

const FUNCIONES = [
  {
    icono: "ph ph-lightning",
    titulo: "Anotá en segundos",
    texto: "Un gasto o un ingreso, con monto, categoría y cuenta. Sin vueltas.",
  },
  {
    icono: "ph ph-chart-pie-slice",
    titulo: "Mirá a dónde se va",
    texto: "El resumen te muestra en qué categorías se te va la plata cada mes.",
  },
  {
    icono: "ph ph-wallet",
    titulo: "Tus cuentas, en pesos y dólares",
    texto: "Efectivo, banco, billetera virtual: cada una con su saldo y su moneda.",
  },
  {
    icono: "ph ph-target",
    titulo: "Metas de ahorro",
    texto: "Ponele un objetivo a lo que querés juntar y andá sumando de a poco.",
  },
  {
    icono: "ph ph-repeat",
    titulo: "Suscripciones a la vista",
    texto: "Netflix, el gimnasio, el celu: sabés cuánto pagás por mes sin hacer cuentas.",
  },
  {
    icono: "ph ph-table",
    titulo: "Tu planilla, tus datos",
    texto: "Todo se guarda en una planilla de Google a tu nombre. La podés abrir cuando quieras.",
  },
];

const OTROS_PROYECTOS = [
  {
    nombre: "TaroFits",
    icono: "ph ph-barbell",
    texto: "Tus rutinas de gimnasio o de calistenia en casa, con la técnica de cada ejercicio, historial, progreso y cronómetro.",
    url: "https://tarosfit.netlify.app",
  },
  {
    nombre: "Taro's Tools",
    icono: "ph ph-toolbox",
    texto: "Herramientas online que siempre necesitás: comprimir imágenes, traducir, generar un QR y más. Sin virus, sin drama.",
    url: "https://tarotools.is-a.dev",
  },
];

const PUBLICO = [
  { icono: "ph ph-student", texto: "Estás arrancando a manejar tu plata y querés entender en qué se va." },
  { icono: "ph ph-currency-dollar", texto: "Tenés pesos y dólares repartidos en varias cuentas." },
  { icono: "ph ph-notebook", texto: "Te cansaste de anotar gastos en el bloc de notas o en una planilla a mano." },
  { icono: "ph ph-piggy-bank", texto: "Querés ahorrar para algo y ver cuánto te falta." },
];

const ANIO = new Date().getFullYear();

const PASOS = [
  {
    titulo: 'Tocá "Entrar con Google"',
    texto: "Usá la cuenta de Google que tengas en el celu o la compu.",
  },
  {
    titulo: "Dale permiso a tu planilla",
    texto: "La primera vez Google te pregunta si Taros Money puede crear tu planilla. Es solo tuya.",
  },
  {
    titulo: "Cargá tu primer movimiento",
    texto: "Te mostramos un recorrido cortito y ya podés anotar tu primer gasto.",
  },
];

// `recordada` ({ email }) es la cuenta con la que se entró la última vez: si
// está, en vez de la landing se muestra "Seguir como …" con un solo toque.
export default function Login({ onSuccess, recordada = null }) {
  const [enviando, setEnviando] = useState(false);
  const [error, setError] = useState("");
  // Desde qué botón se intentó entrar, para mostrar el error al lado de ese.
  const [origen, setOrigen] = useState("hero");
  const [guiaAbierta, setGuiaAbierta] = useState(false);
  const [esperaAbierta, setEsperaAbierta] = useState(false);
  const [otraCuenta, setOtraCuenta] = useState(false);
  const instalada = estaInstalada();
  const seguir = recordada && !otraCuenta;

  async function entrar(desde) {
    setOrigen(desde);
    setEnviando(true);
    setError("");
    try {
      await iniciarSesionConGoogle(seguir && recordada.email ? { email: recordada.email } : {});
      playSuccess();
      onSuccess?.();
    } catch (err) {
      playError();
      setError(err.message || "No se pudo iniciar sesión. Probá de nuevo.");
    } finally {
      setEnviando(false);
    }
  }

  // Funciones de render (no componentes) para que el botón no se vuelva a
  // montar en cada render y no pierda el foco.
  function botonEntrar(desde, chico = false) {
    return (
      <button
        type="button"
        className={"btn btn-primary" + (chico ? "" : " landing-cta")}
        onClick={() => entrar(desde)}
        disabled={enviando}
      >
        <i className="ph ph-google-logo" aria-hidden="true" />
        {enviando && origen === desde
          ? "Entrando…"
          : chico
            ? "Entrar"
            : error && origen === desde
              ? "Reintentar"
              : "Entrar con Google"}
      </button>
    );
  }

  function errorEntrar(desde) {
    if (!error || origen !== desde) return null;
    return (
      <p className="mensaje-error landing-error" role="alert">
        {error}
      </p>
    );
  }

  // Ya había entrado antes y la sesión no se pudo renovar sola: un toque y
  // listo (con la cuenta de antes, sin elegirla de nuevo).
  if (seguir) {
    return (
      <main className="pantalla-login">
        <div className="login-contenido">
          <header className="login-hero">
            <img className="login-logo" src="/icon-192.png" alt="" width="192" height="192" />
            <h1 className="login-titulo">¡Hola de nuevo!</h1>
            <p className="login-lema">Tocá para seguir donde lo dejaste.</p>
          </header>

          <div className="card login-card">
            <button type="button" className="btn btn-primary landing-cta" onClick={() => entrar("hero")} disabled={enviando}>
              <i className="ph ph-google-logo" aria-hidden="true" />
              {enviando ? "Entrando…" : error ? "Reintentar" : "Seguir con Google"}
            </button>
            {recordada.email && <p className="login-cuenta">{recordada.email}</p>}
            {errorEntrar("hero")}
            <p className="login-espera">
              ¿Es otra persona?
              <button
                type="button"
                className="btn btn-texto"
                onClick={() => {
                  setError("");
                  setOtraCuenta(true);
                }}
                disabled={enviando}
              >
                Usar otra cuenta
              </button>
            </p>
          </div>
        </div>
      </main>
    );
  }

  // Con la app instalada en el celu no hace falta presentarla: se muestra
  // el login cortito de siempre.
  if (instalada) {
    return (
      <main className="pantalla-login">
        <div className="login-contenido">
          <header className="login-hero">
            <img className="login-logo" src="/icon-192.png" alt="" width="192" height="192" />
            <h1 className="login-titulo">Taros Money</h1>
            <p className="login-lema">Tus gastos, ingresos y ahorros, claros y en un solo lugar.</p>
          </header>

          <div className="card login-card">
            {botonEntrar("hero")}
            {errorEntrar("hero")}
            <p className="login-privacidad">
              <i className="ph ph-lock-simple" aria-hidden="true" />
              La primera vez Google te pide permiso para crear tu propia planilla. Es solo tuya: nadie más ve tus datos.
            </p>
            <p className="login-espera">
              ¿Google no te deja entrar?
              <button type="button" className="btn btn-texto" onClick={() => setEsperaAbierta(true)}>
                Pedí acceso
              </button>
            </p>
          </div>
        </div>
        {esperaAbierta && <ListaEsperaDialog onClose={() => setEsperaAbierta(false)} />}
      </main>
    );
  }

  return (
    <div className="landing">
      <a className="landing-saltar" href="#entrar">
        Ir a entrar
      </a>

      <header className="landing-header">
        <div className="landing-header-fila">
          <a className="landing-marca" href="#inicio">
            <img src="/icon-192.png" alt="" width="40" height="40" />
            <span>Taros Money</span>
          </a>
          <nav className="landing-nav" aria-label="Secciones">
            <a href="#que-es">Qué es</a>
            <a href="#para-quien">Para quién</a>
            <a href="#quien">Quién la hizo</a>
            <a href="#entrar">Cómo entrar</a>
          </nav>
          {botonEntrar("header", true)}
        </div>
        {errorEntrar("header")}
      </header>

      <main>
        <section id="inicio" className="landing-hero" aria-labelledby="landing-titulo">
          <div className="landing-hero-texto">
            <p className="landing-etiqueta">
              <i className="ph ph-sparkle" aria-hidden="true" />
              Gratis y sin publicidad
            </p>
            <h1 id="landing-titulo" className="landing-titulo">
              Tu plata, <span className="landing-resalte">clarita</span> y en un solo lugar.
            </h1>
            <p className="landing-bajada">
              Taros Money es una app para anotar tus gastos e ingresos, seguir tus cuentas y ahorrar para lo que
              querés. Simple, en pesos y en dólares, y con tus datos en tu propia planilla de Google.
            </p>
            <div className="landing-acciones">
              {botonEntrar("hero")}
              <a className="btn btn-secondary" href="#que-es">
                Contame más
                <i className="ph ph-arrow-down" aria-hidden="true" />
              </a>
            </div>
            {errorEntrar("hero")}
          </div>

          {/* Dibujo de ejemplo de la app. Es decorativo: los números son inventados. */}
          <div className="landing-muestra" aria-hidden="true">
            <div className="landing-muestra-card">
              <p className="landing-muestra-kicker">Saldo del mes</p>
              <p className="landing-muestra-monto">$ 184.500</p>
              <ul className="landing-muestra-lista">
                <li>
                  <span className="landing-muestra-punto landing-muestra-punto--0" />
                  Súper
                  <span>$ 62.300</span>
                </li>
                <li>
                  <span className="landing-muestra-punto landing-muestra-punto--1" />
                  Transporte
                  <span>$ 18.900</span>
                </li>
                <li>
                  <span className="landing-muestra-punto landing-muestra-punto--2" />
                  Salidas
                  <span>$ 34.000</span>
                </li>
              </ul>
            </div>
            <div className="landing-muestra-chip">
              <i className="ph ph-target" />
              Viaje: 68%
            </div>
            <div className="landing-muestra-chip landing-muestra-chip--abajo">
              <i className="ph ph-check-circle" />
              Gasto guardado
            </div>
          </div>
        </section>

        <section id="que-es" className="landing-seccion" aria-labelledby="titulo-que-es">
          <p className="landing-kicker">Para qué sirve</p>
          <h2 id="titulo-que-es" className="landing-h2">
            Todo lo que necesitás para ordenarte, nada más
          </h2>
          <div className="card landing-destacado">
            <span className="landing-icono landing-icono--grande">
              <i className="ph ph-envelope-simple-open" aria-hidden="true" />
            </span>
            <div>
              <p className="landing-etiqueta landing-etiqueta--violeta">Lo más nuevo</p>
              <h3 className="landing-destacado-titulo">Tus gastos salen solos de tu Gmail</h3>
              <p className="landing-texto">
                Si querés, Taros Money lee los mails de tus compras (por ejemplo, los de Mercado Pago) y te arma el gasto
                con monto, comercio y categoría. Vos solo lo revisás y lo confirmás. Y va aprendiendo: la próxima vez que
                compres en el mismo lugar, ya sabe dónde va.
              </p>
            </div>
          </div>
          <ul className="landing-grilla">
            {FUNCIONES.map((f, i) => (
              <li key={f.titulo} className="card landing-funcion">
                <span className={"landing-icono" + (i % 2 ? " landing-icono--violeta" : "")}>
                  <i className={f.icono} aria-hidden="true" />
                </span>
                <h3 className="card-title">{f.titulo}</h3>
                <p className="landing-texto">{f.texto}</p>
              </li>
            ))}
          </ul>
        </section>

        <section id="para-quien" className="landing-seccion landing-seccion--alt" aria-labelledby="titulo-para-quien">
          <p className="landing-kicker">Para quién es</p>
          <h2 id="titulo-para-quien" className="landing-h2">
            Para cualquiera que quiera saber en qué se le va la plata
          </h2>
          <ul className="landing-publico">
            {PUBLICO.map((p) => (
              <li key={p.texto}>
                <span className="landing-icono landing-icono--chico">
                  <i className={p.icono} aria-hidden="true" />
                </span>
                {p.texto}
              </li>
            ))}
          </ul>
          <p className="landing-nota">
            No necesitás saber de finanzas ni de planillas: la app hace las cuentas por vos.
          </p>
        </section>

        <section id="quien" className="landing-seccion" aria-labelledby="titulo-quien">
          <p className="landing-kicker">Quién la hizo</p>
          <h2 id="titulo-quien" className="landing-h2">
            Taros Money es el principio de una idea
          </h2>
          <div className="card landing-autor">
            <span className="landing-autor-avatar" aria-hidden="true">
              L
            </span>
            <div>
              <p className="landing-texto">
                Todo arrancó con una pregunta que seguro te hiciste alguna vez: <em>"¿en qué se me va la plata?"</em>{" "}
                Yo quería saberlo y ser un poco más consciente con mis gastos, pero no tenía un home banking donde ver
                mis movimientos.
              </p>
              <p className="landing-texto">
                Así que hice lo que haría cualquiera: me armé una planilla en Google Sheets y empecé a anotar todo. Me
                sirvió tanto que quise mejorarla, y ahí me metí con Apps Script para automatizarla. Una mejora llevó a la
                otra y, casi sin darme cuenta, la planilla se convirtió en una app.
              </p>
              <p className="landing-texto">
                Cuando mis amigos y mi familia la vieron, empezaron a pedirme: "che, ¿me la pasás?". Y así nació Taros
                Money como la conocés hoy: una app para que vos también sepas a dónde va tu plata, sin vueltas.
              </p>
              <p className="landing-firma">— Lauti</p>
              <p className="landing-texto landing-texto--dim">
                Es un proyecto personal: no hay un banco ni una empresa atrás, y nadie más que vos ve tus datos.
              </p>
            </div>
          </div>
        </section>

        <section id="entrar" className="landing-seccion landing-seccion--alt" aria-labelledby="titulo-entrar">
          <p className="landing-kicker">Cómo entrar</p>
          <h2 id="titulo-entrar" className="landing-h2">
            En tres pasos ya estás adentro
          </h2>
          <ol className="landing-pasos">
            {PASOS.map((p, i) => (
              <li key={p.titulo} className="card landing-paso">
                <span className="landing-paso-numero" aria-hidden="true">
                  {i + 1}
                </span>
                <h3 className="card-title">{p.titulo}</h3>
                <p className="landing-texto">{p.texto}</p>
              </li>
            ))}
          </ol>

          <div className="card landing-final">
            {botonEntrar("final")}
            {errorEntrar("final")}
            <p className="login-privacidad">
              <i className="ph ph-lock-simple" aria-hidden="true" />
              Tu planilla es solo tuya: nadie más ve tus datos.
            </p>
            <p className="login-espera">
              ¿Google no te deja entrar? Por ahora es solo para invitados.
              <button type="button" className="btn btn-texto" onClick={() => setEsperaAbierta(true)}>
                Pedí acceso
              </button>
            </p>
            {!instalada && (
              <button type="button" className="btn btn-texto login-instalar" onClick={() => setGuiaAbierta(true)}>
                <i className="ph ph-device-mobile" aria-hidden="true" />
                Agregala a la pantalla de inicio de tu celu
              </button>
            )}
          </div>
        </section>
        <section id="proyectos" className="landing-seccion" aria-labelledby="titulo-proyectos">
          <p className="landing-kicker">Otros proyectos</p>
          <h2 id="titulo-proyectos" className="landing-h2">
            Si te gustó Taros Money, probá estos
          </h2>
          <ul className="landing-proyectos">
            {OTROS_PROYECTOS.map((p, i) => (
              <li key={p.nombre}>
                <a className="card landing-proyecto" href={p.url} target="_blank" rel="noopener noreferrer">
                  <span className={"landing-icono" + (i % 2 ? "" : " landing-icono--violeta")}>
                    <i className={p.icono} aria-hidden="true" />
                  </span>
                  <span className="landing-proyecto-texto">
                    <span className="card-title">{p.nombre}</span>
                    <span className="landing-texto--dim">{p.texto}</span>
                  </span>
                  <i className="ph ph-arrow-up-right landing-proyecto-flecha" aria-hidden="true" />
                  <span className="visualmente-oculto">(se abre en otra pestaña)</span>
                </a>
              </li>
            ))}
          </ul>
        </section>
      </main>

      <footer className="landing-footer">
        <div className="landing-footer-fila">
          <div className="landing-footer-marca">
            <img src="/icon-192.png" alt="" width="32" height="32" />
            <div>
              <p className="landing-footer-nombre">Taros Money</p>
              <p className="landing-texto--dim">Tus gastos, ingresos y ahorros, claros.</p>
            </div>
          </div>
          <nav className="landing-footer-links" aria-label="Pie de página">
            <a href="#que-es">Qué es</a>
            <a href="#para-quien">Para quién</a>
            <a href="#quien">Quién la hizo</a>
            <a href="#proyectos">Otros proyectos</a>
            <button type="button" className="btn btn-texto" onClick={() => setEsperaAbierta(true)}>
              Pedí acceso
            </button>
            {!instalada && (
              <button type="button" className="btn btn-texto" onClick={() => setGuiaAbierta(true)}>
                Instalar la app
              </button>
            )}
          </nav>
        </div>
        <p className="landing-footer-legal">
          Hecha en Argentina por Lauti · {ANIO} · Tus datos viven en tu Google Drive.
        </p>
      </footer>

      {guiaAbierta && <InstalarAppDialog onClose={() => setGuiaAbierta(false)} />}
      {esperaAbierta && <ListaEsperaDialog onClose={() => setEsperaAbierta(false)} />}
    </div>
  );
}
