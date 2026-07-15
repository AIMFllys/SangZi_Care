import type { MedicationAdherencePoint } from '@/types/careDashboard';
import styles from './CareCharts.module.css';

interface AdherenceMiniChartProps {
  points: MedicationAdherencePoint[];
}

function shortDay(date: string, index: number, length: number): string {
  if (index === length - 1) return '今天';
  const [, month, day] = date.split('-');
  return `${Number(month)}/${Number(day)}`;
}

export function AdherenceMiniChart({ points }: AdherenceMiniChartProps) {
  return (
    <div
      className={styles.barChart}
      role="img"
      aria-label={`近七日用药依从率：${points.map((point) => `${point.date} ${point.rate}%`).join('，')}`}
    >
      {points.map((point, index) => (
        <div className={styles.barColumn} key={point.date}>
          <div className={styles.barTrack}>
            <span
              className={`${styles.barFill} ${point.rate < 80 && point.planned > 0 ? styles.barWarning : ''}`}
              style={{ height: `${point.planned > 0 ? Math.max(8, point.rate) : 5}%` }}
            />
          </div>
          <span className={styles.barLabel}>
            {shortDay(point.date, index, points.length)}
          </span>
        </div>
      ))}
    </div>
  );
}
