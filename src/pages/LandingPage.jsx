import { Link } from 'react-router-dom'
import { isAuthenticated } from '../stores/authStore'

const highlights = [
  'Video sync realtime',
  'Room private',
  'Chat dan oncam',
]

const tickerItems = [...highlights, ...highlights, ...highlights]

export default function LandingPage() {
  const loggedIn = isAuthenticated()
  const primaryPath = loggedIn ? '/dashboard' : '/register'
  const primaryLabel = loggedIn ? 'Buka dashboard' : 'Mulai nobar'

  return (
    <main className="cinema-landing">
      <header className="cinema-nav">
        <Link to="/" className="cinema-brand" aria-label="Nobarkan home">
          Nobarkan
        </Link>

        <nav className="cinema-nav-actions" aria-label="Menu landing">
          {loggedIn ? (
            <Link
              to="/dashboard"
              className="cinema-link-button cinema-link-primary"
            >
              Dashboard
            </Link>
          ) : (
            <>
              <Link
                to="/login"
                className="cinema-link-button cinema-link-ghost"
              >
                Masuk
              </Link>
              <Link
                to="/register"
                className="cinema-link-button cinema-link-primary"
              >
                Daftar
              </Link>
            </>
          )}
        </nav>
      </header>

      <section className="cinema-hero">
        <div className="cinema-hero-copy">
          <h1>Nonton bareng online, tetap sinkron.</h1>
          <p className="cinema-subtitle">
            Buat room nobar, bagikan kode, lalu tonton film bersama teman dengan
            chat dan oncam dalam satu tempat.
          </p>

          <div className="cinema-cta-row">
            <Link to={primaryPath} className="cinema-cta-primary">
              {primaryLabel}
            </Link>
            {!loggedIn ? (
              <Link to="/login" className="cinema-cta-secondary">
                Masuk dulu
              </Link>
            ) : null}
          </div>
        </div>

        <aside className="cinema-preview" aria-label="Preview fitur Nobarkan">
          <div className="cinema-preview-poster">
            <img
              className="cinema-preview-img"
              src="/images/poster.png"
              alt="Poster film preview"
              loading="lazy"
            />
            <span className="cinema-preview-label">Now watching</span>
            <strong>Oppenheimer</strong>
            <small>6 online • 00:42:18</small>
          </div>
        </aside>
      </section>

      <section className="cinema-ticker" aria-label="Highlight Nobarkan">
        <div className="cinema-ticker-track">
          {tickerItems.map((item, i) => (
            <span className="cinema-ticker-item" key={`${item}-${i}`}>
              {item}
            </span>
          ))}
        </div>
      </section>

      <section className="cinema-about" aria-label="Cara kerja Nobarkan">
        <div className="cinema-about-inner">
          <div className="cinema-about-heading">
            <p>Cara kerja</p>
            <h2>Dari film sampai nobar bareng, begini alurnya.</h2>
          </div>
          <div className="cinema-steps">
            <div className="cinema-step">
              <span className="cinema-step-num">01</span>
              <h3>Tambahkan film</h3>
              <p>
                Tempel link Google Drive film. Server Nobarkan otomatis download
                dan cache supaya streaming cepat dan stabil untuk semua peserta.
              </p>
            </div>
            <div className="cinema-step">
              <span className="cinema-step-num">02</span>
              <h3>Buat room & undang</h3>
              <p>
                Setelah film siap, buat room nobar dan bagikan kode 6 karakter
                ke teman. Bisa diatur private dengan password.
              </p>
            </div>
            <div className="cinema-step">
              <span className="cinema-step-num">03</span>
              <h3>Nobar sinkron</h3>
              <p>
                Host kontrol play dan pause. Semua peserta otomatis ikut — tidak
                ada lagi "lagi di menit berapa?"
              </p>
            </div>
            <div className="cinema-step">
              <span className="cinema-step-num">04</span>
              <h3>Chat & oncam</h3>
              <p>
                Diskusi lewat chat langsung, atau nyalakan kamera dan mic via
                WebRTC kalau mau nonton sambil video call.
              </p>
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}
