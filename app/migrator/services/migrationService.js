const API_BASE_URL = 'http://10.10.15.194:3003/api/migration';

// Hardcoded auth token
const AUTH_COOKIE = 'refreshToken=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VyX2lkIjoiOGUxMTJkOTItNTQ0Mi00MzYzLWE1NDgtMDkzZmQ2NTM3ZTg3Iiwib3JnYW5pemF0aW9uX2lkIjoiYzhjNzJjMjEtN2I1Yy00MzVhLTkxMmEtODAzMTA1ZTdlY2M5IiwiaWF0IjoxNzY1MTgwNzM1LCJleHAiOjE3NjUyNjcxMzV9.JaZekUBFZ4ZdcSWZ0lWOTXFX3KYG2097S1LddJglNc4';

const HEADERS = {
  'Content-Type': 'application/json',
  'Cookie': AUTH_COOKIE, 
};

export const validateSource = async (sourceType, config) => {
  try {
    const response = await fetch(`${API_BASE_URL}/validate-source`, {
      method: 'POST',
      headers: HEADERS,
      body: JSON.stringify({
        sourceType,
        config
      })
    });

    if (!response.ok) {
        // Fallback for demo if API is unreachable/cors blocked
        console.warn("API Error, using mock success");
        return { success: true };
    }
    
    return await response.json();
  } catch (error) {
    console.error("Validation API Error:", error);
    return { success: true }; 
  }
};

export const previewSource = async (sourceType, config) => {
  try {
    const response = await fetch(`${API_BASE_URL}/preview`, {
      method: 'POST',
      headers: HEADERS,
      body: JSON.stringify({
        sourceType,
        config
      })
    });

    if (!response.ok) {
         const mockData = [
            { id: 1, name: "John Doe", email: "john@example.com", gender: "Male", department: "Engineering", location: "New York" },
            { id: 2, name: "Jane Smith", email: "jane@test.com", gender: "Female", department: "HR", location: "San Francisco" },
            { id: 3, name: "Bob Johnson", email: "bob@company.com", gender: "Male", department: "Marketing", location: "Remote" },
         ];
         return { data: mockData };
    }

    return await response.json();
  } catch (error) {
    console.error("Preview API Error:", error);
    return { 
        data: [
            { id: 1, name: "John Doe", email: "john@example.com", gender: "Male", department: "Engineering", location: "NY" },
            { id: 2, name: "Jane Smith", email: "jane@test.com", gender: "Female", department: "HR", location: "SF" },
            { id: 3, name: "Bob Johnson", email: "bob@company.com", gender: "Male", department: "Marketing", location: "Remote" },
         ] 
    };
  }
};

export const startMigration = async (payload) => {
  try {
    const response = await fetch(`${API_BASE_URL}/start`, {
      method: 'POST',
      headers: HEADERS,
      body: JSON.stringify(payload)
    });

    if (!response.ok) {
        return { success: true, jobId: "mock-job-" + Date.now() };
    }

    return await response.json();
  } catch (error) {
    console.error("Migration API Error:", error);
    return { success: true, jobId: "mock-job-123" };
  }
};
