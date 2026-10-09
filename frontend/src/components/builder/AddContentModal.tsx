'use client';
import Icon from '../Icon';
import Modal from '../Modal';
import { COMING_SOON_TYPES, QUESTION_TYPES } from '@/lib/questionTypes';
import type { QType } from '@/lib/types';

export default function AddContentModal({ onPick, onClose }: { onPick: (t: QType) => void; onClose: () => void }) {
  const groups = Array.from(new Set(QUESTION_TYPES.map((t) => t.group)));
  return (
    <Modal title="Add content" onClose={onClose} width={620}>
      {groups.map((g) => (
        <div key={g}>
          <div className="group-h">{g}</div>
          <div className="type-grid">
            {QUESTION_TYPES.filter((t) => t.group === g).map((t) => (
              <button key={t.type} className="type-btn" onClick={() => onPick(t.type)}>
                <span className="qicon" style={{ background: t.color }}><Icon name={t.icon} size={18} /></span>{t.label}
              </button>
            ))}
          </div>
        </div>
      ))}
      <div className="group-h">More</div>
      <div className="type-grid">
        {COMING_SOON_TYPES.map((t) => (
          <button key={t.label} className="type-btn" disabled title="Coming soon">
            <span className="qicon" style={{ background: t.color }}><Icon name={t.icon} size={18} /></span>
            <span>{t.label}<br /><span className="pill soon">Coming soon</span></span>
          </button>
        ))}
      </div>
    </Modal>
  );
}
