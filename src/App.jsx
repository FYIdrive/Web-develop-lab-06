import { useEffect, useRef, useState } from 'react';
import MovieCard from './MovieCard';

const OMDB_API_KEY = 'd6b40981';

function App() {
  const [query, setQuery] = useState('');
  const [yearFrom, setYearFrom] = useState('');
  const [yearTo, setYearTo] = useState('');
  const [movies, setMovies] = useState([]);
  const [page, setPage] = useState(1);
  const [totalResults, setTotalResults] = useState(0);
  const [status, setStatus] = useState('idle');
  const [error, setError] = useState(null);
  const [detailsById, setDetailsById] = useState({});
  const [loadingIds, setLoadingIds] = useState(new Set());

  const detailCacheRef = useRef({});
  const detailLoadingRef = useRef(new Set());
  const searchAbortRef = useRef(null);
  const searchDebounceRef = useRef(null);

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

  const fetchMovies = async (currentQuery, currentPage) => {
    const trimmed = currentQuery.trim();

    if (searchAbortRef.current) {
      searchAbortRef.current.abort();
    }

    const controller = new AbortController();
    searchAbortRef.current = controller;

    if (!trimmed) {
      setMovies([]);
      setTotalResults(0);
      setStatus('idle');
      setError(null);
      return;
    }

    setStatus('loading');
    setError(null);

    try {
      const response = await fetch(
        `https://www.omdbapi.com/?s=${encodeURIComponent(trimmed)}&page=${currentPage}&apikey=${OMDB_API_KEY}`,
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
        setTotalResults(0);
        setStatus('error');
        setError('Ничего не найдено');
        return;
      }

      const resultMovies = data.Search || [];
      setMovies(resultMovies);
      setTotalResults(Number(data.totalResults) || 0);
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
    searchDebounceRef.current = setTimeout(() => {
      searchDebounceRef.current = null;
      if (query.trim().length > 2) {
        fetchMovies(query, page);
      } else {
        setMovies([]);
        setTotalResults(0);
        setStatus('idle');
        setError(null);
      }
    }, 500);

    return () => {
      if (searchDebounceRef.current) {
        clearTimeout(searchDebounceRef.current);
        searchDebounceRef.current = null;
      }
      if (searchAbortRef.current) {
        searchAbortRef.current.abort();
      }
    };
  }, [query, page]);

  const submitSearch = () => {
    if (searchDebounceRef.current) {
      clearTimeout(searchDebounceRef.current);
      searchDebounceRef.current = null;
    }

    if (page !== 1) {
      setPage(1);
      return;
    }

    fetchMovies(query, 1);
  };

  const changePage = (nextPage) => {
    setPage(nextPage);
    setStatus('loading');
  };

  const maxPage = Math.min(100, Math.ceil(totalResults / 10));
  const yearRangeInvalid =
    yearFrom !== '' && yearTo !== '' && Number(yearFrom) > Number(yearTo);
  const filteredMovies = movies.filter((movie) => {
    const year = Number.parseInt(movie.Year, 10);

    return (
      Number.isFinite(year) &&
      !yearRangeInvalid &&
      (yearFrom === '' || year >= Number(yearFrom)) &&
      (yearTo === '' || year <= Number(yearTo))
    );
  });

  return (
    <main className="app">
      <h1>Поиск фильмов</h1>

      <div className="search-panel">
        <input
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            setPage(1);
          }}
          placeholder="Введите название фильма"
        />
        <button onClick={submitSearch} disabled={status === 'loading'}>
          Найти
        </button>
      </div>

      <div className="year-filter" aria-label="Фильтр по году">
        <label>
          Год от
          <input
            type="number"
            min="1888"
            max="2100"
            value={yearFrom}
            onChange={(e) => setYearFrom(e.target.value)}
            placeholder="Например, 1990"
          />
        </label>
        <label>
          Год до
          <input
            type="number"
            min="1888"
            max="2100"
            value={yearTo}
            onChange={(e) => setYearTo(e.target.value)}
            placeholder="Например, 2020"
          />
        </label>
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

      {status === 'success' && yearRangeInvalid && (
        <p className="empty-state">Год «от» не может быть больше года «до».</p>
      )}

      {status === 'success' && movies.length === 0 && (
        <p>Ничего не найдено по вашему запросу.</p>
      )}

      {status === 'success' && movies.length > 0 && (
        <>
          {filteredMovies.length > 0 ? (
            <div className="movie-list">
              {filteredMovies.map((movie) => (
                <MovieCard
                  key={movie.imdbID}
                  movie={movie}
                  details={detailsById[movie.imdbID]}
                  isLoading={loadingIds.has(movie.imdbID)}
                />
              ))}
            </div>
          ) : !yearRangeInvalid ? (
            <p className="empty-state">На этой странице нет фильмов за выбранные годы.</p>
          ) : null}
          <nav className="pagination" aria-label="Страницы результатов">
            <button
              onClick={() => changePage(page - 1)}
              disabled={page <= 1 || status === 'loading'}
            >
              Предыдущая страница
            </button>
            <span>Страница {page} из {maxPage}</span>
            <button
              onClick={() => changePage(page + 1)}
              disabled={page >= maxPage || status === 'loading'}
            >
              Следующая страница
            </button>
          </nav>
        </>
      )}
    </main>
  );
}

export default App;
