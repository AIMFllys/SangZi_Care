import type { HealthTrendPoint } from '@/types/careDashboard';
import styles from './CareCharts.module.css';

interface HealthSparklineProps {
  points: HealthTrendPoint[];
}

function buildPath(points: HealthTrendPoint[]): string {
  const values = points
    .map((point) => point.value)
    .filter((value): value is number => typeof value === 'number');
  if (values.length === 0) return '';

  const min = Math.min(...values);
  const max = Math.max(...values);
  const spread = Math.max(1, max - min);
  let penDown = false;

  return points.map((point, index) => {
    if (point.value === null) {
      penDown = false;
      return '';
    }
    const x = points.length > 1 ? (index / (points.length - 1)) * 100 : 50;
    const y = 82 - ((point.value - min) / spread) * 64;
    const command = penDown ? 'L' : 'M';
    penDown = true;
    return `${command}${x.toFixed(1)},${y.toFixed(1)}`;
  }).join(' ');
}

export function HealthSparkline({ points }: HealthSparklineProps) {
  const path = buildPath(points);
  const latest = [...points].reverse().find((point) => point.value !== null)?.value;

  return (
    <div
      className={styles.sparklineWrap}
      role="img"
      aria-label={`近七日心率趋势${latest ? `，最新 ${latest} 次每分` : '，暂无数据'}`}
    >
      <svg className={styles.sparkline} viewBox="0 0 100 100" preserveAspectRatio="none">
        <path className={styles.sparkGrid} d="M0 25H100 M0 50H100 M0 75H100" />
        {path && <path className={styles.sparkPath} d={path} />}
      </svg>
      {!path && <span className={styles.sparkEmpty}>暂无心率趋势</span>}
    </div>
  );
}
