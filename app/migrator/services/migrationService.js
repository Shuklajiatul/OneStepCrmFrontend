import { migrationApi } from '@/lib/api-endpoint';

export const validateSource = async (sourceType, config) => {
  try {
    const response = await migrationApi.validateSource({
      sourceType,
      config
    });

    return response.data;
  } catch (error) {
    console.error("Validation API Error:", error);
    // Return standard error structure if API call fails
    return { success: false, message: error.response?.data?.message || error.message };
  }
};

export const previewSource = async (sourceType, config) => {
  try {
    console.log("Service: Calling preview API...");
    const response = await migrationApi.preview({
      sourceType,
      config
    });
    console.log("Service: Preview API response data:", response.data);

    return response.data;
  } catch (error) {
    console.error("Preview API Error:", error);
    throw error;
  }
};

export const startMigration = async (payload) => {
  try {
    const response = await migrationApi.start(payload);
    return response.data;
  } catch (error) {
    console.error("Migration API Error:", error);
    throw error;
  }
};
