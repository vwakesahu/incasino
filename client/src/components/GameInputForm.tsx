import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import React from "react";

interface GameInputFormProps {
  value?: string | number;
  label?: React.ReactNode;
  id?: string;
  placeholder?: string;
  onChange?: React.ChangeEventHandler<HTMLInputElement>;
  type?: string;
  className?: string;
  disabled?: boolean;
}

const GameInputForm = ({
  value,
  label,
  id,
  placeholder,
  onChange,
  type,
  className,
  disabled,
}: GameInputFormProps) => {
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

export default GameInputForm;
