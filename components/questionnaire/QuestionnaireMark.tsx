import styles from './QuestionnaireMark.module.css';

/** 问卷入口标识：折页册 + 心形，区别于通用剪贴板图标 */
export function QuestionnaireMark({ size = 22 }: { size?: number }) {
  return (
    <svg
      className={styles.mark}
      width={size}
      height={size}
      viewBox="0 0 32 32"
      fill="none"
      aria-hidden="true"
    >
      <path
        d="M8.5 5.5h11.2c.7 0 1.3.6 1.3 1.3v18.4c0 .7-.6 1.3-1.3 1.3H8.5c-.7 0-1.3-.6-1.3-1.3V6.8c0-.7.6-1.3 1.3-1.3Z"
        fill="currentColor"
        opacity="0.16"
      />
      <path
        d="M9 6h14.2c.7 0 1.3.6 1.3 1.3v17.9c0 .9-.8 1.6-1.7 1.4l-2.2-.4"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
      />
      <path
        d="M8.6 5.6h11.4c.7 0 1.2.5 1.2 1.2v18.4c0 .7-.5 1.2-1.2 1.2H8.6c-.7 0-1.2-.5-1.2-1.2V6.8c0-.7.5-1.2 1.2-1.2Z"
        stroke="currentColor"
        strokeWidth="1.8"
      />
      <path
        d="M16.2 13.1c-.4-1.1-1.6-1.5-2.5-.9-.9.6-1 1.8-.3 2.7 1.1 1.4 2.8 2.4 2.8 2.4s1.7-1 2.8-2.4c.7-.9.6-2.1-.3-2.7-.9-.6-2.1-.2-2.5.9Z"
        fill="currentColor"
      />
      <path d="M11.2 9.2h6.2" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" />
    </svg>
  );
}
