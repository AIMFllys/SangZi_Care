'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useUserStore } from '@/stores/userStore';
import { useAuth } from '@/hooks/useAuth';
import { ROUTES } from '@/lib/constants';
import styles from './page.module.css';

type ModalType = 'role' | 'logout' | null;

export default function SettingsPage() {
  const router = useRouter();
  const { isReady } = useAuth();
  const isElder = useUserStore((s) => s.isElder);
  const setRole = useUserStore((s) => s.setRole);
  const logout = useUserStore((s) => s.logout);

  const [activeModal, setActiveModal] = useState<ModalType>(null);
  const [switching, setSwitching] = useState(false);

  const currentRoleLabel = isElder ? '长辈模式' : '家属模式';
  const targetRole = isElder ? 'family' : 'elder';
  const targetRoleLabel = isElder ? '家属模式' : '长辈模式';

  async function handleRoleSwitch() {
    if (switching) return;
    setSwitching(true);
    try {
      await setRole(targetRole);
      setActiveModal(null);
    } catch {
      // setRole handles rollback internally
    } finally {
      setSwitching(false);
    }
  }

  function handleLogout() {
    logout();
    setActiveModal(null);
    router.replace(ROUTES.LOGIN);
  }

  if (!isReady) {
    return <div className={styles.loading}>加载中…</div>;
  }

  return (
    <main className={styles.container}>
      <div className={styles.header}>
        <h1 className={styles.title}>设置</h1>
      </div>

      <nav className={styles.menuList} aria-label="设置菜单">
        {/* 个人信息 */}
        <Link href={ROUTES.SETTINGS_PROFILE} className={styles.menuItem}>
          <span className={styles.menuIcon} aria-hidden="true">👤</span>
          <div className={styles.menuContent}>
            <div className={styles.menuLabel}>个人信息</div>
            <div className={styles.menuDesc}>姓名、头像、出生日期</div>
          </div>
          <span className={styles.menuArrow} aria-hidden="true">›</span>
        </Link>

        {/* 绑定管理 */}
        <Link href={ROUTES.SETTINGS_BIND} className={styles.menuItem}>
          <span className={styles.menuIcon} aria-hidden="true">🔗</span>
          <div className={styles.menuContent}>
            <div className={styles.menuLabel}>绑定管理</div>
            <div className={styles.menuDesc}>管理家属绑定关系</div>
          </div>
          <span className={styles.menuArrow} aria-hidden="true">›</span>
        </Link>

        {/* 无障碍设置 */}
        <Link href={ROUTES.SETTINGS_ACCESSIBILITY} className={styles.menuItem}>
          <span className={styles.menuIcon} aria-hidden="true">♿</span>
          <div className={styles.menuContent}>
            <div className={styles.menuLabel}>无障碍设置</div>
            <div className={styles.menuDesc}>字体大小、语音速度</div>
          </div>
          <span className={styles.menuArrow} aria-hidden="true">›</span>
        </Link>

        {/* 角色切换 */}
        <button
          className={styles.roleSwitch}
          onClick={() => setActiveModal('role')}
          aria-label={`当前为${currentRoleLabel}，点击切换到${targetRoleLabel}`}
        >
          <span className={styles.menuIcon} aria-hidden="true">🔄</span>
          <div className={styles.menuContent}>
            <div className={styles.menuLabel}>角色切换</div>
            <div className={styles.menuDesc}>切换长辈/家属模式</div>
          </div>
          <span
            className={`${styles.roleBadge} ${isElder ? styles.roleBadgeElder : styles.roleBadgeFamily}`}
          >
            {currentRoleLabel}
          </span>
        </button>

        {/* 退出登录 */}
        <button
          className={styles.logoutItem}
          onClick={() => setActiveModal('logout')}
          aria-label="退出登录"
        >
          <span className={styles.logoutLabel}>退出登录</span>
        </button>
      </nav>

      {/* Role switch confirmation modal */}
      {activeModal === 'role' && (
        <div
          className={styles.modalOverlay}
          role="dialog"
          aria-modal="true"
          aria-labelledby="role-modal-title"
          onClick={() => !switching && setActiveModal(null)}
        >
          <div className={styles.modalContent} onClick={(e) => e.stopPropagation()}>
            <h2 id="role-modal-title" className={styles.modalTitle}>切换角色</h2>
            <p className={styles.modalMessage}>
              确定要从「{currentRoleLabel}」切换到「{targetRoleLabel}」吗？
              界面风格将随之改变。
            </p>
            <div className={styles.modalActions}>
              <button
                className={styles.modalBtnCancel}
                onClick={() => setActiveModal(null)}
                disabled={switching}
              >
                取消
              </button>
              <button
                className={styles.modalBtnConfirm}
                onClick={handleRoleSwitch}
                disabled={switching}
              >
                {switching ? '切换中…' : '确认切换'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Logout confirmation modal */}
      {activeModal === 'logout' && (
        <div
          className={styles.modalOverlay}
          role="dialog"
          aria-modal="true"
          aria-labelledby="logout-modal-title"
          onClick={() => setActiveModal(null)}
        >
          <div className={styles.modalContent} onClick={(e) => e.stopPropagation()}>
            <h2 id="logout-modal-title" className={styles.modalTitle}>退出登录</h2>
            <p className={styles.modalMessage}>
              确定要退出登录吗？退出后需要重新验证手机号。
            </p>
            <div className={styles.modalActions}>
              <button
                className={styles.modalBtnCancel}
                onClick={() => setActiveModal(null)}
              >
                取消
              </button>
              <button
                className={styles.modalBtnDanger}
                onClick={handleLogout}
              >
                退出登录
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}
