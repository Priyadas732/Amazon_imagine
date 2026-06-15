let API_BASE_RAW = import.meta.env.VITE_API_BASE_URL || "http://localhost:3000";
if (API_BASE_RAW.endsWith("/")) {
  API_BASE_RAW = API_BASE_RAW.slice(0, -1);
}
const API_BASE = API_BASE_RAW;

function getHeaders(token) {
  return {
    "Content-Type": "application/json",
    "Authorization": `Bearer ${token}`
  };
}

export async function getWarehouseStats(token) {
  const res = await fetch(`${API_BASE}/api/warehouse/stats`, {
    headers: getHeaders(token)
  });
  if (!res.ok) throw new Error("Failed to fetch statistics");
  return res.json();
}

export async function getWarehouseReturns(token, label = "", page = 1, limit = 6) {
  let url = `${API_BASE}/api/warehouse/returns?page=${page}&limit=${limit}`;
  
  // Map UI pill labels to DB routed_to values
  const labelToRouteMap = {
    "Refurbish": "REFURBISH",
    "Resale": "RESELL",
    "Donate": "DONATE",
    "Liquidate": "LIQUIDATE"
  };
  
  const routedTo = labelToRouteMap[label];
  if (routedTo) {
    url += `&routed_to=${encodeURIComponent(routedTo)}`;
  }
  
  const res = await fetch(url, {
    headers: getHeaders(token)
  });
  if (!res.ok) throw new Error("Failed to fetch returns");
  return res.json();
}

export async function getWarehouseReturnDetail(token, returnId) {
  const res = await fetch(`${API_BASE}/api/warehouse/returns/${encodeURIComponent(returnId)}`, {
    headers: getHeaders(token)
  });
  if (!res.ok) throw new Error("Failed to fetch return detail");
  return res.json();
}

export async function confirmReturnArrival(token, returnId) {
  const res = await fetch(`${API_BASE}/api/warehouse/returns/${encodeURIComponent(returnId)}/confirm`, {
    method: "PATCH",
    headers: getHeaders(token)
  });
  if (!res.ok) throw new Error("Failed to confirm arrival");
  return res.json();
}

export async function overrideReturnRoute(token, returnId, newRoute, overrideReason) {
  const res = await fetch(`${API_BASE}/api/warehouse/returns/${encodeURIComponent(returnId)}/override`, {
    method: "PATCH",
    headers: getHeaders(token),
    body: JSON.stringify({ new_route: newRoute, override_reason: overrideReason })
  });
  if (!res.ok) throw new Error("Failed to override route");
  return res.json();
}
