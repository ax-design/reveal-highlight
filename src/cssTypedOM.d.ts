interface Window {
  CSS: CSS
}

interface HTMLElement {
  computedStyleMap(): StylePropertyMap
}

interface CSS {
  px(value: number): CSSUnitValue;
  registerProperty(rule: CSSPropertyRule): void
}

interface CSSPropertyRule {
  name: string;
  syntax: string;
  initialValue: string | number | CSSUnitValue;
  inherits: boolean
}

interface CSSUnitValue {
  unit: string;
  value: number
}

interface CSSBooleanValue {
  value: boolean
}

interface CSSColorValue {
  red: number;
  green: number;
  blue: number;
  alpha: number;
  value: string
}

interface CSSKeywordValue {
  value: string
}

interface HTMLElement {
  attributeStyleMap: StylePropertyMap;
}

interface StylePropertyMap {
  get(stylePropertyName: string): CSSUnitValue | CSSKeywordValue;
  set(stylePropertyName: string, value: CSSUnitValue | string): void,
}

