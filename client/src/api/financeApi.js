export const API_BASE = "";
import axios from "axios";

const API = `/api/finance`;

// ---------- HEADS ----------

// Get all finance heads for the current farm
export const getFinanceHeads = async () => {
  const farm = localStorage.getItem("farm");

  return axios.get(`${API}/heads`, {
    params: { farm },
  });
};

// Get a single head
export const getFinanceHead = async (id) => {
  return axios.get(`${API}/heads/${id}`);
};

// Add a finance head
export const addFinanceHead = async (headData) => {
  const farm = localStorage.getItem("farm");

  return axios.post(`${API}/heads`, { ...headData, farm });
};

// Update a finance head
export const updateFinanceHead = async (id, headData) => {
  return axios.put(`${API}/heads/${id}`, headData);
};

// Delete a finance head
export const deleteFinanceHead = async (id) => {
  return axios.delete(`${API}/heads/${id}`);
};

// ---------- ALLOCATIONS ----------

// Get allocations (optionally for one head)
export const getAllocations = async (headId) => {
  const farm = localStorage.getItem("farm");

  return axios.get(`${API}/allocations`, { params: { farm, headId } });
};

// Add an allocation (each save creates a separate entry)
export const addAllocation = async (data) => {
  const farm = localStorage.getItem("farm");

  return axios.post(`${API}/allocations`, { ...data, farm });
};

// Update an allocation
export const updateAllocation = async (id, data) => {
  return axios.put(`${API}/allocations/${id}`, data);
};

// Delete an allocation
export const deleteAllocation = async (id) => {
  return axios.delete(`${API}/allocations/${id}`);
};

// ---------- BILLS ----------

// Get bills (optionally for one head)
export const getBills = async (headId) => {
  const farm = localStorage.getItem("farm");

  return axios.get(`${API}/bills`, {
    params: { farm, headId },
  });
};

// Add a bill (multipart — supports bill picture)
export const addBill = async (billData, billPic) => {
  const farm = localStorage.getItem("farm");

  const fd = new FormData();
  fd.append("farm", farm || "");
  Object.entries(billData).forEach(([k, v]) => fd.append(k, v ?? ""));
  if (billPic) fd.append("billPic", billPic);

  return axios.post(`${API}/bills`, fd);
};

// Update a bill
export const updateBill = async (id, billData, billPic) => {
  const fd = new FormData();
  Object.entries(billData).forEach(([k, v]) => fd.append(k, v ?? ""));
  if (billPic) fd.append("billPic", billPic);

  return axios.put(`${API}/bills/${id}`, fd);
};

// Delete a bill
export const deleteBill = async (id) => {
  return axios.delete(`${API}/bills/${id}`);
};

// ---------- CONTINGENT BILLS (voucher-style, informational only) ----------

// Get contingent bills (optionally filtered by month/year/headId)
export const getContingentBills = async (filters = {}) => {
  const farm = localStorage.getItem("farm");

  return axios.get(`${API}/contingent-bills`, {
    params: { farm, ...filters },
  });
};

// Get a single contingent bill (with its line items)
export const getContingentBill = async (id) => {
  return axios.get(`${API}/contingent-bills/${id}`);
};

// Add a contingent bill (header + line items)
export const addContingentBill = async (data) => {
  const farm = localStorage.getItem("farm");

  return axios.post(`${API}/contingent-bills`, {
    ...data,
    farm,
    items: JSON.stringify(data.items || []),
  });
};

// Update a contingent bill
export const updateContingentBill = async (id, data) => {
  return axios.put(`${API}/contingent-bills/${id}`, {
    ...data,
    items: JSON.stringify(data.items || []),
  });
};

// Delete a contingent bill
export const deleteContingentBill = async (id) => {
  return axios.delete(`${API}/contingent-bills/${id}`);
};

// Mark a contingent bill as printed (after it's actually sent to the printer)
export const markContingentBillPrinted = async (id) => {
  return axios.patch(`${API}/contingent-bills/${id}/mark-printed`);
};
