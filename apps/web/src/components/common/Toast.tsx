import React from 'react';
import { Toaster, toast as hotToast } from 'react-hot-toast';
import { motion, AnimatePresence } from 'framer-motion';
import {
  CheckCircle,
  XCircle,
  AlertCircle,
  Info,
  X,
  Loader2,
} from 'lucide-react';

interface ToastOptions {
  duration?: number;
  position?: 'top-left' | 'top-center' | 'top-right' | 'bottom-left' | 'bottom-center' | 'bottom-right';
}

interface ToastContentProps {
  message: string;
  description?: string;
  type: 'success' | 'error' | 'warning' | 'info' | 'loading';
  onDismiss?: () => void;
}

const iconMap = {
  success: <CheckCircle className="w-5 h-5 text-green-400" />,
  error: <XCircle className="w-5 h-5 text-red-400" />,
  warning: <AlertCircle className="w-5 h-5 text-yellow-400" />,
  info: <Info className="w-5 h-5 text-blue-400" />,
  loading: <Loader2 className="w-5 h-5 text-blue-400 animate-spin" />,
};

const bgMap = {
  success: 'bg-green-500/10 border-green-500/30',
  error: 'bg-red-500/10 border-red-500/30',
  warning: 'bg-yellow-500/10 border-yellow-500/30',
  info: 'bg-blue-500/10 border-blue-500/30',
  loading: 'bg-blue-500/10 border-blue-500/30',
};

const ToastContent: React.FC<ToastContentProps> = ({
  message,
  description,
  type,
  onDismiss,
}) => (
  <motion.div
    initial={{ opacity: 0, y: -20, scale: 0.95 }}
    animate={{ opacity: 1, y: 0, scale: 1 }}
    exit={{ opacity: 0, y: -20, scale: 0.95 }}
    className={`flex items-start gap-3 p-4 rounded-xl border backdrop-blur-xl ${bgMap[type]} shadow-xl min-w-[300px] max-w-md`}
  >
    <div className="flex-shrink-0 mt-0.5">{iconMap[type]}</div>
    <div className="flex-1 min-w-0">
      <p className="text-sm font-medium text-white">{message}</p>
      {description && (
        <p className="text-xs text-gray-400 mt-1">{description}</p>
      )}
    </div>
    {onDismiss && type !== 'loading' && (
      <button
        onClick={onDismiss}
        className="flex-shrink-0 p-1 hover:bg-white/10 rounded-lg transition-colors"
      >
        <X className="w-4 h-4 text-gray-400" />
      </button>
    )}
  </motion.div>
);

// Toast functions
export const toast = {
  success: (message: string, description?: string, options?: ToastOptions) => {
    return hotToast.custom(
      (t) => (
        <ToastContent
          message={message}
          description={description}
          type="success"
          onDismiss={() => hotToast.dismiss(t.id)}
        />
      ),
      {
        duration: options?.duration || 4000,
        position: options?.position || 'top-right',
      }
    );
  },

  error: (message: string, description?: string, options?: ToastOptions) => {
    return hotToast.custom(
      (t) => (
        <ToastContent
          message={message}
          description={description}
          type="error"
          onDismiss={() => hotToast.dismiss(t.id)}
        />
      ),
      {
        duration: options?.duration || 5000,
        position: options?.position || 'top-right',
      }
    );
  },

  warning: (message: string, description?: string, options?: ToastOptions) => {
    return hotToast.custom(
      (t) => (
        <ToastContent
          message={message}
          description={description}
          type="warning"
          onDismiss={() => hotToast.dismiss(t.id)}
        />
      ),
      {
        duration: options?.duration || 4000,
        position: options?.position || 'top-right',
      }
    );
  },

  info: (message: string, description?: string, options?: ToastOptions) => {
    return hotToast.custom(
      (t) => (
        <ToastContent
          message={message}
          description={description}
          type="info"
          onDismiss={() => hotToast.dismiss(t.id)}
        />
      ),
      {
        duration: options?.duration || 4000,
        position: options?.position || 'top-right',
      }
    );
  },

  loading: (message: string, description?: string) => {
    return hotToast.custom(
      () => (
        <ToastContent
          message={message}
          description={description}
          type="loading"
        />
      ),
      {
        duration: Infinity,
        position: 'top-right',
      }
    );
  },

  promise: <T,>(
    promise: Promise<T>,
    messages: {
      loading: string;
      success: string | ((data: T) => string);
      error: string | ((err: Error) => string);
    },
    options?: ToastOptions
  ) => {
    return hotToast.promise(
      promise,
      {
        loading: messages.loading,
        success: messages.success,
        error: messages.error,
      },
      {
        duration: options?.duration || 4000,
        position: options?.position || 'top-right',
        style: {
          background: 'rgba(30, 30, 40, 0.95)',
          backdropFilter: 'blur(16px)',
          color: 'white',
          border: '1px solid rgba(255, 255, 255, 0.1)',
          borderRadius: '12px',
          padding: '16px',
        },
        success: {
          icon: <CheckCircle className="w-5 h-5 text-green-400" />,
        },
        error: {
          icon: <XCircle className="w-5 h-5 text-red-400" />,
        },
        loading: {
          icon: <Loader2 className="w-5 h-5 text-blue-400 animate-spin" />,
        },
      }
    );
  },

  dismiss: (id?: string) => {
    if (id) {
      hotToast.dismiss(id);
    } else {
      hotToast.dismiss();
    }
  },
};

// Toast Provider component
export const ToastProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  return (
    <>
      {children}
      <Toaster
        position="top-right"
        gutter={12}
        containerStyle={{
          top: 80,
        }}
        toastOptions={{
          duration: 4000,
        }}
      />
    </>
  );
};

export default ToastProvider;
