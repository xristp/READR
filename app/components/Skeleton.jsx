import styles from './Skeleton.module.css';

export function BookCardSkeleton() {
    return (
        <div className={styles.card}>
            <div className={styles.cover} />
            <div className={styles.info}>
                <div className={`${styles.line} ${styles.lineTitle}`} />
                <div className={`${styles.line} ${styles.lineAuthor}`} />
                <div className={`${styles.line} ${styles.lineMeta}`} />
            </div>
        </div>
    );
}

export function BookCardSkeletonGrid({ count = 12 }) {
    return (
        <>
            {Array.from({ length: count }, (_, i) => (
                <BookCardSkeleton key={i} />
            ))}
        </>
    );
}

export function TextSkeleton({ lines = 8 }) {
    return (
        <div className={styles.textBlock}>
            {Array.from({ length: lines }, (_, i) => {
                // Deterministic widths to avoid hydration mismatch
                const widths = [92, 88, 95, 85, 90, 87, 93, 89, 91, 86];
                const width = i === lines - 1 ? 60 : widths[i % widths.length];
                return (
                    <div
                        key={i}
                        className={`${styles.line} ${styles.textLine}`}
                        style={{ width: `${width}%` }}
                    />
                );
            })}
        </div>
    );
}
