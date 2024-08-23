import type { NextApiRequest, NextApiResponse } from 'next';

// Convert snake_case to camelCase
function toCamelCase(text: string): string {
    return text.replace(/_([a-z])/g, (g) => g[1].toUpperCase());
}

// Simple conversion logic with support for multiple structs and handling Uint8Array padding fields
function convertAnchorToTypeScript(anchorStruct: string): string {
    // Handle multiple structs
    const structs = anchorStruct.split(/pub struct/g).slice(1);
    let convertedStructs = structs.map((struct) => {
        // Extract the struct name
        const structNameMatch = struct.match(/(\w+)/);
        const structName = structNameMatch ? structNameMatch[1] : 'Unknown';

        // Extract the fields
        const fieldsMatch = struct.match(/{([^}]*)}/);
        const fields = fieldsMatch ? fieldsMatch[1].trim().split('\n') : [];

        // Process each field
        const convertedFields = fields.map((field) => {
            // Remove attributes and other Rust-specific syntax
            field = field.replace(/#\[[^\]]*\]/g, '').trim();
            if (!field) return ''; // Skip empty lines

            // Convert Rust field to TypeScript
            let [fieldDef, fieldType] = field.replace(/,/g, '').replace(/pub /, '').split(':').map((s) => s.trim());

            // Convert snake_case to camelCase
            fieldDef = toCamelCase(fieldDef);

            // Special case: Convert Rust array patterns like `[u64; 28]` or `[u8; 5]` to `Uint8Array`
            const arrayMatch = fieldType.match(/\[(u8|u64); (\d+)\]/);
            if (arrayMatch) {
                const rustType = arrayMatch[1];
                const arraySize = arrayMatch[2];
                fieldType = 'Uint8Array'; // Convert to Uint8Array for these padding fields
                if (rustType === 'u64') {
                    fieldType += `; // [u64; ${arraySize}] in Rust`;
                } else if (rustType === 'u8') {
                    fieldType += `; // [u8; ${arraySize}] in Rust`;
                }
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

            // Add inline Rust type comments where appropriate
            if (fieldType.includes('number')) {
                if (field.includes('i8')) fieldType += '; // i8 in Rust';
                else if (field.includes('u8')) fieldType += '; // u8 in Rust';
            } else if (fieldType.includes('anchor.BN')) {
                if (field.includes('u64')) fieldType += '; // u64 in Rust';
                else if (field.includes('u128')) fieldType += '; // u128 in Rust';
                else if (field.includes('i64')) fieldType += '; // i64 in Rust';
            }

            return `${fieldDef}: ${fieldType};`;
        });

        // Return the converted struct
        return `export interface ${structName} {\n  ${convertedFields.filter(Boolean).join('\n  ')}\n}`;
    });

    return convertedStructs.join('\n\n');
}

export default function handler(req: NextApiRequest, res: NextApiResponse) {
    const { anchorStruct } = req.body;
    const typescriptStruct = convertAnchorToTypeScript(anchorStruct);
    res.status(200).json({ typescriptStruct });
}
