import axios from "axios";

const API = `/api/ledger`;

// ---------- GENERAL LEDGER ----------
export const getGeneralLedger = (params = {}) => {
  const farm = localStorage.getItem("farm");
  return axios.get(`${API}/general`, { params: { farm, ...params } });
};

// ---------- PARTY LEDGER ----------
export const getPartyLedger = (party, params = {}) => {
  const farm = localStorage.getItem("farm");
  return axios.get(`${API}/party`, { params: { farm, party, ...params } });
};

export const getPartyLedgerSummary = (party = "", params = {}) => {
  const farm = localStorage.getItem("farm");
  return axios.get(`${API}/party-summary`, { params: { farm, party, ...params } });
};

export const getBalanceSheet = (params = {}) => {
  const farm = localStorage.getItem("farm");
  return axios.get(`${API}/balance-sheet`, { params: { farm, ...params } });
};

// ---------- PARTIES ----------
export const getParties = () => {
  const farm = localStorage.getItem("farm");
  return axios.get(`${API}/parties`, { params: { farm } });
};

export const addParty = (data) => {
  const farm = localStorage.getItem("farm");
  return axios.post(`${API}/parties`, { ...data, farm });
};

export const updateParty = (id, data) => axios.put(`${API}/parties/${id}`, data);

export const deleteParty = (id) => axios.delete(`${API}/parties/${id}`);

// ---------- MANUAL ENTRIES ----------
export const getLedgerEntries = () => {
  const farm = localStorage.getItem("farm");
  return axios.get(`${API}/entries`, { params: { farm } });
};

export const addLedgerEntry = (data) => {
  const farm = localStorage.getItem("farm");
  return axios.post(`${API}/entries`, { ...data, farm });
};

export const updateLedgerEntry = (id, data) => axios.put(`${API}/entries/${id}`, data);

export const deleteLedgerEntry = (id) => axios.delete(`${API}/entries/${id}`);
