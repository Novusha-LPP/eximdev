import apiClient from '../attendanceApiClient';

const payrollAPI = {
  getEmployeePayrollConfig: async (employeeId) => {
    const response = await apiClient.get(`/payroll/config/${employeeId}`);
    return response.data;
  },

  updateEmployeePayrollConfig: async (employeeId, configData) => {
    const response = await apiClient.put(`/payroll/config/${employeeId}`, configData);
    return response.data;
  },

  getPayrollConfigHistory: async (employeeId) => {
    const response = await apiClient.get(`/payroll/config-history/${employeeId}`);
    return response.data;
  },

  generatePayroll: async (data) => {
    const response = await apiClient.post('/payroll/generate', data);
    return response.data;
  },

  getPayrollRun: async (companyId, year, month) => {
    const response = await apiClient.get(`/payroll/run/${companyId}/${year}/${month}`);
    return response.data;
  },

  getPayrollSummaries: async (runId) => {
    const response = await apiClient.get(`/payroll/summaries/${runId}`);
    return response.data;
  },

  getEmployeePayrollSummary: async (employeeId, year, month) => {
    const response = await apiClient.get(`/payroll/summary/${employeeId}/${year}/${month}`);
    return response.data;
  },

  lockPayrollRun: async (runId) => {
    const response = await apiClient.post(`/payroll/lock/${runId}`);
    return response.data;
  },

  unlockPayrollRun: async (runId) => {
    const response = await apiClient.post(`/payroll/unlock/${runId}`);
    return response.data;
  },

  getSalaryStructure: async (employeeId) => {
    const response = await apiClient.get(`/payroll/salary-structure/${employeeId}`);
    return response.data;
  },

  saveSalaryStructure: async (employeeId, structureData) => {
    const response = await apiClient.put(`/payroll/salary-structure/${employeeId}`, structureData);
    return response.data;
  },

  getSalaryStructureHistory: async (employeeId) => {
    const response = await apiClient.get(`/payroll/salary-structure-history/${employeeId}`);
    return response.data;
  },

  exportPayrollExcel: async (runId) => {
    const response = await apiClient.get(`/payroll/export/${runId}`);
    return response.data;
  }
};

export default payrollAPI;
