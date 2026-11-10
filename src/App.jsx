import { useEffect, useRef, useState } from 'react';
import MovieCard from './MovieCard';

const OMDB_API_KEY = 'd6b40981';

function App() {
  const [query, setQuery] = useState('');
  const [movies, setMovies] = useState([]);
  const [status, setStatus] = useState('idle');
  const [error, setError] = useState(null);
  const [detailsById, setDetailsById] = useState({});
  const [loadingIds, setLoadingIds] = useState(new Set());

  const detailCacheRef = useRef({});
  const detailLoadingRef = useRef(new Set());
  const searchAbortRef = useRef(null);

  const fetchMovieDetails = async (imdbID) => {
    if (!imdbID || detailCacheRef.current[imdbID] || detailLoadingRef.current.has(imdbID)) {
      return;
    }

    detailLoadingRef.current.add(imdbID);
    setLoadingIds((prev) => {
      const next = new Set(prev);
      next.add(imdbID);
      return next;
    });

    try {
      const response = await fetch(
        `https://www.omdbapi.com/?i=${encodeURIComponent(imdbID)}&plot=full&apikey=${OMDB_API_KEY}`
      );

      if (!response.ok) {
        throw new Error('Ошибка сети');
      }

      const data = await response.json();

      detailCacheRef.current[imdbID] = data;
      setDetailsById((prev) => ({ ...prev, [imdbID]: data }));
    } catch (err) {
      console.error('Failed to load movie details:', err);

      const fallback = {
        imdbID,
        Title: 'Описание недоступно',
        Plot: 'Сведения о сюжете временно недоступны.',
        Response: 'False',
      };

      detailCacheRef.current[imdbID] = fallback;
      setDetailsById((prev) => ({ ...prev, [imdbID]: fallback }));
    } finally {
      detailLoadingRef.current.delete(imdbID);
      setLoadingIds((prev) => {
        const next = new Set(prev);
        next.delete(imdbID);
        return next;
      });
    }
  };

  const fetchMovies = async (currentQuery) => {
    const trimmed = currentQuery.trim();

    if (searchAbortRef.current) {
      searchAbortRef.current.abort();
    }

    const controller = new AbortController();
    searchAbortRef.current = controller;

    if (!trimmed) {
      setMovies([]);
      setStatus('idle');
      setError(null);
      return;
    }

    setStatus('loading');
    setError(null);

    try {
      const response = await fetch(
        `https://www.omdbapi.com/?s=${encodeURIComponent(trimmed)}&apikey=${OMDB_API_KEY}`,
        { signal: controller.signal }
      );

      if (!response.ok) {
        throw new Error('Ошибка сети');
      }

      const data = await response.json();

      if (controller.signal.aborted) {
        return;
      }

      if (data.Error) {
        setMovies([]);
        setStatus('error');
        setError('Ничего не найдено');
        return;
      }

      const resultMovies = data.Search || [];
      setMovies(resultMovies);
      setStatus('success');

      resultMovies.forEach((movie) => {
        if (movie?.imdbID) {
          fetchMovieDetails(movie.imdbID);
        }
      });
    } catch (err) {
      if (err.name === 'AbortError') {
        return;
      }

      setMovies([]);
      setStatus('error');
      setError(err.message || 'Не удалось выполнить запрос');
    }
  };

  useEffect(() => {
    const timer = setTimeout(() => {
      if (query.trim().length > 2) {
        fetchMovies(query);
      } else {
        setMovies([]);
        setStatus('idle');
        setError(null);
      }
    }, 500);

    return () => {
      clearTimeout(timer);
      if (searchAbortRef.current) {
        searchAbortRef.current.abort();
      }
    };
  }, [query]);

  return (
    <main className="app">
      <h1>Поиск фильмов</h1>

      <div className="search-panel">
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Введите название фильма"
        />
        <button onClick={() => fetchMovies(query)} disabled={status === 'loading'}>
          Найти
        </button>
      </div>

      {status === 'idle' && (
        <p className="empty-state">Введите название фильма и нажмите «Найти».</p>
      )}

      {status === 'loading' && <p>Загрузка...</p>}

      {status === 'error' && (
        <div className="error">
          <p>Ошибка: {error}</p>
        </div>
      )}

      {status === 'success' && movies.length === 0 && (
        <p>Ничего не найдено по вашему запросу.</p>
      )}

      {status === 'success' && movies.length > 0 && (
        <div className="movie-list">
          {movies.map((movie) => (
            <MovieCard
              key={movie.imdbID}
              movie={movie}
              details={detailsById[movie.imdbID]}
              isLoading={loadingIds.has(movie.imdbID)}
            />
          ))}
        </div>
      )}
    </main>
  );
}

export default App;

