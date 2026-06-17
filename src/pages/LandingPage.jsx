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
            <Link to="/dashboard" className="cinema-link-button cinema-link-primary">
              Dashboard
            </Link>
          ) : (
            <>
              <Link to="/login" className="cinema-link-button cinema-link-ghost">
                Masuk
              </Link>
              <Link to="/register" className="cinema-link-button cinema-link-primary">
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
            Buat room nobar, bagikan kode, lalu tonton film bersama teman dengan chat dan oncam
            dalam satu tempat.
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
              src="/images/poster.webp"
              alt="Poster film preview"
              loading="lazy"
            />
            <span className="cinema-preview-label">Now watching</span>
            <strong>Blue Night</strong>
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
    </main>
  )
}
