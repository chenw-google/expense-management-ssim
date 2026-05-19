import { useState } from 'react';

interface Props {
  apiKey: string;
  onApiKeyChange: (key: string) => void;
}

export default function ApiKeySetup({ apiKey, onApiKeyChange }: Props) {
  const [visible, setVisible] = useState(false);
  const [inputVal, setInputVal] = useState(apiKey);

  const handleSave = () => {
    onApiKeyChange(inputVal.trim());
  };

  return (
    <div className={`mb-6 rounded-xl border px-4 py-3 flex items-center gap-4 ${
      apiKey ? 'bg-green-50 border-green-200' : 'bg-amber-50 border-amber-200'
    }`}>
      <div className="text-2xl">{apiKey ? '🔑' : '⚠️'}</div>
      <div className="flex-1">
        <p className="text-sm font-medium text-slate-800">
          {apiKey ? 'Gemini API key configured' : 'Gemini API key required for AI features'}
        </p>
        <p className="text-xs text-slate-500 mt-0.5">
          Used for transaction categorization and receipt parsing. Never stored externally.
        </p>
      </div>
      <div className="flex items-center gap-2">
        <input
          type={visible ? 'text' : 'password'}
          value={inputVal}
          onChange={(e) => setInputVal(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && handleSave()}
          placeholder="AIza..."
          className="text-sm border border-slate-300 rounded-lg px-3 py-1.5 w-64 focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
        <button
          onClick={() => setVisible((v) => !v)}
          className="text-xs text-slate-500 hover:text-slate-800 px-2"
          title={visible ? 'Hide' : 'Show'}
        >
          {visible ? '🙈' : '👁️'}
        </button>
        <button
          onClick={handleSave}
          className="bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium px-3 py-1.5 rounded-lg transition"
        >
          Save
        </button>
      </div>
    </div>
  );
}
