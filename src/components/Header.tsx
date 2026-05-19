const MODELS = [
  { id: 'gemini-2.5-flash', label: 'Gemini 2.5 Flash' },
  { id: 'gemini-2.5-pro', label: 'Gemini 2.5 Pro' },
  { id: 'gemini-2.5-flash-lite', label: 'Gemini 2.5 Flash Lite' },
  { id: 'gemini-3.5-flash', label: 'Gemini 3.5 Flash' },
  { id: 'gemini-3.1-pro-preview', label: 'Gemini 3.1 Pro' },
];

interface Props {
  selectedModel: string;
  onModelChange: (model: string) => void;
}

export { MODELS };

function StateStreetLogo() {
  return (
    <svg width="110" height="28" viewBox="0 0 110 28" fill="none" xmlns="http://www.w3.org/2000/svg" aria-label="State Street">
      {/* Blue bar accent */}
      <rect x="0" y="8" width="4" height="12" fill="#0047BB" />
      {/* STATE STREET wordmark */}
      <text x="10" y="20" fontFamily="Arial, sans-serif" fontSize="11" fontWeight="700" letterSpacing="1.2" fill="#0047BB">
        STATE STREET
      </text>
    </svg>
  );
}

export default function Header({ selectedModel, onModelChange }: Props) {
  return (
    <header className="bg-white border-b border-slate-200 shadow-sm">
      <div className="max-w-7xl mx-auto px-4 py-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 bg-blue-600 rounded-lg flex items-center justify-center text-white font-bold text-lg">
            E
          </div>
          <div>
            <h1 className="text-lg font-semibold text-slate-900">ExpenseIQ</h1>
            <p className="text-xs text-slate-500">State Street Expense Manager</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <label className="text-xs text-slate-500 font-medium">Model</label>
          <select
            value={selectedModel}
            onChange={(e) => onModelChange(e.target.value)}
            className="text-xs bg-blue-50 text-blue-700 border border-blue-200 rounded-full px-3 py-1 font-medium focus:outline-none focus:ring-2 focus:ring-blue-300 cursor-pointer"
          >
            {MODELS.map((m) => (
              <option key={m.id} value={m.id}>
                {m.label}
              </option>
            ))}
          </select>
          {/* State Street logo */}
          <StateStreetLogo />
        </div>
      </div>
    </header>
  );
}
