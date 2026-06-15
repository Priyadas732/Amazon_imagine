let API_BASE_RAW = import.meta.env.VITE_API_BASE_URL || "http://localhost:3000";
if (API_BASE_RAW.endsWith("/")) {
  API_BASE_RAW = API_BASE_RAW.slice(0, -1);
}
const API_BASE = API_BASE_RAW;

/**
 * Fetch presigned S3 upload URL from the backend.
 * @param {string} fileName
 * @param {string} fileType
 * @param {string} role
 * @returns {Promise<{ itemId: string, key: string, uploadUrl: string }>}
 */
export async function requestUpload(fileName, fileType, role) {
  const res = await fetch(`${API_BASE}/upload`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-role": role,
    },
    body: JSON.stringify({ fileName, fileType }),
  });

  if (!res.ok) {
    const errData = await res.json();
    throw new Error(errData.error || "Failed to generate upload URL");
  }

  return res.json();
}

/**
 * Upload a file directly to the S3 bucket using a presigned URL.
 * @param {string} uploadUrl
 * @param {File} file
 * @param {string} fileType
 */
export async function uploadFileToS3(uploadUrl, file, fileType) {
  const res = await fetch(uploadUrl, {
    method: "PUT",
    body: file,
    headers: {
      "Content-Type": fileType,
    },
  });

  if (!res.ok) {
    throw new Error(`Failed to upload file to S3: ${res.statusText}`);
  }
}

/**
 * Request grading analysis from backend.
 * @param {object} params
 * @param {string} params.category
 * @param {string} params.productType
 * @param {string[]} params.imageKeys
 * @param {object} params.provided
 * @param {string} params.role
 * @returns {Promise<object>}
 */
export async function gradeItem({ category, productType, imageKeys, provided, role }) {
  const res = await fetch(`${API_BASE}/grade`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-role": role,
    },
    body: JSON.stringify({ category, productType, imageKeys, provided }),
  });

  if (!res.ok) {
    const errData = await res.json();
    throw new Error(errData.error || "Grading analysis failed");
  }

  return res.json();
}

/**
 * Retrieve item grading details from DynamoDB.
 * @param {string} itemId
 * @param {string} role
 * @returns {Promise<object>}
 */
export async function getItem(itemId, role) {
  const res = await fetch(`${API_BASE}/item/${encodeURIComponent(itemId)}`, {
    headers: {
      "x-role": role,
    },
  });

  if (!res.ok) {
    const errData = await res.json();
    throw new Error(errData.error || "Failed to fetch item record");
  }

  const data = await res.json();
  return data.item;
}

/**
 * Update item status, disposition, extraCredits, and match details in DynamoDB.
 * @param {string} itemId
 * @param {object} payload
 * @param {string} role
 * @returns {Promise<object>}
 */
export async function updateItem(itemId, payload, role) {
  const res = await fetch(`${API_BASE}/item/${encodeURIComponent(itemId)}`, {
    method: "PUT",
    headers: {
      "Content-Type": "application/json",
      "x-role": role,
    },
    body: JSON.stringify(payload),
  });

  if (!res.ok) {
    const errData = await res.json();
    throw new Error(errData.error || "Failed to update item record");
  }

  const data = await res.json();
  return data.item;
}

/**
 * Fetch dynamic returns category requirements configuration from backend.
 * @param {string} category
 * @returns {Promise<object>}
 */
export async function getRequirements(category) {
  const res = await fetch(`${API_BASE}/requirements?category=${encodeURIComponent(category)}`);
  if (!res.ok) {
    const errData = await res.json();
    throw new Error(errData.error || "Failed to fetch requirements");
  }
  const data = await res.json();
  return data.requirements;
}

/**
 * Post to /evaluate-risk to evaluate purchase return risk.
 * @param {object} params
 * @param {string} params.productId
 * @param {object} params.currentSpecs
 * @param {string} params.userId
 * @param {string} params.role
 * @returns {Promise<object>}
 */
export async function evaluateRisk({ productId, currentSpecs, userId, role }) {
  const res = await fetch(`${API_BASE}/evaluate-risk`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-role": role || "buyer",
    },
    body: JSON.stringify({ productId, currentSpecs, userId }),
  });

  if (!res.ok) {
    const errData = await res.json();
    throw new Error(errData.error || "Failed to evaluate purchase risk");
  }

  return res.json();
}

/**
 * Fetch routing disposition analysis.
 * @param {object} params
 * @param {string} params.productName
 * @param {string} params.grade
 * @param {number} params.originalPrice
 * @returns {Promise<object>}
 */
export async function getDisposition({ productName, category, grade, originalPrice, region }) {
  const res = await fetch(`${API_BASE}/dispose`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ productName, category, grade, originalPrice, region }),
  });

  if (!res.ok) {
    const errData = await res.json();
    throw new Error(errData.error || "Failed to fetch routing disposition");
  }

  return res.json();
}

/**
 * Request return risk prediction calculations from the backend.
 */
export async function getReturnRisk({ userId, productId, chosenSize, role }) {
  const res = await fetch(`${API_BASE}/predict-return`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-role": role || "buyer",
    },
    body: JSON.stringify({ userId, productId, chosenSize }),
  });

  if (!res.ok) {
    const errData = await res.json();
    throw new Error(errData.error || "Failed to predict return risk");
  }

  return res.json();
}
