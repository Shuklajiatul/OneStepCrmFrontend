import { migrationApi } from '@/lib/api-endpoint';

const createFormDataPayload = (sourceType, config) => {
  const formData = new FormData();
  formData.append('sourceType', sourceType);

  // Extract file and other config
  const { file, ...restConfig } = config;
  if (file) {
    formData.append('file', file);
  }

  // Append rest of config as a JSON string
  formData.append('config', JSON.stringify(restConfig));

  return formData;
};

export const validateSource = async (sourceType, config) => {
  try {
    let payload;
    if (sourceType === 'csv' && config.file) {
      payload = createFormDataPayload(sourceType, config);
    } else {
      payload = { sourceType, config };
    }

    const response = await migrationApi.validateSource(payload);
    // If API returns 200 but success is false, ensure we have a message
    if (response.data && response.data.success === false) {
      return {
        ...response.data,
        message: response.data.error || response.data.message || "Validation failed"
      };
    }
    return response.data;
  } catch (error) {
    console.warn("[MigrationService] Validation API Error (Handled):", error);
    const apiError = error.response?.data?.error || error.response?.data?.message || error.message;
    return { success: false, message: apiError };
  }
};

export const previewSource = async (sourceType, config) => {
  try {
    let payload;
    if (sourceType === 'csv' && config.file) {
      payload = createFormDataPayload(sourceType, config);
    } else {
      payload = { sourceType, config };
    }

    const response = await migrationApi.preview(payload);
    return response.data;
  } catch (error) {
    console.error("Preview API Error:", error);
    throw error;
  }
};

export const startMigration = async (payload) => {
  try {
    let finalPayload = payload;

    // Check if sourceConfig has a file
    if (payload.sourceType === 'csv' && payload.sourceConfig?.file) {
      console.log("[MigrationService] Detected CSV upload. Building FormData...");
      const formData = new FormData();
      formData.append('sourceType', payload.sourceType);

      const { file, ...restConfig } = payload.sourceConfig;
      if (file) {
        formData.append('file', file);
        console.log(`[MigrationService] Attached file: ${file.name}`);
      }

      // Append sourceConfig as a JSON string
      formData.append('sourceConfig', JSON.stringify(restConfig));

      // Append other top-level fields
      formData.append('organizationId', payload.organizationId);
      formData.append('tableId', payload.tableId);
      formData.append('createdBy', payload.createdBy);
      if (payload.g_id) formData.append('g_id', payload.g_id);
      if (payload.destinationType) formData.append('destinationType', payload.destinationType);
      if (payload.keyspace) formData.append('keyspace', payload.keyspace);

      // Append mapping as a JSON string
      formData.append('mapping', JSON.stringify(payload.mapping || {}));
      console.log("[MigrationService] Mapping stringified and appended to FormData.");
      console.log("[MigrationService] FormData built successfully.");

      finalPayload = formData;
    }

    const response = await migrationApi.start(finalPayload);
    return response.data;
  } catch (error) {
    console.error("[MigrationService] Error in startMigration:", error);
    throw error;
  }
};

export const getSystemTables = async (keyspace = 'crm') => {
  try {
    const response = await migrationApi.getSystemTables({ keyspace });
    return response.data;
  } catch (error) {
    console.error("getSystemTables API Error:", error);
    throw error;
  }
};
