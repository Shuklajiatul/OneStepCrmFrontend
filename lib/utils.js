import { clsx } from "clsx";
import { twMerge } from "tailwind-merge";
import { Badge } from "@/components/ui/badge"
import { v4 as uuidv4 } from 'uuid'

export function cn(...inputs) {
    return twMerge(clsx(inputs));
}

// Format date time for display
export function formatDateTimeDisplay(dateString) {
    if (!dateString) return null;

    const date = new Date(dateString);
    if (isNaN(date.getTime())) return null;

    return (
        <div className="flex flex-col">
            <span className="text-sm font-medium" suppressHydrationWarning>
                {date.toLocaleDateString('en-US', {
                    year: 'numeric',
                    month: 'short',
                    day: 'numeric'
                })}
            </span>
            <span className="text-xs text-muted-foreground" suppressHydrationWarning>
                {date.toLocaleTimeString('en-US', {
                    hour: '2-digit',
                    minute: '2-digit',
                    hour12: true
                })}
            </span>
        </div>
    );
}

// Extract timestamp from UUID v1
export function extractTimestampFromUUID(uuid) {
    if (!uuid || typeof uuid !== 'string') return null;

    // Clean the UUID string
    const cleanUuid = uuid.trim().toLowerCase();

    // UUID v1 regex pattern - matches the format in your API response
    const uuidV1Regex = /^[0-9a-f]{8}-[0-9a-f]{4}-1[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/;

    if (!uuidV1Regex.test(cleanUuid)) {
        console.warn('Not a valid UUID v1:', uuid);
        return null;
    }

    const parts = cleanUuid.split('-');

    try {
        // For UUID v1, the timestamp is spread across the first three parts
        // time_low (8 hex chars) - time_mid (4 hex chars) - time_high_and_version (4 hex chars)
        const timeLow = parts[0];              // 8 chars - low 32 bits of timestamp
        const timeMid = parts[1];              // 4 chars - middle 16 bits of timestamp  
        const timeHighAndVersion = parts[2];   // 4 chars - high 12 bits of timestamp + 4 bits version

        // Remove version bits (first digit after hyphen in parts[2] is version)
        // Version is in the high nibble of the first character
        const timeHigh = timeHighAndVersion.substring(1); // Skip the version digit, take last 3 chars

        // Reconstruct the 60-bit timestamp (in hex) in the correct order
        // UUID v1 stores timestamp as: time_high (12 bits) | time_mid (16 bits) | time_low (32 bits)
        const timestampHex = timeHigh + timeMid + timeLow;

        // Convert hex to decimal
        const timestamp = parseInt(timestampHex, 16);

        if (isNaN(timestamp) || timestamp === 0) {
            console.warn('Could not parse timestamp from UUID:', uuid);
            return null;
        }

        // UUID v1 timestamps are 100-nanosecond intervals since October 15, 1582 (Gregorian calendar)
        // Need to convert to milliseconds since Unix epoch (January 1, 1970)

        // Days between Oct 15, 1582 and Jan 1, 1970
        const GREGORIAN_EPOCH_OFFSET = 122192928000000000n; // in 100-nanosecond intervals

        // Use BigInt for precise calculations
        const timestampBig = BigInt(timestamp);
        const offsetBig = BigInt(GREGORIAN_EPOCH_OFFSET);

        // Subtract the offset and convert from 100-nanosecond intervals to milliseconds
        const unixTimestampMs = Number((timestampBig - offsetBig) / 10000n);

        const date = new Date(unixTimestampMs);

        // Sanity check: validate the year is reasonable (2000-2030)
        const year = date.getFullYear();
        if (year < 2000 || year > 2030) {
            console.warn('Extracted date year is out of range:', year, uuid);
            return null;
        }

        return date;
    } catch (error) {
        console.error('Failed to extract timestamp from UUID:', error, uuid);
        return null;
    }
}

// Check if string is a valid UUID v1
export function isUUIDv1(str) {
    if (!str || typeof str !== 'string') return false;
    const cleanStr = str.trim().toLowerCase();
    // UUID v1 format: 8-4-1xxx-[89ab]xxx-12
    const uuidV1Regex = /^[0-9a-f]{8}-[0-9a-f]{4}-1[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/;
    return uuidV1Regex.test(cleanStr);
}

// Check if a date string is valid
export function isValidDate(dateString) {
    if (!dateString) return false;
    const date = new Date(dateString);
    return !isNaN(date.getTime()) && date.getFullYear() >= 1970;
}

// Debounce function for search inputs
export function debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
        const later = () => {
            clearTimeout(timeout);
            func(...args);
        }
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
    };
}

// Format file size
export function formatFileSize(bytes) {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

// Helper to extract array from API response
export const extractArray = (data, key) => {
    if (Array.isArray(data)) return data;
    if (data && Array.isArray(data.data)) return data.data;
    if (data && key && Array.isArray(data[key])) return data[key];
    return [];
}

// Status badge (shared by custom-table-builder, leadPage, gene)
export function getStatusBadge(isActive) {
    return isActive ? (
        <Badge className="bg-emerald-100/50 text-emerald-700 border-none px-3 py-1 shadow-none font-bold text-[10px] tracking-wider uppercase flex items-center gap-1.5">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
            Active
        </Badge>
    ) : (
        <Badge className="bg-slate-100 text-slate-500 border-none px-3 py-1 shadow-none font-bold text-[10px] tracking-wider uppercase flex items-center gap-1.5">
            <span className="h-1.5 w-1.5 rounded-full bg-slate-400" />
            Inactive
        </Badge>
    );
}

// Helper functions for type inference and formatting
export const inferTypeFromColumnName = (name = '') => {
    const lower = name.toLowerCase()
    if (lower.includes('email')) return 'email'
    if (lower.includes('phone') || lower.includes('mobile')) return 'phone'
    if (lower.includes('location') || lower.includes('address')) return 'location'
    if (lower.includes('date') || lower.includes('dob')) return 'date'
    if (lower.includes('time')) return 'datetime'
    if (lower.includes('description') || lower.includes('notes') || lower.includes('feedback')) return 'textarea'
    if (lower.includes('amount') || lower.includes('salary') || lower.includes('price')) return 'number'
    return null
}

export const safeParseJSON = (val) => {
    if (val === null || val === undefined || val === "") return null;
    if (typeof val !== 'string') return val;
    if (!val.trim().startsWith('{') && !val.trim().startsWith('[')) return val;
    try {
        return JSON.parse(val);
    } catch (e) {
        return val;
    }
};

export const formatDateOnly = (input) => {
    if (input instanceof Date && !Number.isNaN(input.getTime())) {
        return input.toLocaleDateString()
    }

    if (input === null || input === undefined) return null

    const str = String(input).trim()
    if (!str) return null

    const direct = new Date(str)
    if (!Number.isNaN(direct.getTime())) {
        return direct.toLocaleDateString()
    }

    const match = str.match(/^(\d{4}-\d{2}-\d{2})(?:[T\s](\d{2})(?::(\d{2})(?::(\d{2}))?)?)?$/)
    if (match) {
        const [, datePart] = match
        const [yearStr, monthStr, dayStr] = datePart.split('-')
        const year = Number(yearStr)
        const month = Number(monthStr)
        const day = Number(dayStr)

        if (Number.isFinite(year) && Number.isFinite(month) && Number.isFinite(day)) {
            const dateObj = new Date(year, month - 1, day)
            if (!Number.isNaN(dateObj.getTime())) {
                return dateObj.toLocaleDateString()
            }
        }

        return datePart
    }

    return null
}

export const formatLocationDisplay = (value) => {
    let parsed = null
    if (value && typeof value === 'object') {
        parsed = value
    } else {
        parsed = safeParseJSON(value)
    }

    if (parsed && typeof parsed === 'object') {
        // Check if the location data is wrapped in a 'value' property
        let locationData = parsed
        if (parsed.value && typeof parsed.value === 'object') {
            locationData = parsed.value
        }

        // Old structure check
        if (locationData.address || locationData.name) {
            const title = locationData.address || locationData.name || ''
            const subtitle = [locationData.city, locationData.state, locationData.country].filter(Boolean).join(', ')
            return (
                <div className="text-sm">
                    {title && <div className="font-medium">{title}</div>}
                    {subtitle && <div className="text-xs text-muted-foreground">{subtitle}</div>}
                </div>
            )
        }
        // New structure check
        const parts = [locationData.country, locationData.state, locationData.city].filter(Boolean)
        if (parts.length > 0) {
            return (
                <div className="flex items-center gap-1 text-sm flex-wrap">
                    {parts.map((p, i) => (
                        <span key={i} className="flex items-center gap-1">
                            {p}
                            {i < parts.length - 1 && <span className="text-muted-foreground">/</span>}
                        </span>
                    ))}
                </div>
            )
        }
    }
    return <span className="truncate max-w-[200px]">{String(value ?? '')}</span>
}

export const formatPhoneDisplay = (value) => {
    if (!value) return null

    // Try parsing if it's a string
    const parsed = safeParseJSON(value)

    if (parsed && typeof parsed === 'object') {
        // Handle { value: { countryCode: '...', number: '...' } } or just { countryCode: '...', number: '...' }
        const actualValue = (parsed.value !== undefined) ? parsed.value : parsed

        if (actualValue && typeof actualValue === 'object') {
            const countryCode = actualValue.countryCode || actualValue.dial_code || actualValue.code || ''
            const number = actualValue.number || actualValue.value || ''
            const country = actualValue.country || ''
            const line = [countryCode, number].filter(Boolean).join(' ').trim()

            if (line || country) {
                return (
                    <div className="text-sm">
                        {line && <div className="font-medium">{line}</div>}
                        {country && <div className="text-xs text-muted-foreground">{country}</div>}
                    </div>
                )
            }
        }

        // If actualValue is not an object but somehow nested
        if (actualValue !== undefined && actualValue !== null) {
            return <span className="truncate max-w-[200px]">{String(actualValue)}</span>
        }
    }

    // Default string display with tel link
    if (value && typeof value !== 'object') {
        return (
            <a href={`tel:${value}`} className="text-blue-600 hover:underline">
                {String(value)}
            </a>
        )
    }

    return <span className="truncate max-w-[200px]">{String(value ?? '')}</span>
}

export const getFieldValue = (record, columnId, column = null) => {
    if (!record || !record.field_values) return null
    if (!record.field_values[columnId]) return null

    const rawValue = record.field_values[columnId]

    if (typeof rawValue === 'string') {
        const trimmed = rawValue.trim()

        if ((trimmed.startsWith('{') && trimmed.endsWith('}')) ||
            (trimmed.startsWith('[') && trimmed.endsWith(']'))) {
            try {
                const parsed = JSON.parse(trimmed)

                if (parsed && typeof parsed === 'object') {
                    if (parsed.value !== undefined) {
                        return parsed
                    }
                    if (parsed.countryCode || parsed.dial_code || parsed.number) {
                        return parsed
                    }
                }

                return parsed
            } catch (e) {
                return rawValue
            }
        }
    }

    return rawValue
}

// --- Table/column utilities ---
export function parseOptionalValuesArray(optionalValuesInput) {
    if (!optionalValuesInput) return [];

    // If it's already an array, check elements
    if (Array.isArray(optionalValuesInput)) {
        // If it's an array of strings, it might be a simple array ["Male", "Female"]
        // OR it might contain a stringified JSON array ["[\"val1\", \"val2\"]"]
        if (optionalValuesInput.length > 0 && typeof optionalValuesInput[0] === 'string') {
            const firstElement = optionalValuesInput[0].trim();
            if (firstElement.startsWith('[') && firstElement.endsWith(']')) {
                try {
                    const parsed = JSON.parse(firstElement);
                    if (Array.isArray(parsed)) return parsed;
                } catch (e) {
                    // Fail through to returning the original array
                }
            }
        }
        return optionalValuesInput;
    }

    // If it's a string, try to parse it
    if (typeof optionalValuesInput === 'string') {
        try {
            const parsed = JSON.parse(optionalValuesInput);
            return Array.isArray(parsed) ? parsed : [];
        } catch (e) {
            return [];
        }
    }

    return [];
}
export function getColumnFieldType(column) {
    if (!column) return 'text';
    return column.resolvedParentDatatype || column.properties?.field_type || column.parentDatatype || column.parent_datatype || column.properties?.type || column.data_type || inferTypeFromColumnName(column.column_name || '') || column.type || 'text';
}
export function getColumnOptions(column) {
    if (!column) return [];
    if (Array.isArray(column.resolvedOptions) && column.resolvedOptions.length > 0) return column.resolvedOptions;
    if (Array.isArray(column.rawOptions) && column.rawOptions.length > 0) return column.rawOptions;
    if (Array.isArray(column.options) && column.options.length > 0 && typeof column.options[0] === 'object') return column.options;
    return parseOptionalValuesArray(column.options || column.optional_values);
}

export function hasNestedData(column) {
    if (!column) return false;
    const options = getColumnOptions(column);
    const hasNestedFields = options.some(option =>
        option.nestedFields && Array.isArray(option.nestedFields) && option.nestedFields.length > 0
    );

    return hasNestedFields;
}
export function buildFieldValuePayload(column, value) {
    const fieldType = getColumnFieldType(column);
    if (value === null || value === undefined) return null;
    if (fieldType === 'checkbox') {
        const arr = (Array.isArray(value) ? value : []).map((item) => {
            if (typeof item === 'object' && item !== null) {
                if (!item.value) return null;
                const payload = { value: item.value };
                if (item.nestedValues && Object.keys(item.nestedValues).length > 0) payload.nestedValues = item.nestedValues;
                return payload;
            }
            return item ? { value: item } : null;
        }).filter(Boolean);
        if (!arr.length) return null;
        return JSON.stringify(arr);
    }
    if (fieldType === 'select' || fieldType === 'radio') {
        if (typeof value === 'object' && value !== null && value.value) return JSON.stringify({ value: value.value, nestedValues: value.nestedValues || {} });
        if (typeof value === 'string' && value.trim()) return JSON.stringify({ value: value.trim(), nestedValues: {} });
        return null;
    }
    if (fieldType === 'location') {
        if (typeof value === 'object' && value !== null) return JSON.stringify({ value });
        return null;
    }
    if (typeof value === 'string') {
        const t = value.trim();
        if (!t) return null;
        if ((t.startsWith('{') && t.endsWith('}')) || (t.startsWith('[') && t.endsWith(']'))) { try { return JSON.stringify({ value: JSON.parse(t) }); } catch { return JSON.stringify({ value: t }); } }
        return JSON.stringify({ value: t });
    }
    if (typeof value === 'object') return JSON.stringify({ value });
    return JSON.stringify({ value });
}
export function updateNestedState(obj, path, value) {
    if (path.length === 0) return value;
    const [head, ...tail] = path;
    const res = Array.isArray(obj) ? [...obj] : { ...obj };
    res[head] = updateNestedState(obj[head], tail, value);
    return res;
}

export const normalizeColumnMetadata = (column) => {
    if (!column) return null
    const options = parseOptionalValuesArray(column.options || column.optional_values)
    const propertyType =
        column.properties?.field_type ||
        column.properties?.type ||
        column.properties?.input_type ||
        column.properties?.parent_datatype

    const nameBasedType = inferTypeFromColumnName(column.column_name || '')
    let resolvedParentDatatype = column.parent_datatype || propertyType || null

    if ((!resolvedParentDatatype || resolvedParentDatatype === 'text') && column.data_type === 'number') {
        resolvedParentDatatype = 'number'
    }

    if ((!resolvedParentDatatype || resolvedParentDatatype === 'text') && column.data_type === 'boolean') {
        resolvedParentDatatype = 'boolean'
    }

    if ((!resolvedParentDatatype || resolvedParentDatatype === 'text') && nameBasedType) {
        resolvedParentDatatype = nameBasedType
    }

    if ((!resolvedParentDatatype || resolvedParentDatatype === 'text') && options.length > 0) {
        resolvedParentDatatype =
            column.properties?.selection_style ||
            column.properties?.selection_type ||
            column.properties?.display_type ||
            column.properties?.field_type ||
            'select'
    }

    if (!resolvedParentDatatype) {
        resolvedParentDatatype = 'text'
    }

    // Parse validation if it's a stringified JSON
    let validation = column.validation || {}
    if (column.properties?.validation) {
        if (typeof column.properties.validation === 'string') {
            try {
                validation = { ...validation, ...JSON.parse(column.properties.validation) }
            } catch (e) { }
        } else if (typeof column.properties.validation === 'object') {
            validation = { ...validation, ...column.properties.validation }
        }
    }

    return {
        ...column,
        resolvedOptions: options,
        resolvedParentDatatype,
        resolvedDataType: column.data_type || resolvedParentDatatype || 'text',
        validation: Object.keys(validation).length > 0 ? validation : null
    }
}

export const normalizeFieldValueForForm = (rawValue, column) => {
    const fieldType = getColumnFieldType(column)

    const parseValue = (value) => {
        if (value === null || value === undefined) {
            return null
        }

        if (typeof value === 'string') {
            const trimmed = value.trim()
            if (!trimmed) return ''

            if (
                (trimmed.startsWith('{') && trimmed.endsWith('}')) ||
                (trimmed.startsWith('[') && trimmed.endsWith(']'))
            ) {
                try {
                    return JSON.parse(trimmed)
                } catch {
                    return trimmed
                }
            }

            return trimmed
        }

        return value
    }

    const parsedValue = parseValue(rawValue)

    if (fieldType === 'checkbox') {
        if (Array.isArray(parsedValue)) {
            return parsedValue.map((item) => {
                if (typeof item === 'object' && item !== null) {
                    return {
                        value: item.value ?? '',
                        nestedValues: item.nestedValues || {},
                    }
                }
                return {
                    value: item,
                    nestedValues: {},
                }
            })
        }
        if (
            parsedValue &&
            typeof parsedValue === 'object' &&
            Array.isArray(parsedValue.value)
        ) {
            return parsedValue.value.map((item) => ({
                value: typeof item === 'object' && item !== null ? item.value ?? '' : item,
                nestedValues:
                    typeof item === 'object' && item !== null && item.nestedValues
                        ? item.nestedValues
                        : {},
            }))
        }
        return []
    }

    if (fieldType === 'select' || fieldType === 'radio') {
        if (parsedValue && typeof parsedValue === 'object' && !Array.isArray(parsedValue)) {
            return {
                value: parsedValue.value ?? '',
                nestedValues: parsedValue.nestedValues || {},
            }
        }

        return {
            value: parsedValue ? String(parsedValue) : '',
            nestedValues: {},
        }
    }

    if (fieldType === 'phone') {
        if (parsedValue && typeof parsedValue === 'object') {
            return JSON.stringify(parsedValue)
        }
        return parsedValue ? String(parsedValue) : ''
    }

    if (fieldType === 'location') {
        if (parsedValue && typeof parsedValue === 'object') {
            return parsedValue
        }
        // Fallback if it's stringified JSON but didn't parse correctly or is a simple string
        try {
            const p = JSON.parse(String(parsedValue))
            if (p && typeof p === 'object') return p
        } catch (e) { }
        return { country: undefined, state: undefined, city: undefined }
    }

    if (typeof parsedValue === 'object' && parsedValue !== null && parsedValue.value !== undefined) {
        return typeof parsedValue.value === 'object'
            ? JSON.stringify(parsedValue.value)
            : String(parsedValue.value ?? '')
    }

    if (typeof parsedValue === 'object' && parsedValue !== null) {
        try {
            return JSON.stringify(parsedValue)
        } catch {
            return String(parsedValue)
        }
    }

    return parsedValue !== null && parsedValue !== undefined ? String(parsedValue) : ''
}

export const inferFilenameFromDataUrl = (dataUrl, columnOrFieldDef) => {
    try {
        if (typeof dataUrl !== 'string') return 'file'
        const match = dataUrl.match(/^data:([^;]+);base64,/)
        const mime = match ? match[1] : 'application/octet-stream'
        const ext = ({
            'image/png': 'png',
            'image/jpeg': 'jpg',
            'image/jpg': 'jpg',
            'image/gif': 'gif',
            'image/webp': 'webp',
            'application/pdf': 'pdf'
        })[mime] || 'bin'
        const baseName = columnOrFieldDef?.column_name || columnOrFieldDef?.label || 'file'
        const base = baseName.toString().replace(/\s+/g, '_').toLowerCase()
        return `${base}.${ext}`
    } catch {
        return 'file'
    }
}

export const isFileObject = (val) => {
    return val && typeof val === 'object' && (
        val.base64 !== undefined ||
        val.previewUrl !== undefined ||
        val.isFromBase64 === true ||
        (val.name !== undefined && val.type !== undefined)
    )
}

/**
 * Checks if a string is a valid Data URL (Base64)
 */
export const isBase64File = (str) => {
    if (typeof str !== 'string') return false
    return str.startsWith('data:') && str.includes(';base64,')
}

/**
 * Creates a File-like object from a Base64 string
 */
export const createFileFromBase64 = (base64String, filename = 'uploaded_file', originalType = null, originalSize = null, originalLastModified = null) => {
    if (!base64String || typeof base64String !== 'string') return null

    try {
        const matches = base64String.match(/^data:([a-zA-Z0-9]+\/[a-zA-Z0-9-.+]+);base64,(.*)$/)
        if (!matches || matches.length !== 3) {
            console.warn('Invalid base64 format')
            return null
        }

        const mimeType = matches[1]
        const base64Data = matches[2]

        const finalFilename = filename.includes('.') ? filename : `${filename}.${mimeType.split('/')[1] || 'bin'}`
        const finalType = originalType || mimeType
        const finalSize = originalSize || Math.floor((base64Data.length * 3) / 4)
        const finalLastModified = originalLastModified || Date.now()

        try {
            const bstr = atob(base64Data)
            let n = bstr.length
            const u8arr = new Uint8Array(n)
            while (n--) {
                u8arr[n] = bstr.charCodeAt(n)
            }
            return new File([u8arr], finalFilename, { type: finalType, lastModified: finalLastModified })
        } catch (e) {
            return {
                name: finalFilename,
                type: finalType,
                size: finalSize,
                base64: base64String,
                previewUrl: base64String,
                lastModified: finalLastModified,
                isFromBase64: true
            }
        }
    } catch (error) {
        console.error('Error creating file from base64:', error)
        return null
    }
}

/**
 * Converts a Base64 string to a Blob
 */
export const base64ToBlob = (base64String) => {
    try {
        let base64Data = base64String
        let mimeType = 'application/octet-stream'

        if (base64String.includes(',')) {
            const [header, data] = base64String.split(',')
            const mimeMatch = header.match(/:(.*?);/)
            if (mimeMatch) {
                mimeType = mimeMatch[1]
            }
            base64Data = data
        }

        const binaryString = atob(base64Data)
        const bytes = new Uint8Array(binaryString.length)

        for (let i = 0; i < binaryString.length; i++) {
            bytes[i] = binaryString.charCodeAt(i)
        }

        return new Blob([bytes], { type: mimeType })
    } catch (error) {
        console.error('Error converting base64 to blob:', error)
        return null
    }
}

// --- Custom Table Builder Mapping Utilities ---

// to map-based nested structure (CustomTableBuilder UI)
export const processBackendNestedFields = (fieldsArray) => {
    if (!Array.isArray(fieldsArray)) return []

    return fieldsArray.map(field => {
        const processedField = {
            ...field,
            id: field.id || uuidv4(),
            // Prioritize human-readable label for UI name
            name: field.label || field.name || field.column_name,
            technicalName: field.name, // Preserve technical slug
            type: field.type || field.data_type || 'text',
            options: [],
            nestedFields: {}
        }

        // Process options
        if (field.options && Array.isArray(field.options)) {
            processedField.options = field.options.map((opt, idx) => {
                const optionValue = typeof opt === 'object' ? (opt.value || opt.label) : opt

                // If option is an object with nestedFields, move them to the parent's map
                if (typeof opt === 'object' && opt.nestedFields && Array.isArray(opt.nestedFields)) {
                    processedField.nestedFields[idx] = processBackendNestedFields(opt.nestedFields)
                }

                return optionValue
            })
        }

        return processedField
    })
}

// Helper to recursively convert map-based nested structure (UI)
export const processFrontendNestedFields = (fieldsArray, nestedFieldsMap) => {
    if (!Array.isArray(fieldsArray)) return []

    return fieldsArray.map((field, fieldIdx) => {
        const processedField = {
            ...field,
            label: field.name, // The UI name is the human-friendly label
            name: field.technicalName || field.name?.toLowerCase().replace(/\s+/g, '_'), // Restore technical slug or generate one
            options: (field.options || []).map((opt, optIdx) => {
                const nestedForOption = nestedFieldsMap?.[optIdx] || field.nestedFields?.[optIdx] || []

                if (nestedForOption.length > 0) {
                    return {
                        value: typeof opt === 'object' ? opt.value : opt,
                        label: typeof opt === 'object' ? opt.label : opt,
                        nestedFields: processFrontendNestedFields(nestedForOption, {})
                    }
                }
                return opt
            })
        }
        delete processedField.nestedFields
        return processedField
    })
}

export const mapBackendTableToFrontend = (backendTable) => ({
    id: backendTable.table_id || backendTable.id,
    name: backendTable.table_name || backendTable.name,
    description: backendTable.description || "",
    isActive: backendTable.is_active ?? true,
    columns: (backendTable.columns || []).map(col => {
        // Prioritize parent_datatype for the UI type
        const uiType = col.parent_datatype || col.data_type || col.type || 'text'

        // Parse optional_values (can be array of strings or array of objects)
        let parsedOptions = []
        if (col.optional_values) {
            if (Array.isArray(col.optional_values)) {
                // Handle array of strings or objects
                parsedOptions = col.optional_values.map(opt => {
                    if (typeof opt === 'string') {
                        // Try to parse if it's a JSON string
                        try {
                            const parsed = JSON.parse(opt)
                            // If it's an array (like "[...]") return the array
                            if (Array.isArray(parsed)) return parsed
                            return parsed
                        } catch {
                            return opt
                        }
                    }
                    return opt
                }).flat() // Flatten in case we had nested arrays from string parsing
            } else if (typeof col.optional_values === 'string') {
                try {
                    parsedOptions = JSON.parse(col.optional_values)
                } catch {
                    parsedOptions = []
                }
            }
        }

        // Process the hierarchical structure using recursion
        const initialNestedFields = {}
        const processedOptions = (parsedOptions || []).map((opt, idx) => {
            if (typeof opt === 'object' && opt.nestedFields && Array.isArray(opt.nestedFields)) {
                initialNestedFields[idx] = processBackendNestedFields(opt.nestedFields)
            }
            return typeof opt === 'object' ? (opt.label || opt.value) : opt
        })

        const properties = col.properties || {}
        const propertyNestedFieldsMap = typeof properties.nestedFields === 'string'
            ? JSON.parse(properties.nestedFields)
            : (properties.nestedFields || {})

        // Deep merge or combine maps
        const combinedNestedFieldsMap = { ...initialNestedFields, ...propertyNestedFieldsMap }

        const validation = typeof properties.validation === 'string'
            ? JSON.parse(properties.validation)
            : (properties.validation || {})

        return {
            id: col.column_id || col.id,
            name: col.column_name || col.name,
            type: uiType,
            editable: true,
            isSearchable: col.is_searchable ?? true,
            options: processedOptions,
            rawOptions: parsedOptions,
            required: col.required ?? false,
            properties: properties,
            nestedFields: combinedNestedFieldsMap,
            validation: validation,
            parentDatatype: col.parent_datatype
        }
    }),
    createdAt: backendTable.created_at || backendTable.createdAt || new Date().toISOString(),
    rows: []
})

export const mapBackendRecordsToFrontend = (records, columns) => {
    return records.map(record => {
        const cells = {}
        columns.forEach(col => {
            const rawVal = record.field_values?.[col.id]

            let parsedVal = rawVal
            if (typeof rawVal === 'string') {
                try {
                    // Attempt to parse if it looks like JSON or if we expect structured data
                    const trimmedValue = rawVal.trim();
                    if (trimmedValue.startsWith('{') || trimmedValue.startsWith('[')) {
                        parsedVal = JSON.parse(trimmedValue)
                    }
                } catch (e) {
                    // Keep as string if parsing fails
                }
            }


            if (parsedVal && typeof parsedVal === 'object' && !Array.isArray(parsedVal) && parsedVal.hasOwnProperty('value')) {
                cells[col.id] = parsedVal // Keep full object
            } else if (Array.isArray(parsedVal)) {
                cells[col.id] = parsedVal // Keep array
            } else {
                cells[col.id] = parsedVal
            }
        })
        return {
            id: record.record_id || record.id,
            cells
        }
    })
}

export const mapFrontendColumnToBackend = (column) => {
    const sanitizedOptions = (column.options || []).map(opt =>
        typeof opt === 'object' ? (opt.label || opt.value || String(opt)) : String(opt)
    )

    return {
        column_name: column.name,
        data_type: column.type,
        is_searchable: column.isSearchable ?? true,
        properties: {
            ...(column.properties || {}),
            nestedFields: JSON.stringify(column.nestedFields || {}),
            validation: JSON.stringify(column.validation || {}),
        },
        optional_values: sanitizedOptions,
        required: column.required ?? false
    }
}

/**
 * Formats a date for an input of type 'date' or 'datetime-local'
 */
export const toDateInputValue = (input, includeTime = false) => {
    if (!input && input !== 0) return ''

    const dateObj = input instanceof Date
        ? input
        : (() => {
            const str = String(input).trim()
            if (!str) return null
            const direct = new Date(str)
            if (!Number.isNaN(direct.getTime())) return direct
            const match = str.match(/^(\d{4}-\d{2}-\d{2})(?:[T\s](\d{2})(?::(\d{2})(?::(\d{2}))?)?)?$/)
            if (match) {
                const [, datePart, hh = '00', mm = '00'] = match
                const [yearStr, monthStr, dayStr] = datePart.split('-')
                const year = Number(yearStr)
                const month = Number(monthStr)
                const day = Number(dayStr)
                if (Number.isFinite(year) && Number.isFinite(month) && Number.isFinite(day)) {
                    return new Date(year, month - 1, day, Number(hh), Number(mm))
                }
            }
            return null
        })()

    if (!dateObj || Number.isNaN(dateObj.getTime())) return ''

    if (includeTime) {
        // Return local YYYY-MM-DDTHH:mm for datetime-local
        const year = dateObj.getFullYear()
        const month = String(dateObj.getMonth() + 1).padStart(2, '0')
        const day = String(dateObj.getDate()).padStart(2, '0')
        const hours = String(dateObj.getHours()).padStart(2, '0')
        const minutes = String(dateObj.getMinutes()).padStart(2, '0')
        return `${year}-${month}-${day}T${hours}:${minutes}`
    }

    // Return local YYYY-MM-DD for date
    const year = dateObj.getFullYear()
    const month = String(dateObj.getMonth() + 1).padStart(2, '0')
    const day = String(dateObj.getDate()).padStart(2, '0')
    return `${year}-${month}-${day}`
}

/**
 * Common logic to open a file modal preview
 */
export const openFileModal = (dataUrl, columnOrFieldDef, callback) => {
    if (!dataUrl || typeof dataUrl !== 'string') return
    const match = dataUrl.match(/^data:([^;]+);base64,/)
    const mime = match ? match[1] : 'application/octet-stream'
    const name = inferFilenameFromDataUrl(dataUrl, columnOrFieldDef)
    if (callback) {
        callback({ name, mime, dataUrl })
    }
}

export const getInitials = (name) => {
    if (!name) return '?'
    return name.split(' ').map(n => n[0]).join('').toUpperCase().substring(0, 2)
}