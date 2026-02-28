'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useUserStore } from '@/stores/userStore';
import { useFamilyStore } from '@/stores/familyStore';
import { useAuth } from '@/hooks/useAuth';
import { fetchApi } from '@/lib/api';
import { ROUTES } from '@/lib/constants';
import styles from './page.module.css';

/** 关系类型选项 */
const RELATION_OPTIONS = [
  '儿子', '女儿', '配偶', '儿媳', '女婿', '孙子', '孙女', '其他',
] as const;

/** 权限配置项 */
const PERMISSION_LABELS: Record<string, string> = {
  can_view_health: '查看健康数据',
  can_edit_medication: '编辑用药计划',
  can_receive_emergency: '接收紧急通知',
};

interface FamilyBindResponse {
  id: string;
  elder_id: string;
  family_id: string;
  relation: string;
  status: string;
  bind_code: string;
  can_view_health: boolean;
  can_edit_medication: boolean;
  can_receive_emergency: boolean;
  bound_at: string;
  created_at: string;
}

interface GenerateCodeResponse {
  bind_code: string;
  bind_id: string;
}

export default function BindManagementPage() {
  const router = useRouter();
  const { isReady } = useAuth();
  const isElder = useUserStore((s) => s.isElder);
  const { binds, fetchBinds, isLoading: storeLoading } = useFamilyStore();

  // --- Local bind list (from direct API, typed as FamilyBindResponse[]) ---
  const [bindList, setBindList] = useState<FamilyBindResponse[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // --- Generate code state (elder) ---
  const [generatedCode, setGeneratedCode] = useState<string | null>(null);
  const [generating, setGenerating] = useState(false);

  // --- Bind form state (family) ---
  const [bindCode, setBindCode] = useState('');
  const [selectedRelation, setSelectedRelation] = useState<string>(RELATION_OPTIONS[0]);
  const [binding, setBinding] = useState(false);
  const [bindError, setBindError] = useState<string | null>(null);
  const [bindSuccess, setBindSuccess] = useState(false);

  // --- Unbind confirmation modal ---
  const [unbindTarget, setUnbindTarget] = useState<FamilyBindResponse | null>(null);
  const [unbinding, setUnbinding] = useState(false);

  // --- Permission update loading ---
  const [updatingPermission, setUpdatingPermission] = useState<string | null>(null);

  // --- Fetch binds on mount ---
  const loadBinds = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await fetchApi<FamilyBindResponse[]>('/api/v1/family/binds');
      setBindList(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : '加载绑定列表失败');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (isReady) {
      loadBinds();
    }
  }, [isReady, loadBinds]);

  // --- Generate bind code (elder) ---
  const handleGenerateCode = async () => {
    setGenerating(true);
    setError(null);
    try {
      const res = await fetchApi<GenerateCodeResponse>('/api/v1/family/generate-code', {
        method: 'POST',
      });
      setGeneratedCode(res.bind_code);
    } catch (err) {
      setError(err instanceof Error ? err.message : '生成绑定码失败');
    } finally {
      setGenerating(false);
    }
  };

  // --- Bind with code (family) ---
  const handleBind = async () => {
    if (!bindCode.trim()) {
      setBindError('请输入绑定码');
      return;
    }
    if (bindCode.trim().length !== 6) {
      setBindError('绑定码为6位数字');
      return;
    }

    setBinding(true);
    setBindError(null);
    setBindSuccess(false);
    try {
      await fetchApi<FamilyBindResponse>('/api/v1/family/bind', {
        method: 'POST',
        body: { bind_code: bindCode.trim(), relation: selectedRelation },
      });
      setBindSuccess(true);
      setBindCode('');
      // Refresh bind list
      await loadBinds();
      // Also refresh store for other components
      fetchBinds();
    } catch (err) {
      setBindError(err instanceof Error ? err.message : '绑定失败');
    } finally {
      setBinding(false);
    }
  };

  // --- Update permission toggle ---
  const handlePermissionToggle = async (
    bindId: string,
    permKey: string,
    currentValue: boolean,
  ) => {
    const loadingKey = `${bindId}-${permKey}`;
    setUpdatingPermission(loadingKey);
    try {
      const updated = await fetchApi<FamilyBindResponse>(
        `/api/v1/family/binds/${bindId}`,
        {
          method: 'PATCH',
          body: { [permKey]: !currentValue },
        },
      );
      setBindList((prev) =>
        prev.map((b) => (b.id === bindId ? updated : b)),
      );
    } catch {
      // Silently fail — toggle reverts visually
    } finally {
      setUpdatingPermission(null);
    }
  };

  // --- Unbind ---
  const handleUnbind = async () => {
    if (!unbindTarget) return;
    setUnbinding(true);
    try {
      await fetchApi(`/api/v1/family/binds/${unbindTarget.id}`, {
        method: 'DELETE',
      });
      setBindList((prev) => prev.filter((b) => b.id !== unbindTarget.id));
      setUnbindTarget(null);
      // Refresh store
      fetchBinds();
    } catch (err) {
      setError(err instanceof Error ? err.message : '解除绑定失败');
    } finally {
      setUnbinding(false);
    }
  };

  if (!isReady) {
    return <div className={styles.loading}>加载中…</div>;
  }

  return (
    <main className={styles.container}>
      {/* Header */}
      <div className={styles.header}>
        <button
          className={styles.backButton}
          onClick={() => router.push(ROUTES.SETTINGS)}
          aria-label="返回设置"
        >
          ‹ 返回
        </button>
        <h1 className={styles.title}>绑定管理</h1>
      </div>

      {/* Error banner */}
      {error && (
        <div className={styles.errorBanner} role="alert">
          {error}
        </div>
      )}

      {/* Existing binds list */}
      <section className={styles.section} aria-label="已绑定列表">
        <h2 className={styles.sectionTitle}>已绑定列表</h2>
        {loading ? (
          <p className={styles.hint}>加载中…</p>
        ) : bindList.length === 0 ? (
          <p className={styles.hint}>暂无绑定关系</p>
        ) : (
          <div className={styles.bindList}>
            {bindList.map((bind) => (
              <div key={bind.id} className={styles.bindCard}>
                <div className={styles.bindCardHeader}>
                  <span className={styles.relation}>{bind.relation || '未知关系'}</span>
                  <span
                    className={`${styles.statusBadge} ${
                      bind.status === 'active' ? styles.statusActive : styles.statusInactive
                    }`}
                  >
                    {bind.status === 'active' ? '已绑定' : bind.status}
                  </span>
                </div>

                {/* Permission toggles */}
                <div className={styles.permissions}>
                  {(Object.keys(PERMISSION_LABELS) as Array<keyof typeof PERMISSION_LABELS>).map(
                    (permKey) => {
                      const value = bind[permKey as keyof FamilyBindResponse] as boolean;
                      const isUpdating = updatingPermission === `${bind.id}-${permKey}`;
                      return (
                        <label key={permKey} className={styles.permissionRow}>
                          <span className={styles.permissionLabel}>
                            {PERMISSION_LABELS[permKey]}
                          </span>
                          <button
                            type="button"
                            role="switch"
                            aria-checked={value}
                            aria-label={`${PERMISSION_LABELS[permKey]} ${value ? '已开启' : '已关闭'}`}
                            className={`${styles.toggle} ${value ? styles.toggleOn : styles.toggleOff}`}
                            disabled={isUpdating}
                            onClick={() => handlePermissionToggle(bind.id, permKey, value)}
                          >
                            <span className={styles.toggleThumb} />
                          </button>
                        </label>
                      );
                    },
                  )}
                </div>

                {/* Unbind button */}
                <button
                  className={styles.unbindButton}
                  onClick={() => setUnbindTarget(bind)}
                >
                  解除绑定
                </button>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* Elder: Generate bind code */}
      {isElder && (
        <section className={styles.section} aria-label="生成绑定码">
          <h2 className={styles.sectionTitle}>生成绑定码</h2>
          <p className={styles.hint}>生成绑定码后，让家属在App中输入即可完成绑定</p>
          <button
            className={styles.generateButton}
            onClick={handleGenerateCode}
            disabled={generating}
          >
            {generating ? '生成中…' : '生成绑定码'}
          </button>
          {generatedCode && (
            <div className={styles.codeDisplay} aria-live="polite">
              <p className={styles.codeLabel}>您的绑定码</p>
              <p className={styles.codeValue}>{generatedCode}</p>
              <p className={styles.codeHint}>请将此码告知家属，有效期内使用</p>
            </div>
          )}
        </section>
      )}

      {/* Family: Enter bind code */}
      {!isElder && (
        <section className={styles.section} aria-label="输入绑定码">
          <h2 className={styles.sectionTitle}>绑定长辈</h2>

          {bindSuccess && (
            <div className={styles.successBanner} role="status">
              绑定成功！
            </div>
          )}

          <div className={styles.formGroup}>
            <label htmlFor="bind-code" className={styles.formLabel}>
              绑定码
            </label>
            <input
              id="bind-code"
              type="text"
              inputMode="numeric"
              pattern="[0-9]*"
              maxLength={6}
              value={bindCode}
              onChange={(e) => {
                setBindCode(e.target.value.replace(/\D/g, ''));
                setBindError(null);
                setBindSuccess(false);
              }}
              placeholder="请输入6位绑定码"
              className={`${styles.formInput} ${bindError ? styles.formInputError : ''}`}
              aria-invalid={!!bindError}
              aria-describedby={bindError ? 'bind-code-error' : undefined}
            />
            {bindError && (
              <p id="bind-code-error" className={styles.formError} role="alert">
                {bindError}
              </p>
            )}
          </div>

          <div className={styles.formGroup}>
            <label htmlFor="relation-select" className={styles.formLabel}>
              关系类型
            </label>
            <div className={styles.relationGrid}>
              {RELATION_OPTIONS.map((rel) => (
                <button
                  key={rel}
                  type="button"
                  className={`${styles.relationChip} ${
                    selectedRelation === rel ? styles.relationChipActive : ''
                  }`}
                  onClick={() => setSelectedRelation(rel)}
                  aria-pressed={selectedRelation === rel}
                >
                  {rel}
                </button>
              ))}
            </div>
          </div>

          <button
            className={styles.bindButton}
            onClick={handleBind}
            disabled={binding || !bindCode.trim()}
          >
            {binding ? '绑定中…' : '绑定'}
          </button>
        </section>
      )}

      {/* Unbind confirmation modal */}
      {unbindTarget && (
        <div
          className={styles.modalOverlay}
          role="dialog"
          aria-modal="true"
          aria-labelledby="unbind-modal-title"
          onClick={() => !unbinding && setUnbindTarget(null)}
        >
          <div className={styles.modalContent} onClick={(e) => e.stopPropagation()}>
            <h2 id="unbind-modal-title" className={styles.modalTitle}>
              确认解除绑定
            </h2>
            <p className={styles.modalMessage}>
              解除与「{unbindTarget.relation || '对方'}」的绑定关系后，将停止数据共享。确定要解除吗？
            </p>
            <div className={styles.modalActions}>
              <button
                className={styles.modalBtnCancel}
                onClick={() => setUnbindTarget(null)}
                disabled={unbinding}
              >
                取消
              </button>
              <button
                className={styles.modalBtnDanger}
                onClick={handleUnbind}
                disabled={unbinding}
              >
                {unbinding ? '解除中…' : '确认解除'}
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}
