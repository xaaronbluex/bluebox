/**
 * Crystal-globe button (Home + nav tabs).
 * Edit labels/themes in App.jsx `tabs` array; colours in index.css `[data-theme]`.
 */
const EARTH_GLOBE = "/static/img/03_planet/earth_colour.jpg";

export default function CrystalGlobeButton({
  theme = "sky",
  label,
  onClick,
  active = false,
  size = "tab",
  globeSrc = EARTH_GLOBE,
  animationDelay = "0s",
  className = "",
  ariaLabel,
}) {
  return (
    <button
      type="button"
      data-theme={theme}
      data-size={size}
      onClick={onClick}
      aria-label={ariaLabel ?? label}
      className={`crystal-globe-btn ${active ? "is-active" : ""} ${className}`.trim()}
      style={{ animationDelay }}
    >
      <span className="crystal-globe-btn__ball">
        <span className="crystal-globe-btn__shadow" aria-hidden />
        <span
          className="crystal-globe-btn__globe"
          style={globeSrc ? { backgroundImage: `url(${globeSrc})` } : undefined}
          aria-hidden
        />
      </span>
      {label ? <span className="crystal-globe-btn__label">{label}</span> : null}
    </button>
  );
}
