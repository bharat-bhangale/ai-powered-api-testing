import { useState, useEffect } from 'react';
import { X, Copy, Check } from 'lucide-react';
import { toast } from 'sonner';
import { apiClient } from '@/services/api';
import styles from './CodeGenerationModal.module.css';

interface CodeGenerationModalProps {
  request: any;
  onClose: () => void;
}

const TARGETS = [
  { id: 'curl', label: 'cURL' },
  { id: 'javascript-fetch', label: 'JavaScript (Fetch)' },
  { id: 'python-requests', label: 'Python (Requests)' },
  { id: 'go-nethttp', label: 'Go (net/http)' },
];

export const CodeGenerationModal = ({ request, onClose }: CodeGenerationModalProps) => {
  const [target, setTarget] = useState('curl');
  const [code, setCode] = useState('');
  const [redactSecrets, setRedactSecrets] = useState(true);
  const [copied, setCopied] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!request) return;
    
    let isMounted = true;
    setLoading(true);

    apiClient.post('/api/code-gen', {
      target,
      request,
      redactSecrets
    })
      .then(res => {
        if (isMounted) {
          setCode(res.data.code);
          setLoading(false);
        }
      })
      .catch(err => {
        if (isMounted) {
          toast.error('Failed to generate code');
          setLoading(false);
        }
      });

    return () => { isMounted = false; };
  }, [target, request, redactSecrets]);

  const handleCopy = () => {
    navigator.clipboard.writeText(code).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
      toast.success('Copied to clipboard');
    });
  };

  return (
    <div className={styles.overlay} onClick={onClose}>
      <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
        <div className={styles.header}>
          <h2>Generate Code</h2>
          <button className={styles.closeButton} onClick={onClose} type="button">
            <X size={20} />
          </button>
        </div>
        
        <div className={styles.content}>
          <div className={styles.controls}>
            <select 
              className={styles.select} 
              value={target} 
              onChange={(e) => setTarget(e.target.value)}
            >
              {TARGETS.map(t => (
                <option key={t.id} value={t.id}>{t.label}</option>
              ))}
            </select>

            <label className={styles.checkboxLabel}>
              <input 
                type="checkbox" 
                checked={redactSecrets}
                onChange={(e) => setRedactSecrets(e.target.checked)}
              />
              Redact Secrets
            </label>
          </div>

          <div className={styles.codeContainer}>
            <button className={styles.copyButton} onClick={handleCopy} type="button">
              {copied ? <Check size={14} /> : <Copy size={14} />}
              {copied ? 'Copied' : 'Copy'}
            </button>
            <pre>
              {loading ? 'Generating...' : code}
            </pre>
          </div>
        </div>
      </div>
    </div>
  );
};
