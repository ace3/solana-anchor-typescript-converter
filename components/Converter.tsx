import { useState } from 'react';

export default function Converter() {
    const [anchorStruct, setAnchorStruct] = useState<string>('');
    const [typescriptStruct, setTypescriptStruct] = useState<string>('');

    const handleConvert = async () => {
        const response = await fetch('/api/convert', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ anchorStruct }),
        });
        const data = await response.json();
        setTypescriptStruct(data.typescriptStruct);
    };

    return (
        <div className="container mx-auto w-full p-4 bg-white  rounded-lg ">
            <div className="flex justify-between">
                <div className="w-1/2 mr-4">
                    <h3 className="text-lg font-semibold mb-2">Solana Anchor Struct</h3>
                    <textarea
                        className="w-full h-80 p-2 border rounded-lg"
                        value={anchorStruct}
                        onChange={(e) => setAnchorStruct(e.target.value)}
                        placeholder="Enter Solana Anchor struct here..."
                    />
                </div>
                <div className="w-1/2 ml-4">
                    <h3 className="text-lg font-semibold mb-2">TypeScript Implementation</h3>
                    <textarea
                        className="w-full h-80 p-2 border rounded-lg"
                        value={typescriptStruct}
                        readOnly
                        placeholder="Converted TypeScript struct will appear here..."
                    />
                </div>
            </div>
            <div className="text-center mt-4">
                <button
                    onClick={handleConvert}
                    className="px-4 py-2 bg-blue-600 text-white font-semibold rounded-lg hover:bg-blue-500 transition"
                >
                    Convert
                </button>
            </div>
        </div>
    );
}
