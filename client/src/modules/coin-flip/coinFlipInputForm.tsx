import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import React from "react";

interface CoinFlipFormProps {
  value?: string | number;
  label?: string;
  id?: string;
  placeholder?: string;
  onChange?: (e: React.ChangeEvent<HTMLInputElement>) => void;
  type?: string;
  className?: string;
  disabled?: boolean;
  isNegativeAllowed?: boolean;
}

const CoinFlipForm = ({
  value,
  label,
  id,
  placeholder,
  onChange,
  type,
  className,
  disabled,
  isNegativeAllowed = false,
}: CoinFlipFormProps) => {
  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.value;
    if (isNegativeAllowed || Number(newValue) >= 0 || newValue === "") {
      onChange?.(e);
    }
  };

  return (
    <div className="grid w-full place-items-start max-w-sm items-center gap-1.5">
      <Label htmlFor={id}>{label}</Label>
      <Input
        type={type}
        id={id}
        placeholder={placeholder}
        onChange={handleChange}
        className={className}
        value={value}
        disabled={disabled}
      />
    </div>
  );
};

export default CoinFlipForm;
