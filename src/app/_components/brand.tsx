import Link from "next/link";
import styles from "../page.module.css";

export default function Brand() {
  return (
    <Link className={styles.brand} href="/" aria-label="GeoLearner, accueil">
      <span className={styles.brandMark} aria-hidden="true">
        <svg viewBox="0 0 40 40" role="presentation">
          <path d="M20 5.5c-7.2 0-13 5.6-13 12.6 0 9 13 17 13 17s13-8 13-17c0-7-5.8-12.6-13-12.6Z" />
          <circle cx="20" cy="18" r="4.2" />
        </svg>
      </span>
      <span>GeoLearner</span>
    </Link>
  );
}
