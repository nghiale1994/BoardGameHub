import { useCallback, useState } from "react";

type ConfirmOptions = {
  title: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
};

export const useConfirm = (onConfirm?: () => void) => {
  const [open, setOpen] = useState(false);
  const [options, setOptions] = useState<ConfirmOptions | null>(null);

  const confirm = useCallback((opts: ConfirmOptions) => {
    setOptions(opts);
    setOpen(true);
  }, []);

  const handleConfirm = useCallback(() => {
    if (onConfirm) onConfirm();
    setOpen(false);
    setOptions(null);
  }, [onConfirm]);

  const handleCancel = useCallback(() => {
    setOpen(false);
    setOptions(null);
  }, []);

  return {
    open,
    options,
    confirm,
    handleConfirm,
    handleCancel
  };
};
