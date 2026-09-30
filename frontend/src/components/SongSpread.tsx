import Image from "next/image";
import styles from "./SongSpread.module.css";
import type { Song } from "@/lib/types";

type SpreadSong = Pick<
  Song,
  | "title"
  | "artist"
  | "album"
  | "year"
  | "era"
  | "genre_tags"
  | "cover_url"
  | "youtube_id"
>;

// One song laid out as a diary spread: the cover taped on the left with the
// player under it, the stamped date and credits on the right, and whatever
// the page adds (a rating form, or a past rating and note) below the credits.
export default function SongSpread({
  song,
  stamp,
  children,
}: {
  song: SpreadSong;
  stamp: string;
  children: React.ReactNode;
}) {
  return (
    <article className={styles.songCard}>
      <div className={styles.mediaCol}>
        <div className={styles.taped}>
          <Image
            className={styles.cover}
            src={song.cover_url}
            alt={`${song.album} cover`}
            width={600}
            height={600}
            priority
          />
          <span className={`${styles.tape} ${styles.tapeTop}`} />
          <span className={`${styles.tape} ${styles.tapeBottom}`} />
        </div>
        <div className={styles.player}>
          <iframe
            className={styles.playerFrame}
            src={`https://www.youtube-nocookie.com/embed/${song.youtube_id}`}
            title={`${song.title} - ${song.artist}`}
            allow="autoplay; encrypted-media; picture-in-picture"
            referrerPolicy="strict-origin-when-cross-origin"
            allowFullScreen
          />
        </div>
      </div>

      <div className={styles.infoCol}>
        <div className={styles.heading}>
          <p className={styles.stamp}>{stamp}</p>
          <h2 className={styles.songTitle}>{song.title}</h2>
          <p className={styles.songArtist}>{song.artist}</p>
          <p className={styles.album}>{`${song.album}, ${song.year}`}</p>
          <p className={styles.tagsRow}>
            <span className={styles.eraTag}>{song.era}</span>
            {song.genre_tags.map((tag) => (
              <span key={tag} className={styles.genreTag}>
                {tag}
              </span>
            ))}
          </p>
        </div>
        <div className={styles.extra}>{children}</div>
      </div>
    </article>
  );
}
