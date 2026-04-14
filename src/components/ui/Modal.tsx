import { X } from 'lucide-react';
import { useEffect } from 'react';

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
  footer?: React.ReactNode;
}

export function Modal({ isOpen, onClose, title, children, footer }: ModalProps) {
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }

    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="flex items-end sm:items-center justify-center min-h-screen px-0 sm:px-4 text-center">
        <div
          className="fixed inset-0 bg-black bg-opacity-50 transition-opacity animate-fade-in"
          onClick={onClose}
        />

        <div className="relative inline-block w-full sm:align-middle bg-white rounded-t-2xl sm:rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:max-w-lg sm:w-full max-h-[calc(100vh-env(safe-area-inset-top)-env(safe-area-inset-bottom)-2rem)] flex flex-col animate-slide-in">
          <div className="bg-white px-4 pt-5 pb-4 sm:p-6 border-b border-gray-200 flex-shrink-0">
            <div className="flex items-center justify-between">
              <h3 className="text-lg sm:text-xl font-semibold text-gray-900">{title}</h3>
              <button
                onClick={onClose}
                className="touch-target text-gray-400 hover:text-gray-600 active:text-gray-700 transition p-2"
                aria-label="Close modal"
              >
                <X size={24} />
              </button>
            </div>
          </div>
          <div className="flex-1 overflow-y-auto px-4 py-4 sm:px-6 safe-bottom">
            {children}
          </div>
          {footer && (
            <div className="bg-gray-50 px-4 py-3 sm:px-6 border-t border-gray-200 flex-shrink-0 safe-bottom">
              {footer}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
