interface ComputedStyleStorage {
    size(): number;
    get(propertyName: string): string;
    getNumber(propertyName: string): number;
}

class ComputedStyleCompat implements ComputedStyleStorage {
    el: HTMLElement;
    style: CSSStyleDeclaration;

    constructor(el: HTMLElement) {
        this.el = el;
        this.style = window.getComputedStyle(el);
    }

    size() {
        return this.style.length;
    }

    get(propertyName: string) {
        return this.style.getPropertyValue(propertyName).trim();
    }

    getNumber(propertyName: string) {
        // Length values in computed style will always in the unit of px
        // Maybe NaN
        return parseFloat(this.get(propertyName));
    }
}

class ComputedStyleExperimental implements ComputedStyleStorage {
    el: HTMLElement;
    style: StylePropertyMap;

    constructor(el: HTMLElement) {
        this.el = el;
        this.style = el.computedStyleMap();
    }

    size() {
        return this.style.size;
    }

    get(propertyName: string) {
        return this.style.get(propertyName).toString();
    }

    getNumber(propertyName: string) {
        const value = this.style.get(propertyName).value;
        if (typeof value === 'number') {
            // Length values in computed style will always in the unit of px
            return value;
        }

        // Maybe NaN
        return parseFloat(value as string);
    }
}

export function createStorage(el: HTMLElement, compat: boolean) {
    return compat
        ? new ComputedStyleCompat(el)
        : new ComputedStyleExperimental(el);
}
