// frontend/src/hooks/useWarehouseReturns.js
import { useState, useEffect, useCallback } from "react";
import { getWarehouseReturns, getWarehouseStats } from "../utils/warehouseApi";

export default function useWarehouseReturns(token, filterLabel, page, limit) {
  const [returns, setReturns] = useState([]);
  const [total, setTotal] = useState(0);
  const [stats, setStats] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchStats = useCallback(async () => {
    if (!token) return;
    try {
      const statsData = await getWarehouseStats(token);
      setStats(statsData);
    } catch (err) {
      console.error("Error fetching stats:", err);
    }
  }, [token]);

  const fetchReturns = useCallback(async () => {
    if (!token) return;
    setIsLoading(true);
    setError(null);
    try {
      const returnsData = await getWarehouseReturns(token, filterLabel, page, limit);
      setReturns(returnsData.items || []);
      setTotal(returnsData.total || 0);
    } catch (err) {
      setError(err.message || "Failed to load returns");
    } finally {
      setIsLoading(false);
    }
  }, [token, filterLabel, page, limit]);

  useEffect(() => {
    if (token) {
      fetchStats();
    }
  }, [token, fetchStats]);

  useEffect(() => {
    if (token) {
      fetchReturns();
    }
  }, [token, fetchReturns]);

  return {
    returns,
    total,
    stats,
    isLoading,
    error,
    refetchReturns: fetchReturns,
    refetchStats: fetchStats
  };
}
