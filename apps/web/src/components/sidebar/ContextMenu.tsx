import { useEffect, useRef } from 'react';
import { Pencil, Trash2, Copy, FolderInput, BarChart3 } from 'lucide-react';
import styles from './ContextMenu.module.css';

export type ContextMenuAction = 'rename' | 'delete' | 'duplicate' | 'addFolder' | 'move' | 'export' | 'profile' | 'diff';

interface ContextMenuItem {
  action: ContextMenuAction;
  label: string;
  icon: React.ReactNode;
  danger?: boolean;
}

interface ContextMenuProps {
  x: number;
  y: number;
  items: ContextMenuItem[];
  onAction: (action: ContextMenuAction) => void;
  onClose: () => void;
}

/**
 * Right-click context menu for sidebar tree items.
 */
export const ContextMenu = ({ x, y, items, onAction, onClose }: ContextMenuProps) => {
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        onClose();
      }
    };
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };

    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('keydown', handleEsc);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleEsc);
    };
  }, [onClose]);

  // Adjust position to stay within viewport
  const adjustedX = Math.min(x, window.innerWidth - 180);
  const adjustedY = Math.min(y, window.innerHeight - items.length * 36 - 16);

  return (
    <div
      ref={menuRef}
      className={styles.menu}
      style={{ left: adjustedX, top: adjustedY }}
    >
      {items.map((item) => (
        <button
          key={item.action}
          className={`${styles.menuItem} ${item.danger ? styles.danger : ''}`}
          onClick={() => {
            onAction(item.action);
            onClose();
          }}
          type="button"
        >
          <span className={styles.menuIcon}>{item.icon}</span>
          <span>{item.label}</span>
        </button>
      ))}
    </div>
  );
};

/** Context menu items for collections */
export const COLLECTION_MENU_ITEMS: ContextMenuItem[] = [
  { action: 'profile', label: '📊 Performance Profile', icon: <BarChart3 size={13} /> },
  { action: 'diff', label: '🔬 API Diff & Changes', icon: <BarChart3 size={13} /> },
  { action: 'export', label: 'Export Collection', icon: <FolderInput size={13} /> },
  { action: 'rename', label: 'Rename', icon: <Pencil size={13} /> },
  { action: 'addFolder', label: 'Add Folder', icon: <FolderInput size={13} /> },
  { action: 'delete', label: 'Delete', icon: <Trash2 size={13} />, danger: true },
];

/** Context menu items for folders */
export const FOLDER_MENU_ITEMS: ContextMenuItem[] = [
  { action: 'rename', label: 'Rename', icon: <Pencil size={13} /> },
  { action: 'delete', label: 'Delete', icon: <Trash2 size={13} />, danger: true },
];

/** Context menu items for requests */
export const REQUEST_MENU_ITEMS: ContextMenuItem[] = [
  { action: 'export', label: 'Export as cURL', icon: <Copy size={13} /> },
  { action: 'duplicate', label: 'Duplicate', icon: <Copy size={13} /> },
  { action: 'delete', label: 'Delete', icon: <Trash2 size={13} />, danger: true },
];
