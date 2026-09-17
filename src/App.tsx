import { useEffect, useState } from 'react';
import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import Navigation from './components/Navigation';
import Loader from './components/Loader';
import Home from './pages/Home';
import Shop from './pages/Shop';

/* ============================================================
   RAIGE
   ============================================================ */

/** The navigation behaves differently over the film than over the store. */
function Chrome() {
  const { pathname } = useLocation();
  return <Navigation cinematic={pathname === '/'} />;
}

/** In-page anchors have to be handled manually alongside a router. */
function HashScroll() {
  const { hash, pathname } = useLocation();

  useEffect(() => {
    if (!hash) return;
    // Wait a frame so the target section exists before we look for it.
    const id = window.setTimeout(() => {
      const target = document.querySelector(hash);
      target?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }, 80);
    return () => window.clearTimeout(id);
  }, [hash, pathname]);

  return null;
}

export default function App() {
  const [loading, setLoading] = useState(true);

  return (
    <BrowserRouter>
      {loading && <Loader onDone={() => setLoading(false)} />}

      <a className="skip-link" href="#main">
        Skip to content
      </a>

      {/*
        The site is held back until the loader has finished leaving.
        Both sit on the same forest ground, so the handoff reads as one
        continuous fade — where a straight cross-dissolve would briefly
        show the loader's wordmark and the hero's lockup on top of each
        other at different sizes.
      */}
      <div className={`shell${loading ? '' : ' is-ready'}`}>
        <Chrome />
        <HashScroll />

        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/shop" element={<Shop />} />
          {/* Anything unrecognised returns to the first tee. */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </div>

      {/* A single shared grain pass over the whole site — the thing that
          stops procedural gradients reading as flat CG. */}
      <div className="grain" aria-hidden="true" />
    </BrowserRouter>
  );
}
