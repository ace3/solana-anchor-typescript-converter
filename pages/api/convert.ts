import type { NextApiRequest, NextApiResponse } from 'next';
import { PublicKey } from '@solana/web3.js';
import * as anchor from '@coral-xyz/anchor';

// Convert snake_case to camelCase
function toCamelCase(text: string): string {
    return text.replace(/_([a-z])/g, (g) => g[1].toUpperCase());
}

// Fully automatic recursive converter function with padding and alignment support
function genericConverter<T>(resultRaw: any): T {
    const converted: any = {};

    for (const key in resultRaw) {
        const camelCaseKey = toCamelCase(key);

        if (resultRaw[key] instanceof Object && !Array.isArray(resultRaw[key]) && !(resultRaw[key] instanceof PublicKey)) {
            // Recursively convert nested objects
            converted[camelCaseKey] = genericConverter(resultRaw[key]);
        } else if (Array.isArray(resultRaw[key])) {
            // Handle Uint8Array padding and alignment fields
            if (key.startsWith('align') || key.startsWith('padding')) {
                const arrayLength = resultRaw[key].length;
                converted[camelCaseKey] = new Uint8Array(resultRaw[key]);
                converted[camelCaseKey].__comment = `// [${key.includes('u64') ? 'u64' : 'u8'}; ${arrayLength}] in Rust`;
            } else {
                // Handle nested arrays of objects
                converted[camelCaseKey] = resultRaw[key].every((item: any) => typeof item === 'number')
                    ? convertToUint8Array(resultRaw[key])
                    : resultRaw[key].map((item: any) => genericConverter(item));
            }
        } else if (typeof resultRaw[key] === 'string' && /^\d+$/.test(resultRaw[key])) {
            // Handle large integers as anchor.BN
            converted[camelCaseKey] = new anchor.BN(resultRaw[key]);
        } else if (typeof resultRaw[key] === 'boolean') {
            converted[camelCaseKey] = resultRaw[key];
        } else if (typeof resultRaw[key] === 'number') {
            converted[camelCaseKey] = resultRaw[key];
        } else if (resultRaw[key] instanceof PublicKey || typeof resultRaw[key] === 'string') {
            // Handle PublicKey conversions
            converted[camelCaseKey] = new PublicKey(resultRaw[key]);
        } else {
            converted[camelCaseKey] = resultRaw[key]; // Fallback for any unrecognized types
        }
    }

    return converted as T;
}

// Helper function to convert number[] or Uint8Array to Uint8Array
function convertToUint8Array(input: number[] | Uint8Array): Uint8Array {
    if (input instanceof Uint8Array) {
        return input; // Already in the correct format
    }
    return new Uint8Array(input);
}

export default function handler(req: NextApiRequest, res: NextApiResponse) {
    const { anchorStruct } = req.body;
    const typescriptStruct = convertAnchorToTypeScript(anchorStruct);
    res.status(200).json({ typescriptStruct });
}

// TypeScript Converter for Struct Strings
function convertAnchorToTypeScript(anchorStruct: string): string {
    // Handle multiple structs
    const structs = anchorStruct.split(/pub struct/g).slice(1);
    let convertedStructs = structs.map((struct) => {
        // Extract the struct name
        const structNameMatch = struct.match(/(\w+)/);
        const structName = structNameMatch ? structNameMatch[1] : 'Unknown';

        // Extract the fields
        const fieldsMatch = struct.match(/{([^}]*)}/);
        if (!fieldsMatch || !fieldsMatch[1]) {
            return ''; // Skip invalid or empty structs
        }

        const fields = fieldsMatch[1].trim().split('\n');

        // Process each field
        const convertedFields = fields.map((field) => {
            if (typeof field !== 'string') return ''; // Ensure field is a string before processing

            // Remove attributes, the `pub` keyword, and other Rust-specific syntax
            field = field.replace(/#\[[^\]]*\]/g, '').replace('pub ', '').trim();
            if (!field) return ''; // Skip empty lines

            // Convert Rust field to TypeScript
            let [fieldDef, fieldType] = (field.includes(':') ? field.split(':') : ['', '']).map((s) => s.trim());

            if (!fieldDef || !fieldType) return ''; // Skip fields with missing definitions

            // Convert snake_case to camelCase
            fieldDef = toCamelCase(fieldDef);

            // Special case: Convert Rust array patterns like `[u64; 28]` to `Uint8Array` with comments
            const arrayMatch = fieldType.match(/\[(u8|u64); (\d+)\]/);
            if (arrayMatch) {
                fieldType = 'Uint8Array';
                fieldType += `; // [${arrayMatch[1]}; ${arrayMatch[2]}] in Rust`;
            } else {
                // Convert other Rust types to TypeScript
                fieldType = fieldType
                    .replace('Pubkey', 'PublicKey')
                    .replace('u8', 'number')
                    .replace('i8', 'number') // Convert i8 to number
                    .replace('u64', 'anchor.BN')
                    .replace('u128', 'anchor.BN')
                    .replace('i64', 'anchor.BN')
                    .replace('bool', 'boolean');
            }

            return `${fieldDef}: ${fieldType}`; // Ensure no trailing comma
        });

        // Return the converted struct without any incorrect `,;` sequences
        return `export interface ${structName} {\n  ${convertedFields.filter(Boolean).join(';\n  ')};\n}`.replace(/,;/g, ';');
    });

    return convertedStructs.join('\n\n');
}
