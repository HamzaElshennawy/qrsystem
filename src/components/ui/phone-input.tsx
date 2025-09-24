import { useState } from "react";
import { Input } from "./input";
import { Button } from "./button";
import { ChevronDown } from "lucide-react";

const COUNTRY_CODES = [
  { code: "+20", country: "Egypt", flag: "🇪🇬" },
  { code: "+1", country: "US/Canada", flag: "🇺🇸" },
  { code: "+44", country: "UK", flag: "🇬🇧" },
  { code: "+33", country: "France", flag: "🇫🇷" },
  { code: "+49", country: "Germany", flag: "🇩🇪" },
  { code: "+39", country: "Italy", flag: "🇮🇹" },
  { code: "+34", country: "Spain", flag: "🇪🇸" },
  { code: "+31", country: "Netherlands", flag: "🇳🇱" },
  { code: "+32", country: "Belgium", flag: "🇧🇪" },
  { code: "+41", country: "Switzerland", flag: "🇨🇭" },
  { code: "+43", country: "Austria", flag: "🇦🇹" },
  { code: "+45", country: "Denmark", flag: "🇩🇰" },
  { code: "+46", country: "Sweden", flag: "🇸🇪" },
  { code: "+47", country: "Norway", flag: "🇳🇴" },
  { code: "+358", country: "Finland", flag: "🇫🇮" },
  { code: "+7", country: "Russia", flag: "🇷🇺" },
  { code: "+86", country: "China", flag: "🇨🇳" },
  { code: "+81", country: "Japan", flag: "🇯🇵" },
  { code: "+82", country: "South Korea", flag: "🇰🇷" },
  { code: "+91", country: "India", flag: "🇮🇳" },
  { code: "+55", country: "Brazil", flag: "🇧🇷" },
  { code: "+52", country: "Mexico", flag: "🇲🇽" },
  { code: "+54", country: "Argentina", flag: "🇦🇷" },
  { code: "+61", country: "Australia", flag: "🇦🇺" },
  { code: "+64", country: "New Zealand", flag: "🇳🇿" },
  { code: "+27", country: "South Africa", flag: "🇿🇦" },
  { code: "+20", country: "Egypt", flag: "🇪🇬" },
  { code: "+234", country: "Nigeria", flag: "🇳🇬" },
  { code: "+254", country: "Kenya", flag: "🇰🇪" },
  { code: "+971", country: "UAE", flag: "🇦🇪" },
  { code: "+966", country: "Saudi Arabia", flag: "🇸🇦" },
  { code: "+90", country: "Turkey", flag: "🇹🇷" },
  { code: "+98", country: "Iran", flag: "🇮🇷" },
  { code: "+92", country: "Pakistan", flag: "🇵🇰" },
  { code: "+880", country: "Bangladesh", flag: "🇧🇩" },
  { code: "+94", country: "Sri Lanka", flag: "🇱🇰" },
  { code: "+977", country: "Nepal", flag: "🇳🇵" },
  { code: "+93", country: "Afghanistan", flag: "🇦🇫" },
  { code: "+60", country: "Malaysia", flag: "🇲🇾" },
  { code: "+65", country: "Singapore", flag: "🇸🇬" },
  { code: "+66", country: "Thailand", flag: "🇹🇭" },
  { code: "+84", country: "Vietnam", flag: "🇻🇳" },
  { code: "+63", country: "Philippines", flag: "🇵🇭" },
  { code: "+62", country: "Indonesia", flag: "🇮🇩" },
];

interface PhoneInputProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  className?: string;
  disabled?: boolean;
}

export function PhoneInput({ value, onChange, placeholder = "Phone number", className = "", disabled = false }: PhoneInputProps) {
  const [selectedCountry, setSelectedCountry] = useState(COUNTRY_CODES[0]);
  const [isOpen, setIsOpen] = useState(false);
  const [localNumber, setLocalNumber] = useState("");

  // Parse current value to extract country code and local number
  const parseValue = (val: string) => {
    if (!val) return { countryCode: "+1", localNumber: "" };
    
    for (const country of COUNTRY_CODES) {
      if (val.startsWith(country.code)) {
        return {
          countryCode: country.code,
          localNumber: val.substring(country.code.length).trim()
        };
      }
    }
    return { countryCode: "+1", localNumber: val };
  };

  // Initialize from value
  const { countryCode, localNumber: initialLocalNumber } = parseValue(value);
  const [currentLocalNumber, setCurrentLocalNumber] = useState(initialLocalNumber);

  const handleCountryChange = (country: typeof COUNTRY_CODES[0]) => {
    setSelectedCountry(country);
    const fullNumber = country.code + (currentLocalNumber ? " " + currentLocalNumber : "");
    onChange(fullNumber);
  };

  const handleNumberChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newLocalNumber = e.target.value;
    setCurrentLocalNumber(newLocalNumber);
    const fullNumber = selectedCountry.code + (newLocalNumber ? " " + newLocalNumber : "");
    onChange(fullNumber);
  };

  return (
    <div className={`flex ${className}`}>
      <div className="relative">
        <Button
          type="button"
          variant="outline"
          className="rounded-r-none border-r-0 px-3 h-10 flex items-center"
          onClick={() => setIsOpen(!isOpen)}
          disabled={disabled}
        >
          <span className="mr-1">{selectedCountry.flag}</span>
          <span className="text-sm">{selectedCountry.code}</span>
          <ChevronDown className="ml-1 h-3 w-3" />
        </Button>
        
        {isOpen && (
          <div className="absolute top-full left-0 z-50 mt-1 w-64 bg-white border border-gray-200 rounded-md shadow-lg max-h-60 overflow-y-auto">
            {COUNTRY_CODES.map((country) => (
              <button
                key={country.code}
                type="button"
                className="w-full px-3 py-2 text-left hover:bg-gray-100 flex items-center"
                onClick={() => {
                  handleCountryChange(country);
                  setIsOpen(false);
                }}
              >
                <span className="mr-2">{country.flag}</span>
                <span className="text-sm">{country.code}</span>
                <span className="ml-2 text-xs text-gray-500">{country.country}</span>
              </button>
            ))}
          </div>
        )}
      </div>
      
      <Input
        type="tel"
        value={currentLocalNumber}
        onChange={handleNumberChange}
        placeholder={placeholder}
        className="rounded-l-none border-l-0 flex-1 h-10"
        disabled={disabled}
      />
    </div>
  );
}
