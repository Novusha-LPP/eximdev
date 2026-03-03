import { useState, useCallback } from 'react';
import axios from 'axios';
import { message } from 'antd';

const BASE = `${process.env.REACT_APP_API_STRING}/crm`;

export function useKyc() {
  const [loading, setLoading] = useState(false);

  const request = useCallback(async (method, path, payload) => {
    setLoading(true);
    try {
      const res = await axios({ method, url: `${BASE}${path}`, data: payload, withCredentials: true });
      return res.data;
    } catch (err) {
      const msg = err?.response?.data?.message || 'An error occurred. Please try again.';
      message.error(msg);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  // ─── Stats ──────────────────────────────────────────────────
  const getStats = useCallback(() => request('GET', '/stats'), [request]);

  // ─── Suspects ───────────────────────────────────────────────
  const getSuspects = useCallback(() => request('GET', '/suspects'), [request]);
  const createSuspect = useCallback(data => request('POST', '/suspects', data), [request]);
  const updateSuspect = useCallback((id, data) => request('PUT', `/suspects/${id}`, data), [request]);
  const deleteSuspect = useCallback(id => request('DELETE', `/suspects/${id}`), [request]);
  const submitSuspect = useCallback(id => request('POST', `/suspects/${id}/submit`), [request]);
  const checkIec = useCallback(async iec => {
    const res = await axios.get(`${BASE}/suspects?checkIec=${iec}`, { withCredentials: true });
    return res.data.exists;
  }, []);

  // ─── Prospects ──────────────────────────────────────────────
  const getProspects = useCallback(filter => {
    const q = filter ? `?filter=${encodeURIComponent(filter)}` : '';
    return request('GET', `/prospects${q}`);
  }, [request]);
  const getProspect = useCallback(id => request('GET', `/prospects/${id}`), [request]);
  const updateProspect = useCallback((id, data) => request('PUT', `/prospects/${id}`, data), [request]);
  const approveProspect = useCallback((id, approved_by) => request('POST', `/prospects/${id}/approve`, { approved_by }), [request]);
  const revisionProspect = useCallback((id, remarks) => request('POST', `/prospects/${id}/revision`, { remarks }), [request]);
  const escalateProspect = useCallback((id, remarks) => request('POST', `/prospects/${id}/escalate`, { remarks }), [request]);
  const hodApproveProspect = useCallback((id, approved_by) => request('POST', `/prospects/${id}/hod-approve`, { approved_by }), [request]);

  // ─── Customers ──────────────────────────────────────────────
  const getCustomers = useCallback(params => {
    const q = new URLSearchParams(params || {}).toString();
    return request('GET', `/customers${q ? `?${q}` : ''}`);
  }, [request]);
  const getCustomer    = useCallback(id       => request('GET',   `/customers/${id}`),        [request]);
  const updateCustomer = useCallback((id, data)=> request('PUT',   `/customers/${id}`, data),  [request]);

  // ─── Open Points ────────────────────────────────────────────
  const getOpenPoints    = useCallback(id         => request('GET',   `/customers/${id}/open-points`),                       [request]);
  const addOpenPoint     = useCallback((id, data) => request('POST',  `/customers/${id}/open-points`, data),                [request]);
  const resolveOpenPoint = useCallback((id, idx, data) => request('PATCH', `/customers/${id}/open-points/${idx}/resolve`, data), [request]);

  return {
    loading,
    getStats,
    getSuspects, createSuspect, updateSuspect, deleteSuspect, submitSuspect, checkIec,
    getProspects, getProspect, updateProspect, approveProspect, revisionProspect, escalateProspect, hodApproveProspect,
    getCustomers, getCustomer, updateCustomer,
    getOpenPoints, addOpenPoint, resolveOpenPoint,
  };
}
