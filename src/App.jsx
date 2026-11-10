import { useEffect, useState } from 'react';
import MovieCard from './MovieCard';

function App() {
  const [query, setQuery] = useState('');
  const [movies, setMovies] = useState([]);
  const [status, setStatus] = useState('idle');
  const [error, setError] = useState(null);

  const fetchMovies = async (currentQuery) => {
    const trimmed = currentQuery.trim();

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
        `https://www.omdbapi.com/?s=${encodeURIComponent(trimmed)}&apikey=d6b40981`
      );

      if (!response.ok) {
        throw new Error('Ошибка сети');
      }

      const data = await response.json();

      if (data.Error) {
        setMovies([]);
        setStatus('error');
        setError('Ничего не найдено');
        return;
      }

      setMovies(data.Search || []);
      setStatus('success');
    } catch (err) {
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

    return () => clearTimeout(timer);
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
        <p>Введите название фильма и нажмите «Найти».</p>
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
            <MovieCard key={movie.imdbID} movie={movie} />
          ))}
        </div>
      )}
    </main>
  );
}

export default App;


