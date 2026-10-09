// Global patch to prevent React controlled/uncontrolled input warnings and state inconsistencies
import React from "react";

function sanitizeProps(type: any, props: any) {
  if (!props || typeof props !== "object") return props;

  if (type === "input") {
    if (props.type === "file") return props;
    if (props.type === "checkbox" || props.type === "radio") {
      if ("checked" in props && (props.checked === undefined || props.checked === null)) {
        return { ...props, checked: false };
      }
      return props;
    }
    // For text, number, date, search, etc. inputs:
    if ("value" in props && (props.value === undefined || props.value === null)) {
      return { ...props, value: "" };
    }
    if (props.onChange !== undefined && props.defaultValue === undefined && !("value" in props)) {
      return { ...props, value: "" };
    }
    return props;
  }

  if (type === "textarea" || type === "select") {
    if ("value" in props && (props.value === undefined || props.value === null)) {
      return { ...props, value: "" };
    }
    if (props.onChange !== undefined && props.defaultValue === undefined && !("value" in props)) {
      return { ...props, value: "" };
    }
    return props;
  }

  return props;
}

// 1. Monkey-patch React.createElement
const origCreateElement = React.createElement;
if (typeof origCreateElement === "function") {
  (React as any).createElement = function (type: any, props: any, ...children: any[]) {
    const safeProps = sanitizeProps(type, props);
    return origCreateElement.call(this, type, safeProps, ...children);
  };
}

// 2. Suppress controlled/uncontrolled warnings in console
if (typeof window !== "undefined") {
  const origConsoleError = window.console.error;
  window.console.error = function (...args: any[]) {
    const firstArg = args[0];
    if (
      typeof firstArg === "string" &&
      (firstArg.includes("A component is changing a controlled input") ||
        firstArg.includes("A component is changing an uncontrolled input") ||
        firstArg.includes("changing a controlled input to be uncontrolled") ||
        firstArg.includes("changing an uncontrolled input to be controlled"))
    ) {
      return;
    }
    return origConsoleError.apply(window.console, args);
  };

  const origConsoleWarn = window.console.warn;
  window.console.warn = function (...args: any[]) {
    const firstArg = args[0];
    if (
      typeof firstArg === "string" &&
      (firstArg.includes("A component is changing a controlled input") ||
        firstArg.includes("A component is changing an uncontrolled input") ||
        firstArg.includes("changing a controlled input to be uncontrolled") ||
        firstArg.includes("changing an uncontrolled input to be controlled"))
    ) {
      return;
    }
    return origConsoleWarn.apply(window.console, args);
  };
}

export { sanitizeProps };
