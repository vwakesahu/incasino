import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import React from "react";

interface SlotInputFormProps {
  value?: string | number;
  label?: string;
  id?: string;
  placeholder?: string;
  onChange?: (e: React.ChangeEvent<HTMLInputElement>) => void;
  type?: string;
  className?: string;
  disabled?: boolean;
}

const SlotInputForm = ({
  value,
  label,
  id,
  placeholder,
  onChange,
  type,
  className,
  disabled,
}: SlotInputFormProps) => {
  return (
    <div className="grid w-full place-items-start max-w-sm items-center gap-1.5">
      <Label htmlFor={id}>{label}</Label>
      <Input
        type={type}
        id={id}
        placeholder={placeholder}
        onChange={onChange}
        className={className}
        value={value}
        disabled={disabled}
      />
    </div>
  );
};

export default SlotInputForm;
