import axios from "axios";

const API = "/api/employees";

// Get All Employees (optionally filtered by farm + search term)
export const getEmployees = async (search) => {
  const farm = localStorage.getItem("farm");

  const response = await axios.get(API, {
    params: {
      farm,
      search: search || undefined,
    },
  });

  return response;
};

// Get Single Employee
export const getEmployee = async (id) => {
  return axios.get(`${API}/${id}`);
};

// Build a FormData payload from a plain employee object.
// Any field that is a File (from an <input type="file">) is appended as a
// real file; everything else is appended as text so the server's multer
// middleware can parse both in the same multipart request.
function buildFormData(employeeData) {
  const formData = new FormData();

  Object.entries(employeeData).forEach(([key, value]) => {
    if (value === null || value === undefined) return;

    // Skip File fields that are actually just an existing string URL
    // (e.g. "/uploads/xyz.jpg") coming back from the server on edit -
    // those don't need to be re-uploaded.
    if (value instanceof File) {
      formData.append(key, value);
    } else if (typeof value !== "object") {
      formData.append(key, value);
    }
  });

  return formData;
}

// Add Employee
export const addEmployee = async (employeeData) => {
  employeeData.farm = localStorage.getItem("farm");

  const formData = buildFormData(employeeData);

  return axios.post(API, formData, {
    headers: { "Content-Type": "multipart/form-data" },
  });
};

// Update Employee
export const updateEmployee = async (id, employeeData) => {
  const formData = buildFormData(employeeData);

  return axios.put(`${API}/${id}`, formData, {
    headers: { "Content-Type": "multipart/form-data" },
  });
};

// Delete Employee
export const deleteEmployee = async (id) => {
  return axios.delete(`${API}/${id}`);
};

// Delete a single document (photo / cnicCopy / policeVerification)
export const deleteEmployeeDocument = async (id, type) => {
  return axios.delete(`${API}/${id}/document/${type}`);
};
