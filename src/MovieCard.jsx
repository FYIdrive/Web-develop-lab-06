function MovieCard({ movie }) {
  const posterUrl =
    movie.Poster && movie.Poster !== 'N/A'
      ? movie.Poster
      : 'https://via.placeholder.com/300x450?text=No+Poster';

  return (
    <article className="movie-card">
      <img src={posterUrl} alt={movie.Title} />
      <h3>{movie.Title}</h3>
      <p>
        <strong>Год:</strong> {movie.Year}
      </p>
    </article>
  );
}

export default MovieCard;
