import { migrationApi } from '@/lib/api-endpoint';

const createFormDataPayload = (sourceType, config, useConfigField = false) => {
  const formData = new FormData();
  formData.append('sourceType', sourceType);

  // Extract file and other config
  const { file, filePath, ...restConfig } = config;

  if (file instanceof File) {
    formData.append('file', file);
    console.log(`[MigrationService] Appending file to FormData: ${file.name} (${file.size} bytes)`);
  } else {
    console.warn("[MigrationService] config.file is present but not an instance of File", file);
  }

  // Append rest of config as a JSON string
  // Removing filePath if it exists but we are in upload mode to avoid backend confusion
  const fieldName = useConfigField ? 'config' : 'sourceConfig';
  formData.append(fieldName, JSON.stringify(restConfig));

  return formData;
};

export const validateSource = async (sourceType, config) => {
  try {
    let payload;
    if (sourceType === 'csv' && config.csvMode === 'upload' && config.file) {
      console.log("[MigrationService] Validation: CSV upload mode detected. Building FormData...");
      payload = createFormDataPayload(sourceType, config, true);
    } else {
      payload = { sourceType, config };
    }

    const response = await migrationApi.validateSource(payload);
    return response.data;
  } catch (error) {
    console.error("Validation API Error:", error);
    return { success: false, message: error.response?.data?.message || error.message };
  }
};

export const previewSource = async (sourceType, config) => {
  try {
    let payload;
    if (sourceType === 'csv' && config.csvMode === 'upload' && config.file) {
      console.log("[MigrationService] Preview: CSV upload mode detected. Building FormData...");
      payload = createFormDataPayload(sourceType, config, true);
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

export const getSystemTables = async (keyspace) => {
  try {
    const response = await migrationApi.getSystemTables(keyspace);
    return response.data;
  } catch (error) {
    console.error("Get System Tables API Error:", error);
    throw error;
  }
};

export const startMigration = async (payload) => {
  try {
    let finalPayload = payload;

    // Get userId from cookies
    const getUserFromCookies = () => {
      if (typeof document !== 'undefined') {
        const userCookie = document.cookie
          .split('; ')
          .find(row => row.startsWith('user='));
        if (userCookie) {
          try {
            return JSON.parse(decodeURIComponent(userCookie.split('=')[1]));
          } catch (e) {
            console.warn('Failed to parse user cookie:', e);
          }
        }
      }
      return null;
    };

    const user = getUserFromCookies();
    const userId = user?.user_id;

    // Check if sourceConfig has a file
    if (payload.sourceType === 'csv' && payload.sourceConfig?.file && payload.sourceConfig.file instanceof File) {
      console.log("[MigrationService] Detected CSV upload. Building FormData...");
      const formData = new FormData();
      formData.append('sourceType', payload.sourceType);

      const { file, ...restConfig } = payload.sourceConfig;
      formData.append('file', file);
      console.log(`[MigrationService] Attached file: ${file.name}`);

      // Append sourceConfig as a JSON string
      formData.append('sourceConfig', JSON.stringify(restConfig));

      // Append other top-level fields
      formData.append('organizationId', payload.organizationId);
      formData.append('tableId', payload.tableId);
      formData.append('createdBy', payload.createdBy);
      // if (userId) formData.append('user_id', userId);
      // console.log("userId===========>",userId);
      if (payload.g_id) formData.append('g_id', payload.g_id);
      if (payload.destinationType) formData.append('destinationType', payload.destinationType);
      if (payload.keyspace) formData.append('keyspace', payload.keyspace);

      // Append mapping as a JSON string
      formData.append('mapping', JSON.stringify(payload.mapping || {}));

      finalPayload = formData;
    } else {
      // Remove file from sourceConfig if it's not a proper File object
      if (payload.sourceConfig?.file && !(payload.sourceConfig.file instanceof File)) {
        const { file, ...restConfig } = payload.sourceConfig;
        finalPayload = { ...payload, sourceConfig: restConfig };
      }
      // Add user_id to JSON payload as well
      // if (userId) {
      //   finalPayload = { ...finalPayload, user_id: userId };
      // }
    }

    const response = await migrationApi.start(finalPayload);
    return response.data;
  } catch (error) {
    console.error("[MigrationService] Error in startMigration:", error);
    throw error;
  }
};
