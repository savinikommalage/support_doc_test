import type {
  ButtonHTMLAttributes,
  InputHTMLAttributes,
  ReactNode,
} from "react";

// call sites pass `leadingIcon && ...` which can narrow to 0 or an empty string
export function cn(...classes: unknown[]) {
  return classes.filter((c): c is string => typeof c === "string" && c !== "").join(" ");
}

export type ButtonVariant = "primary" | "neutral" | "subtle" | "danger";
export type ButtonSize = "lg" | "md" | "sm";

const buttonVariants: Record<ButtonVariant, string> = {
  primary:
    "bg-surface-brand border border-line-cta text-text-on-brand hover:bg-surface-brand-hover",
  neutral:
    "bg-surface-bg border border-line-structure text-text-primary hover:bg-surface-hover",
  subtle: "bg-transparent text-text-secondary hover:bg-surface-neutral-soft",
  danger:
    "bg-surface-danger-soft border border-line-structure text-text-danger hover:opacity-90",
};

const buttonSizes: Record<ButtonSize, string> = {
  lg: "h-12 px-3 gap-1 rounded-2xl text-body font-semibold [&_svg]:size-5",
  md: "h-9 px-2 gap-0.5 rounded-lg text-body-sm font-semibold [&_svg]:size-5",
  sm: "h-6 px-1.5 pt-0.5 gap-0 rounded-full text-body-tiny font-semibold [&_svg]:size-4",
};

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  leadingIcon?: ReactNode;
  trailingIcon?: ReactNode;
}

export function buttonStyles(variant: ButtonVariant = "primary", size: ButtonSize = "md") {
  return cn(
    "inline-flex items-center justify-center whitespace-nowrap transition-colors",
    "focus-visible:ring-line-cta focus-visible:ring-2 focus-visible:ring-offset-1 focus-visible:outline-none",
    "disabled:cursor-not-allowed disabled:opacity-60",
    buttonVariants[variant],
    buttonSizes[size],
  );
}

export function Button({
  variant = "primary",
  size = "md",
  leadingIcon,
  trailingIcon,
  children,
  className,
  ...props
}: ButtonProps) {
  return (
    <button
      className={cn(buttonStyles(variant, size), className)}
      {...props}
    >
      {leadingIcon}
      {children}
      {trailingIcon}
    </button>
  );
}

export type IconButtonVariant = "primary" | "neutral" | "subtle";

const iconButtonVariants: Record<IconButtonVariant, string> = {
  primary:
    "bg-surface-brand border border-line-cta text-text-on-brand hover:bg-surface-brand-hover",
  neutral:
    "bg-surface-1 border border-line-structure text-text-primary hover:bg-surface-2",
  subtle: "bg-transparent text-text-secondary hover:bg-surface-neutral-soft",
};

const iconButtonSizes: Record<ButtonSize, string> = {
  lg: "size-12 rounded-2xl [&_svg]:size-5",
  md: "size-9 rounded-lg [&_svg]:size-5",
  sm: "size-6 rounded-full [&_svg]:size-4",
};

export interface IconButtonProps
  extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: IconButtonVariant;
  size?: ButtonSize;
  "aria-label": string;
  icon: ReactNode;
}

export function IconButton({
  variant = "primary",
  size = "md",
  icon,
  className,
  ...props
}: IconButtonProps) {
  return (
    <button
      className={cn(
        "inline-flex shrink-0 items-center justify-center transition-colors",
        "focus-visible:ring-line-cta focus-visible:ring-2 focus-visible:ring-offset-1 focus-visible:outline-none",
        "disabled:cursor-not-allowed",
        iconButtonVariants[variant],
        iconButtonSizes[size],
        className,
      )}
      {...props}
    >
      {icon}
    </button>
  );
}

export interface InputProps
  extends Omit<InputHTMLAttributes<HTMLInputElement>, "size"> {
  size?: ButtonSize;
  leadingIcon?: ReactNode;
  trailingAction?: ReactNode;
}

const inputSizes: Record<ButtonSize, string> = {
  lg: "h-12 px-4 py-3.5 text-body",
  md: "h-9 px-3 py-2.5 text-body-sm",
  sm: "h-6 px-2 py-[5px] text-body-tiny",
};

const inputLeadingPad: Record<ButtonSize, string> = {
  lg: "pl-10",
  md: "pl-8",
  sm: "pl-6",
};

const inputIconSlot: Record<ButtonSize, { l: string; r: string; s: string }> = {
  lg: { l: "left-4", r: "right-4", s: "size-5" },
  md: { l: "left-3", r: "right-3", s: "size-4" },
  sm: { l: "left-2", r: "right-2", s: "size-3" },
};

export function Input({
  size = "md",
  leadingIcon,
  trailingAction,
  className,
  ...props
}: InputProps) {
  const slot = inputIconSlot[size];
  return (
    <div className={cn("relative flex items-center", className)}>
      {leadingIcon && (
        <span
          className={cn(
            "text-text-tertiary pointer-events-none absolute flex items-center justify-center",
            slot.l,
            slot.s,
          )}
        >
          {leadingIcon}
        </span>
      )}
      <input
        className={cn(
          "w-full rounded-lg border transition-colors outline-none",
          "bg-surface-bg text-text-primary placeholder:text-text-tertiary",
          "border-line-structure focus:border-line-brand-soft focus:ring-line-brand-soft focus:ring-1",
          inputSizes[size],
          leadingIcon && inputLeadingPad[size],
          trailingAction && "pr-9",
        )}
        {...props}
      />
      {trailingAction && (
        <span
          className={cn(
            "text-text-tertiary absolute flex items-center justify-center",
            slot.r,
          )}
        >
          {trailingAction}
        </span>
      )}
    </div>
  );
}

export type TagPillTone = "default" | "brand" | "danger";

const tagPillTones: Record<TagPillTone, string> = {
  default: "bg-surface-1 text-text-secondary",
  brand: "bg-surface-brand-soft text-text-brand",
  danger: "bg-surface-danger-soft text-text-danger",
};

export function TagPill({
  label,
  tone = "default",
  className,
}: {
  label: string;
  tone?: TagPillTone;
  className?: string;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full px-2 py-0.5 text-body-xs font-medium",
        tagPillTones[tone],
        className,
      )}
    >
      {label}
    </span>
  );
}

export function Card({
  children,
  className,
  interactive = false,
}: {
  children: ReactNode;
  className?: string;
  interactive?: boolean;
}) {
  return (
    <div
      className={cn(
        "border-line-structure bg-surface-bg rounded-xl border p-4",
        interactive && "hover:border-line-brand-soft transition-colors",
        className,
      )}
    >
      {children}
    </div>
  );
}

export function EyebrowLabel({ children }: { children: ReactNode }) {
  return (
    <p className="text-text-secondary text-body-tiny font-medium tracking-[0.66px] uppercase">
      {children}
    </p>
  );
}

export function SectionHeading({
  id,
  title,
  description,
}: {
  id?: string;
  title: string;
  description?: ReactNode;
}) {
  return (
    <div className="mb-4">
      <h2
        id={id}
        className="border-line-structure text-text-primary scroll-mt-32 border-b pb-3 text-heading font-semibold"
      >
        {title}
      </h2>
      {description && (
        <p className="text-text-secondary mt-2 max-w-2xl text-body-sm">
          {description}
        </p>
      )}
    </div>
  );
}

export function PageHeading({
  title,
  subtitle,
  action,
}: {
  title: string;
  subtitle?: ReactNode;
  action?: ReactNode;
}) {
  return (
    <div className="mb-6 flex items-start justify-between gap-4">
      <div className="min-w-0">
        <h1 className="text-text-primary text-heading font-semibold tracking-tight">{title}</h1>
        {subtitle && (
          <p className="text-text-secondary mt-1 max-w-2xl text-body-sm leading-relaxed">
            {subtitle}
          </p>
        )}
      </div>
      {action && <div className="flex shrink-0 items-center gap-2">{action}</div>}
    </div>
  );
}

export function EmptyState({
  title,
  description,
  action,
}: {
  title: string;
  description?: string;
  action?: ReactNode;
}) {
  return (
    <div className="border-line-structure flex flex-col items-center gap-2 rounded-xl border border-dashed py-12 text-center">
      <p className="text-text-primary text-body-sm font-medium">{title}</p>
      {description && (
        <p className="text-text-tertiary text-body-sm">{description}</p>
      )}
      {action}
    </div>
  );
}
