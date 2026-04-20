export type ToastType = 'success' | 'info' | 'warning';

export const showToast = (message: string, type: ToastType = 'info') => {
  const colors = {
    success: { bg: '#EAF3DE', text: '#27500A', border: '#C0DD97' },
    info:    { bg: '#E6F1FB', text: '#0C447C', border: '#B5D4F4' },
    warning: { bg: '#FAEEDA', text: '#633806', border: '#FAC775' },
  };
  
  const theme = colors[type];
  
  // Remove existing toasts if there are 2 already
  const existingToasts = document.querySelectorAll('.gentabs-toast');
  if (existingToasts.length >= 2) {
    existingToasts[0].remove();
  }

  const toast = document.createElement('div');
  toast.className = 'gentabs-toast';
  toast.style.position = 'fixed';
  toast.style.bottom = '24px';
  toast.style.left = '50%';
  toast.style.transform = 'translate(-50%, 20px)';
  toast.style.opacity = '0';
  toast.style.backgroundColor = theme.bg;
  toast.style.color = theme.text;
  toast.style.border = `1px solid ${theme.border}`;
  toast.style.padding = '12px 24px';
  toast.style.borderRadius = '8px';
  toast.style.boxShadow = '0 8px 16px rgba(0,0,0,0.1)';
  toast.style.zIndex = '99999';
  toast.style.fontWeight = '600';
  toast.style.fontSize = '14px';
  toast.style.transition = 'all 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275)';
  
  // Stack calculation based on existing
  const newIndex = document.querySelectorAll('.gentabs-toast').length;
  const bottomOffset = 24 + (newIndex * 60);
  toast.style.bottom = `${bottomOffset}px`;

  toast.textContent = message;
  document.body.appendChild(toast);

  // Animate in
  setTimeout(() => {
    toast.style.transform = 'translate(-50%, 0)';
    toast.style.opacity = '1';
  }, 10);

  // Auto-remove
  setTimeout(() => {
    toast.style.transform = 'translate(-50%, 20px)';
    toast.style.opacity = '0';
    setTimeout(() => toast.remove(), 300);
  }, 2500);
};
