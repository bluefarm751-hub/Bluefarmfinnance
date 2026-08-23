import axios from "axios";

const API = `/api/cashbook`;

// Both farms share one bank account, so the cash book always shows both farms.
// The "farm" param is only used by the Farm-wise report filter.

export const getCashSummary = (upto) => axios.get(`${API}/summary`, { params: { upto } });

export const getReceipts = (params) => axios.get(`${API}/receipts`, { params });
export const addReceipt = (data) =>
  axios.post(`${API}/receipts`, { ...data, farm: data.farm || localStorage.getItem("farm") });
export const deleteReceipt = (id) => axios.delete(`${API}/receipts/${id}`);

export const getPayments = (params) => axios.get(`${API}/payments`, { params });

export const getWithdrawals = (params) => axios.get(`${API}/withdrawals`, { params });
export const addWithdrawal = (data) =>
  axios.post(`${API}/withdrawals`, { ...data, farm: data.farm || localStorage.getItem("farm") });
export const deleteWithdrawal = (id) => axios.delete(`${API}/withdrawals/${id}`);

export const getBankDeposits = (params) => axios.get(`${API}/bank-deposits`, { params });
export const addBankDeposit = (data) =>
  axios.post(`${API}/bank-deposits`, { ...data, farm: data.farm || localStorage.getItem("farm") });
export const deleteBankDeposit = (id) => axios.delete(`${API}/bank-deposits/${id}`);

export const getHoRemittances = (params) => axios.get(`${API}/ho-remittances`, { params });
export const addHoRemittance = (data) =>
  axios.post(`${API}/ho-remittances`, { ...data, farm: data.farm || localStorage.getItem("farm") });
export const updateHoRemittance = (id, data) => axios.put(`${API}/ho-remittances/${id}`, data);
export const deleteHoRemittance = (id) => axios.delete(`${API}/ho-remittances/${id}`);

export const getTRs = (params) => axios.get(`${API}/trs`, { params });
export const addTR = (data) =>
  axios.post(`${API}/trs`, { ...data, farm: data.farm || localStorage.getItem("farm") });
export const updateTR = (id, data) => axios.put(`${API}/trs/${id}`, data);
export const deleteTR = (id) => axios.delete(`${API}/trs/${id}`);

export const getClosingSummary = (date) => axios.get(`${API}/closing-summary`, { params: { date } });
export const getClosings = (params) => axios.get(`${API}/closings`, { params });
export const saveClosing = (data) =>
  axios.post(`${API}/closings`, { ...data, farm: data.farm || localStorage.getItem("farm") });
export const deleteClosing = (id) => axios.delete(`${API}/closings/${id}`);

// ---------- MONTHLY CLOSING ----------
export const getMonthlySummary = (month, year) =>
  axios.get(`${API}/monthly-summary`, { params: { month, year } });
export const getMonthlyClosings = (params) => axios.get(`${API}/monthly-closings`, { params });
export const getMonthlyClosing = (id) => axios.get(`${API}/monthly-closings/${id}`);
export const saveMonthlyClosing = (data) =>
  axios.post(`${API}/monthly-closings`, { ...data, farm: data.farm || localStorage.getItem("farm") });
export const deleteMonthlyClosing = (id) => axios.delete(`${API}/monthly-closings/${id}`);

export const getStatement = (params) => axios.get(`${API}/statement`, { params });
