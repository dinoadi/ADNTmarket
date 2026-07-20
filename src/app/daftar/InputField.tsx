"use client";

import React from "react";

export function InputField({
  label,
  icon: Icon,
  ...props
}: {
  label: string;
  icon?: React.ElementType;
  type?: string;
  required?: boolean;
  placeholder?: string;
  value: string;
  minLength?: number;
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
}) {
  return (
    <div>
      <label className="label">{label}</label>
      <div className="relative">
        {Icon && (
          <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3.5 text-surface-400 dark:text-surface-500">
            <Icon className="h-4 w-4" />
          </div>
        )}
        <input
          className={`input ${Icon ? "pl-10" : ""}`}
          {...props}
        />
      </div>
    </div>
  );
}
