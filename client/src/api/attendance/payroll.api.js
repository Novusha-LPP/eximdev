import apiClient from '../attendanceApiClient';

const payrollAPI = {
  // ─── Employee Payroll Configuration ────────────────────────────────────────
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

  toggleEmployeeOperatorStatus: async (data) => {
    const response = await apiClient.post('/payroll/config/toggle-operator', data);
    return response.data;
  },

  // ─── Payroll Run ───────────────────────────────────────────────────────────
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

  // ─── Salary Structure ──────────────────────────────────────────────────────
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

  // ─── Export ────────────────────────────────────────────────────────────────
  exportPayrollExcel: async (runId) => {
    const response = await apiClient.get(`/payroll/export/${runId}`);
    return response.data;
  },

  // ─── Profile Update ────────────────────────────────────────────────────────
  updateUserProfile: async (employeeId, profileData) => {
    const response = await apiClient.put(`/payroll/users/${employeeId}/profile`, profileData);
    return response.data;
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // Dashboard & Analytics (NEW)
  // ═══════════════════════════════════════════════════════════════════════════

  getDashboardKPIs: async (companyId, year, month) => {
    const response = await apiClient.get('/payroll/dashboard/kpis', {
      params: { companyId, year, month }
    });
    return response.data;
  },

  // ─── Payroll Entries (Entry Screen) ────────────────────────────────────────
  getPayrollEntries: async (companyId, year, month) => {
    const response = await apiClient.get(`/payroll/dashboard/entries/${companyId}/${year}/${month}`);
    return response.data;
  },

  updatePayrollEntry: async (summaryId, data) => {
    const response = await apiClient.put(`/payroll/dashboard/entry/${summaryId}`, data);
    return response.data;
  },

  // ─── Reports ───────────────────────────────────────────────────────────────
  getSalaryRegister: async (companyId, year, month) => {
    const response = await apiClient.get(`/payroll/reports/salary-register/${companyId}/${year}/${month}`);
    return response.data;
  },

  getPFReport: async (companyId, year, month) => {
    const response = await apiClient.get(`/payroll/reports/pf/${companyId}/${year}/${month}`);
    return response.data;
  },

  getESIReport: async (companyId, year, month) => {
    const response = await apiClient.get(`/payroll/reports/esi/${companyId}/${year}/${month}`);
    return response.data;
  },

  getPTReport: async (companyId, year, month) => {
    const response = await apiClient.get(`/payroll/reports/pt/${companyId}/${year}/${month}`);
    return response.data;
  },

  getDepartmentReport: async (companyId, year, month) => {
    const response = await apiClient.get(`/payroll/reports/department/${companyId}/${year}/${month}`);
    return response.data;
  },

  // ─── Payslip ───────────────────────────────────────────────────────────────
  getPayslipData: async (summaryId) => {
    const response = await apiClient.get(`/payroll/payslip/${summaryId}/data`);
    return response.data;
  },

  getBulkPayslipData: async (runId) => {
    const response = await apiClient.post('/payroll/payslips/bulk', { runId });
    return response.data;
  },

  // ─── Bank Transfer ─────────────────────────────────────────────────────────
  getBankTransferData: async (runId) => {
    const response = await apiClient.get(`/payroll/bank-transfer/${runId}`);
    return response.data;
  },

  // ─── Statutory Config ──────────────────────────────────────────────────────
  getStatutoryConfig: async (companyId) => {
    const response = await apiClient.get(`/payroll/statutory-config/${companyId}`);
    return response.data;
  },

  updateStatutoryConfig: async (companyId, configData) => {
    const response = await apiClient.put(`/payroll/statutory-config/${companyId}`, configData);
    return response.data;
  },

  // ─── Payroll Master ────────────────────────────────────────────────────────
  getPayrollMasterList: async (companyId) => {
    const response = await apiClient.get('/payroll/master/employees', {
      params: { companyId }
    });
    return response.data;
  }
};

export default payrollAPI;
