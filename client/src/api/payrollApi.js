import axios from "axios";

const API = "/api/payroll";

// Update Salary -> "Load Employee" (active employees only, current farm)
export const getActiveEmployees = () => {
  const farm = localStorage.getItem("farm");
  return axios.get(`${API}/active-employees`, { params: { farm } });
};

// Check whether a salary batch already exists for this farm/month/year
export const checkBatchExists = (month, year) => {
  const farm = localStorage.getItem("farm");
  return axios.get(`${API}/batch-exists`, { params: { farm, month, year } });
};

// Generate Salary -> save the calculated batch
export const generateSalary = (month, year, rows) => {
  const farm = localStorage.getItem("farm");
  return axios.post(`${API}/generate`, { farm, month, year, rows });
};

// Report Salary -> list a generated batch
export const getSalaryReport = (month, year) => {
  const farm = localStorage.getItem("farm");
  return axios.get(`${API}/report`, { params: { farm, month, year } });
};

// List all generated batches for this farm (Undo Salary picker)
export const getSalaryBatches = () => {
  const farm = localStorage.getItem("farm");
  return axios.get(`${API}/batches`, { params: { farm } });
};

// List the individual employees inside one generated batch (Undo Salary - single employee list)
export const getBatchEmployees = (month, year) => {
  const farm = localStorage.getItem("farm");
  return axios.get(`${API}/batch-employees`, { params: { farm, month, year } });
};

// Undo Salary -> delete a generated batch
export const undoSalary = (month, year) => {
  const farm = localStorage.getItem("farm");
  return axios.delete(`${API}/undo`, { params: { farm, month, year } });
};

// Undo Salary -> delete a single employee's payroll entry
export const undoEmployeeSalary = (payrollId) => {
  return axios.delete(`${API}/undo-employee/${payrollId}`);
};
