function MovieCard({ movie, details, isLoading }) {
  const posterUrl =
    movie.Poster && movie.Poster !== 'N/A'
      ? movie.Poster
      : 'https://via.placeholder.com/300x450?text=No+Poster';

  const plotText = details?.Plot || 'Описание скоро появится...';

  return (
    <article className="movie-card">
      <img src={posterUrl} alt={movie.Title} />

      <div className="movie-card__content">
        <h3>{movie.Title}</h3>
        <p>
          <strong>Год:</strong> {movie.Year}
        </p>

        {isLoading ? (
          <div className="movie-card__loading" aria-live="polite">
            <span className="movie-card__spinner" aria-hidden="true" />
            <span>Загрузка описания...</span>
          </div>
        ) : (
          <p className="movie-card__plot">{plotText}</p>
        )}
      </div>
    </article>
  );
}

export default MovieCard;
