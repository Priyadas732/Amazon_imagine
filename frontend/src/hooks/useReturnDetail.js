// frontend/src/hooks/useReturnDetail.js
import { useState, useEffect, useCallback } from "react";
import { getWarehouseReturnDetail, confirmReturnArrival, overrideReturnRoute } from "../utils/warehouseApi";

export default function useReturnDetail(token, returnId) {
  const [detail, setDetail] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);

  const fetchDetail = useCallback(async () => {
    if (!token || !returnId) {
      setDetail(null);
      return;
    }
    setIsLoading(true);
    setError(null);
    try {
      const data = await getWarehouseReturnDetail(token, returnId);
      setDetail(data);
    } catch (err) {
      setError(err.message || "Failed to load return details");
    } finally {
      setIsLoading(false);
    }
  }, [token, returnId]);

  useEffect(() => {
    fetchDetail();
  }, [fetchDetail]);

  const confirm = async () => {
    if (!token || !returnId) return;
    setIsLoading(true);
    try {
      await confirmReturnArrival(token, returnId);
      await fetchDetail(); // Refetch details to get the new state/event
    } catch (err) {
      setError(err.message || "Failed to confirm arrival");
    } finally {
      setIsLoading(false);
    }
  };

  const override = async (newRoute, overrideReason) => {
    if (!token || !returnId) return;
    setIsLoading(true);
    try {
      await overrideReturnRoute(token, returnId, newRoute, overrideReason);
      await fetchDetail(); // Refetch details to get the new state/event
    } catch (err) {
      setError(err.message || "Failed to override route");
    } finally {
      setIsLoading(false);
    }
  };

  return {
    detail,
    isLoading,
    error,
    refetchDetail: fetchDetail,
    confirmArrival: confirm,
    overrideRoute: override
  };
}
