import { toast } from "react-toastify";

export const toastSuccess = (message) =>
  toast.success(message);

export const toastError = (message) =>
  toast.error(message);

export const toastWarning = (message) =>
  toast.warning(message);

export const toastInfo = (message) =>
  toast.info(message);