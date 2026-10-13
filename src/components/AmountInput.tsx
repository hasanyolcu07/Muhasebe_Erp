import { forwardRef, useEffect, useRef, useState, type ChangeEvent, type FocusEvent, type InputHTMLAttributes } from "react";
import { formatAmountTyping, formatTrAmount, parseTrAmount } from "@/lib/trAmount";

type Props = Omit<InputHTMLAttributes<HTMLInputElement>, "type" | "value" | "defaultValue" | "onChange"> & {
  value?: number | string | null;
  defaultValue?: number | string | null;
  onChange?: (event: ChangeEvent<HTMLInputElement>) => void;
  onValueChange?: (value: number) => void;
  decimals?: number;
};

function asAmount(value: number | string | null | undefined): number | null {
  if (value === "" || value === null || value === undefined) return null;
  if (typeof value === "number") return Number.isFinite(value) ? value : null;
  return parseTrAmount(value);
}

function canonical(amount: number, decimals: number): string {
  return amount.toFixed(decimals);
}

export const AmountInput = forwardRef<HTMLInputElement, Props>(function AmountInput(
  {
    value,
    defaultValue,
    onChange,
    onBlur,
    onValueChange,
    name,
    decimals = 2,
    className,
    style,
    disabled,
    readOnly,
    required,
    id,
    placeholder = "0,00",
    "aria-label": ariaLabel,
    onFocus,
  },
  ref,
) {
  const controlled = value !== undefined;
  const initial = asAmount(controlled ? value : defaultValue);
  const [text, setText] = useState(() => (initial === null ? "" : formatTrAmount(initial, decimals)));
  const focused = useRef(false);
  const hiddenRef = useRef<HTMLInputElement | null>(null);
  const visibleRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    if (!controlled || focused.current) return;
    const amount = asAmount(value);
    setText(amount === null ? "" : formatTrAmount(amount, decimals));
    const el = hiddenRef.current;
    const proto = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "value");
    if (el && proto?.set && amount !== null) proto.set.call(el, canonical(amount, decimals));
  }, [controlled, decimals, value]);

  useEffect(() => {
    const el = hiddenRef.current;
    if (!el) return;
    const proto = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "value");
    if (!proto?.get || !proto.set) return;
    Object.defineProperty(el, "value", {
      configurable: true,
      get() {
        return proto.get!.call(this);
      },
      set(next: string) {
        proto.set!.call(this, next);
        if (focused.current) return;
        if (next === "") {
          setText("");
          return;
        }
        const n = Number(String(next).replace(",", "."));
        if (Number.isFinite(n)) setText(formatTrAmount(n, decimals));
      },
    });
    return () => {
      delete (el as { value?: string }).value;
    };
  }, [decimals]);

  function writeHidden(amount: number) {
    const el = hiddenRef.current;
    const proto = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "value");
    if (el && proto?.set) proto.set.call(el, canonical(amount, decimals));
  }

  function emit(amount: number, type: "change" | "blur") {
    onValueChange?.(amount);
    writeHidden(amount);
    const hidden = hiddenRef.current;
    if (onChange && hidden) {
      onChange({ target: hidden, currentTarget: hidden, type } as ChangeEvent<HTMLInputElement>);
    }
  }

  function assignHidden(node: HTMLInputElement | null) {
    hiddenRef.current = node;
    if (typeof ref === "function") ref(node);
    else if (ref) ref.current = node;
  }

  const width = style?.width;
  return (
    <span className="amount-input-wrap" style={width ? { width } : undefined}>
      <input
        id={id}
        className={className}
        style={{ textAlign: "right", ...style, width: width ? "100%" : style?.width }}
        disabled={disabled}
        readOnly={readOnly}
        required={required}
        placeholder={placeholder}
        inputMode="decimal"
        autoComplete="off"
        aria-label={ariaLabel}
        ref={visibleRef}
        value={text}
        onFocus={(event) => {
          focused.current = true;
          const comma = event.target.value.indexOf(",");
          requestAnimationFrame(() => {
            const node = visibleRef.current;
            if (!node) return;
            const at = comma >= 0 ? comma : node.value.length;
            node.setSelectionRange(at, at);
          });
          onFocus?.(event);
        }}
        onBlur={(event) => {
          focused.current = false;
          const amount = text.trim() === "" ? 0 : parseTrAmount(text);
          setText(text.trim() === "" ? "" : formatTrAmount(amount, decimals));
          emit(amount, "blur");
          const hidden = hiddenRef.current;
          onBlur?.({
            ...event,
            target: hidden || event.target,
            currentTarget: hidden || event.currentTarget,
          } as FocusEvent<HTMLInputElement>);
        }}
        onChange={(event) => {
          const cursor = event.target.selectionStart ?? event.target.value.length;
          const next = formatAmountTyping(event.target.value, cursor, decimals);
          setText(next.text);
          emit(next.text.trim() === "" ? 0 : parseTrAmount(next.text), "change");
          requestAnimationFrame(() => {
            const node = visibleRef.current;
            if (node && document.activeElement === node) node.setSelectionRange(next.cursor, next.cursor);
          });
        }}
      />
      <input
        type="hidden"
        name={name}
        ref={assignHidden}
        defaultValue={initial === null ? "" : canonical(initial, decimals)}
      />
    </span>
  );
});
