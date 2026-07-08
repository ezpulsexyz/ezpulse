import Toast from "./Toast";

interface SuccessToastProps {
  message: string;
  onClose: () => void;
}

export default function SuccessToast({ message, onClose }: SuccessToastProps) {
  return <Toast type="success" message={message} onClose={onClose} />;
}