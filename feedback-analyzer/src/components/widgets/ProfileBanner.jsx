function TrainerProfileBanner({ name, subject, subtitle, rating, totalReviews, ratingLabel, avatarIcon, children }) {
  const initials = (name || "")
    .split(" ")
    .map((part) => part[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

  const displaySubtitle = subtitle || subject;
  const displayRatingLabel = ratingLabel || (totalReviews !== undefined ? `(${totalReviews} reviews)` : "");

  return (
    <div className="panel profile-banner">
      <div className="profile-banner__identity">
        <span className="profile-banner__avatar">
          {avatarIcon ? <i className={`bi ${avatarIcon}`} /> : initials}
        </span>
        <div className="profile-banner__text">
          <span className="profile-banner__name">{name}</span>
          {displaySubtitle ? <span className="profile-banner__subject">{displaySubtitle}</span> : null}
        </div>
      </div>

      <div className="profile-banner__rating">
        <i className="bi bi-star-fill" />
        <span className="profile-banner__rating-value">{rating}</span>
        {displayRatingLabel ? <span className="profile-banner__rating-count">{displayRatingLabel}</span> : null}
      </div>

      <div className="profile-banner__actions">{children}</div>
    </div>
  );
}

export default TrainerProfileBanner;